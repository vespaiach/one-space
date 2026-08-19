import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { Options } from "nodemailer/lib/mailer";
import {
  createEncryptedCredential,
  createOpaqueToken,
  decryptCredential,
  hashToken,
} from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import {
  auditEvents,
  forcedResetAuthorizations,
  passwordResetTokens,
  sessions,
  users,
} from "@/lib/db/schema";
import { createPasswordResetMessage } from "@/lib/email/messages";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { canonicalizeEmail } from "@/lib/validation/credentials";

type ResetRequestInput = {
  email: string;
  source: string;
  hashKey: string;
  tokenKey: Buffer;
  appOrigin: string;
  now?: Date;
  send: (message: Options) => Promise<{ status: "accepted" | "rejected" | "failed" }>;
};

export async function requestPasswordResetForEmail(database: Database, input: ResetRequestInput) {
  const now = input.now ?? new Date();
  const email = canonicalizeEmail(input.email);
  const recipientKey = email.ok ? email.value : input.email.trim().toLowerCase();
  const [recipientLimit, sourceLimit] = await Promise.all([
    checkRateLimit(database, { scope: "reset_recipient", key: recipientKey, hashKey: input.hashKey, now }),
    checkRateLimit(database, { scope: "reset_source", key: input.source, hashKey: input.hashKey, now }),
  ]);
  if (!email.ok || !recipientLimit.allowed || !sourceLimit.allowed) return { status: "accepted" as const };
  const [user] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.value))
    .limit(1);
  if (!user) return { status: "accepted" as const };

  const issued = await database.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`reset:${user.id}`}, 0))`);
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
    const nonce = createOpaqueToken();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const [row] = await transaction
      .insert(passwordResetTokens)
      .values({ userId: user.id, tokenHash: hashToken(nonce), expiresAt, createdAt: now })
      .returning({ id: passwordResetTokens.id });
    if (!row) throw new Error("Password reset issuance failed");
    const token = createEncryptedCredential(
      { purpose: "password-reset", email: email.value, nonce, issuedAt: now, expiresAt },
      input.tokenKey,
    );
    return { rowId: row.id, token };
  });

  const url = new URL("/auth/password-reset", input.appOrigin);
  url.searchParams.set("token", issued.token);
  const delivery = await input.send(createPasswordResetMessage(email.value, url.toString()));
  if (delivery.status === "accepted") {
    await database.insert(auditEvents).values({
      category: "operations",
      action: "email.password_reset",
      outcome: "succeeded",
      targetId: user.id,
      occurredAt: now,
    });
  } else {
    await database
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, issued.rowId));
    await database.insert(auditEvents).values({
      category: "operations",
      action: "email.password_reset",
      outcome: "degraded",
      targetId: user.id,
      reasonCode: "delivery_failed",
      occurredAt: now,
    });
  }
  return { status: "accepted" as const };
}

export async function validatePasswordResetIntake(
  database: Database,
  token: string,
  tokenKey: Buffer,
  now: Date = new Date(),
) {
  try {
    const payload = decryptCredential(token, "password-reset", tokenKey, now);
    if (!payload.nonce) return { status: "invalid" as const };
    const [row] = await database
      .select({ id: passwordResetTokens.id, expiresAt: passwordResetTokens.expiresAt })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(payload.nonce)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);
    return row ? { status: "valid" as const, expiresAt: row.expiresAt } : { status: "invalid" as const };
  } catch {
    return { status: "invalid" as const };
  }
}

export async function completePasswordResetWithCredential(
  database: Database,
  token: string,
  tokenKey: Buffer,
  passwordHash: string,
  now: Date = new Date(),
) {
  let nonce: string;
  try {
    const payload = decryptCredential(token, "password-reset", tokenKey, now);
    if (!payload.nonce) return { status: "invalid" as const };
    nonce = payload.nonce;
  } catch {
    return { status: "invalid" as const };
  }
  return database.transaction(async (transaction) => {
    const tokenHash = hashToken(nonce);
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`reset-token:${tokenHash}`}, 0))`,
    );
    const [row] = await transaction
      .select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .limit(1);
    if (!row) return { status: "invalid" as const };
    await transaction.update(users).set({ passwordHash, updatedAt: now }).where(eq(users.id, row.userId));
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, row.id));
    await transaction
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, row.userId), isNull(sessions.revokedAt)));
    await transaction
      .update(forcedResetAuthorizations)
      .set({ revokedAt: now })
      .where(
        and(eq(forcedResetAuthorizations.userId, row.userId), isNull(forcedResetAuthorizations.revokedAt)),
      );
    await transaction.insert(auditEvents).values({
      category: "security",
      action: "password.self_reset",
      outcome: "succeeded",
      targetId: row.userId,
      occurredAt: now,
    });
    return { status: "changed" as const };
  });
}