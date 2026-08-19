import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { auditEvents } from "@/lib/db/schema";
import {
  RATE_LIMIT_POLICIES,
  checkRateLimit,
  type RateLimitScope,
} from "@/lib/rate-limit/rate-limiter";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const hashKey = "rate-limit-test-secret";
const now = new Date("2026-08-18T12:00:00.000Z");

describe("rolling rate limiter", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  for (const [scope, policy] of Object.entries(RATE_LIMIT_POLICIES) as [
    RateLimitScope,
    { limit: number; windowMs: number },
  ][]) {
    it(`accepts the final ${scope} request and rejects the first excess`, async () => {
      for (let attempt = 0; attempt < policy.limit; attempt += 1) {
        await expect(checkRateLimit(database.db, { scope, key: "raw-private-key", hashKey, now })).resolves.toMatchObject({ allowed: true });
      }
      await expect(checkRateLimit(database.db, { scope, key: "raw-private-key", hashKey, now })).resolves.toMatchObject({ allowed: false });
    });
  }

  it("emits one audit event per continuous limited state", async () => {
    const policy = RATE_LIMIT_POLICIES.reset_recipient;
    for (let attempt = 0; attempt <= policy.limit + 1; attempt += 1) {
      await checkRateLimit(database.db, { scope: "reset_recipient", key: "user@example.com", hashKey, now });
    }
    const [result] = await database.db.select({ value: count() }).from(auditEvents);
    expect(result.value).toBe(1);
  });

  it("allows attempts after the exact rolling boundary", async () => {
    const policy = RATE_LIMIT_POLICIES.invite_recipient;
    for (let attempt = 0; attempt < policy.limit; attempt += 1) {
      await checkRateLimit(database.db, { scope: "invite_recipient", key: "user@example.com", hashKey, now });
    }
    const boundary = new Date(now.getTime() + policy.windowMs);
    await expect(checkRateLimit(database.db, { scope: "invite_recipient", key: "user@example.com", hashKey, now: boundary })).resolves.toMatchObject({ allowed: true });
  });
});
