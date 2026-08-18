import { isNotNull, lte, or } from "drizzle-orm";
import { reconcileAvatars } from "@/lib/avatar/reconcile";
import type { Database } from "@/lib/db";
import {
  forcedResetAuthorizations,
  passwordResetTokens,
  rateLimitEvents,
  rateLimitStates,
  sessions,
  users,
} from "@/lib/db/schema";

const maximumRateLimitWindowMs = 60 * 60 * 1000;
const candidateGracePeriodMs = 24 * 60 * 60 * 1000;

export async function pruneExpiredData(database: Database, avatarStoragePath: string, now = new Date()) {
  await database.transaction(async (transaction) => {
    await transaction.delete(sessions).where(or(lte(sessions.expiresAt, now), isNotNull(sessions.revokedAt)));
    await transaction
      .delete(passwordResetTokens)
      .where(or(lte(passwordResetTokens.expiresAt, now), isNotNull(passwordResetTokens.usedAt)));
    await transaction
      .delete(forcedResetAuthorizations)
      .where(
        or(
          lte(forcedResetAuthorizations.expiresAt, now),
          isNotNull(forcedResetAuthorizations.consumedAt),
          isNotNull(forcedResetAuthorizations.revokedAt),
        ),
      );
    await transaction
      .delete(rateLimitEvents)
      .where(lte(rateLimitEvents.occurredAt, new Date(now.getTime() - maximumRateLimitWindowMs)));
    await transaction.delete(rateLimitStates).where(lte(rateLimitStates.limitedUntil, now));
  });
  const referenced = await database.select({ key: users.avatarKey }).from(users);
  return reconcileAvatars(
    avatarStoragePath,
    new Set(referenced.flatMap(({ key }) => (key ? [key] : []))),
    new Date(now.getTime() - candidateGracePeriodMs),
  );
}