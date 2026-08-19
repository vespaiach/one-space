import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { hashToken } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { auditEvents, forcedResetAuthorizations, sessions, users } from "@/lib/db/schema";

export async function completeForcedReset(
  database: Database,
  token: string,
  passwordHash: string,
  now: Date = new Date(),
) {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`forced:${hashToken(token)}`}, 0))`,
    );
    const [authorization] = await transaction
      .select({ id: forcedResetAuthorizations.id, userId: users.id })
      .from(forcedResetAuthorizations)
      .innerJoin(users, eq(forcedResetAuthorizations.userId, users.id))
      .where(
        and(
          eq(forcedResetAuthorizations.tokenHash, hashToken(token)),
          isNull(forcedResetAuthorizations.consumedAt),
          isNull(forcedResetAuthorizations.revokedAt),
          gt(forcedResetAuthorizations.expiresAt, now),
          eq(users.role, "member"),
          eq(users.status, "active"),
          eq(users.forcePasswordReset, true),
        ),
      )
      .limit(1);
    if (!authorization) return { status: "invalid" as const };
    await transaction
      .update(users)
      .set({ passwordHash, forcePasswordReset: false, updatedAt: now })
      .where(eq(users.id, authorization.userId));
    await transaction
      .update(forcedResetAuthorizations)
      .set({ consumedAt: now })
      .where(eq(forcedResetAuthorizations.id, authorization.id));
    await transaction
      .update(forcedResetAuthorizations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(forcedResetAuthorizations.userId, authorization.userId),
          ne(forcedResetAuthorizations.id, authorization.id),
          isNull(forcedResetAuthorizations.revokedAt),
        ),
      );
    await transaction
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, authorization.userId), isNull(sessions.revokedAt)));
    await transaction.insert(auditEvents).values({
      category: "security",
      action: "password.forced_reset",
      outcome: "succeeded",
      targetId: authorization.userId,
      occurredAt: now,
    });
    return { status: "changed" as const };
  });
}