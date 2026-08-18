import { createHmac } from "node:crypto";
import type { Database } from "@/lib/db";
import { evaluateRateLimit } from "@/lib/db/queries/rate-limits";

export const RATE_LIMIT_POLICIES = {
  login_source: { limit: 30, windowMs: 15 * 60 * 1000 },
  invite_actor: { limit: 20, windowMs: 60 * 60 * 1000 },
  invite_recipient: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  reset_recipient: { limit: 5, windowMs: 60 * 60 * 1000 },
  reset_source: { limit: 20, windowMs: 60 * 60 * 1000 },
  token_validation_source: { limit: 30, windowMs: 15 * 60 * 1000 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMIT_POLICIES;

export function pseudonymizeRateLimitKey(key: string, hashKey: string): string {
  return createHmac("sha256", hashKey).update(key).digest("hex");
}

export async function checkRateLimit(
  database: Database,
  input: { scope: RateLimitScope; key: string; hashKey: string; now?: Date },
) {
  const policy = RATE_LIMIT_POLICIES[input.scope];
  return evaluateRateLimit(database, {
    scope: input.scope,
    keyHash: pseudonymizeRateLimitKey(input.key, input.hashKey),
    limit: policy.limit,
    windowMs: policy.windowMs,
    now: input.now ?? new Date(),
  });
}