import { and, eq, isNull, sql } from "drizzle-orm";
import { verifyPasswordOrDummy } from "@/lib/auth/password";
import { createOpaqueToken, hashToken } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { forcedResetAuthorizations, sessions, users } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { canonicalizeEmail } from "@/lib/validation/credentials";

type AuthenticateInput = {
  email: string;
  password: string;
  rememberMe: boolean;
  source: string;
  hashKey: string;
  maxAttempts: number;
  lockoutMinutes: number;
  now?: Date;
};

export async function authenticateUser(database: Database, input: AuthenticateInput) {
  const now = input.now ?? new Date();
  const sourceLimit = await checkRateLimit(database, {
    scope: "login_source",
    key: input.source,
    hashKey: input.hashKey,
    now,
  });
  if (!sourceLimit.allowed) return { status: "rate-limited" as const, retryAt: sourceLimit.retryAt };
  const email = canonicalizeEmail(input.email);
  if (!email.ok) {
    await verifyPasswordOrDummy(input.password, null);
    return { status: "invalid-credentials" as const };
  }

  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`login:${email.value}`}, 0))`,
    );
    const [user] = await transaction.select().from(users).where(eq(users.email, email.value)).limit(1);
    if (!user) {
      await verifyPasswordOrDummy(input.password, null);
      return { status: "invalid-credentials" as const };
    }
    if (user.status === "suspended") return { status: "suspended" as const };
    if (user.lockedUntil && now < user.lockedUntil) {
      return { status: "locked" as const, retryAt: user.lockedUntil };
    }

    if (user.lockedUntil && now >= user.lockedUntil) {
      await transaction
        .update(users)
        .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: now })
        .where(eq(users.id, user.id));
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const validPassword = await verifyPasswordOrDummy(input.password, user.passwordHash);
    if (!validPassword) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        failedLoginAttempts >= input.maxAttempts
          ? new Date(now.getTime() + input.lockoutMinutes * 60 * 1000)
          : null;
      await transaction
        .update(users)
        .set({ failedLoginAttempts, lockedUntil, updatedAt: now })
        .where(eq(users.id, user.id));
      return lockedUntil
        ? { status: "locked" as const, retryAt: lockedUntil }
        : { status: "invalid-credentials" as const };
    }

    await transaction
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: now })
      .where(eq(users.id, user.id));
    const token = createOpaqueToken();
    if (user.forcePasswordReset) {
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt)));
      await transaction
        .update(forcedResetAuthorizations)
        .set({ revokedAt: now })
        .where(
          and(eq(forcedResetAuthorizations.userId, user.id), isNull(forcedResetAuthorizations.revokedAt)),
        );
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      await transaction.insert(forcedResetAuthorizations).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        createdAt: now,
      });
      return { status: "forced-reset" as const, token, expiresAt };
    }

    const expiresAt = new Date(now.getTime() + (input.rememberMe ? 21 * 24 : 2) * 60 * 60 * 1000);
    await transaction.insert(sessions).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
    });
    return { status: "authenticated" as const, token, expiresAt };
  });
}