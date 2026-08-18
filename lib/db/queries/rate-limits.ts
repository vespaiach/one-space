import { and, count, eq, lte, min, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { auditEvents, rateLimitEvents, rateLimitStates } from "@/lib/db/schema";
import type { RateLimitScope } from "@/lib/rate-limit/rate-limiter";

type RateLimitEvaluation = {
  scope: RateLimitScope;
  keyHash: string;
  limit: number;
  windowMs: number;
  now: Date;
};

export async function evaluateRateLimit(database: Database, input: RateLimitEvaluation) {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${input.scope}:${input.keyHash}`}, 0))`,
    );
    const boundary = new Date(input.now.getTime() - input.windowMs);
    await transaction
      .delete(rateLimitEvents)
      .where(
        and(
          eq(rateLimitEvents.scope, input.scope),
          eq(rateLimitEvents.keyHash, input.keyHash),
          lte(rateLimitEvents.occurredAt, boundary),
        ),
      );
    const [aggregate] = await transaction
      .select({ value: count(), oldest: min(rateLimitEvents.occurredAt) })
      .from(rateLimitEvents)
      .where(and(eq(rateLimitEvents.scope, input.scope), eq(rateLimitEvents.keyHash, input.keyHash)));

    if (Number(aggregate?.value ?? 0) < input.limit) {
      await transaction.insert(rateLimitEvents).values({
        scope: input.scope,
        keyHash: input.keyHash,
        occurredAt: input.now,
      });
      await transaction
        .delete(rateLimitStates)
        .where(and(eq(rateLimitStates.scope, input.scope), eq(rateLimitStates.keyHash, input.keyHash)));
      return { allowed: true as const };
    }

    const oldest = aggregate?.oldest ?? input.now;
    const limitedUntil = new Date(oldest.getTime() + input.windowMs);
    const [currentState] = await transaction
      .select()
      .from(rateLimitStates)
      .where(and(eq(rateLimitStates.scope, input.scope), eq(rateLimitStates.keyHash, input.keyHash)))
      .limit(1);
    const enteringLimitedState = !currentState || currentState.limitedUntil <= input.now;

    await transaction
      .insert(rateLimitStates)
      .values({
        scope: input.scope,
        keyHash: input.keyHash,
        limitedUntil,
        eventEmittedAt: enteringLimitedState ? input.now : currentState.eventEmittedAt,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [rateLimitStates.scope, rateLimitStates.keyHash],
        set: {
          limitedUntil,
          eventEmittedAt: enteringLimitedState ? input.now : currentState?.eventEmittedAt,
          updatedAt: input.now,
        },
      });

    if (enteringLimitedState) {
      await transaction.insert(auditEvents).values({
        category: "security",
        action: "rate_limit.entered",
        outcome: "rejected",
        reasonCode: input.scope,
        occurredAt: input.now,
      });
    }
    return { allowed: false as const, retryAt: limitedUntil };
  });
}