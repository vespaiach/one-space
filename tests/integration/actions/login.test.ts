import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { authenticateUser } from "@/lib/auth/login";
import { sessions, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");

async function user(overrides: Partial<typeof users.$inferInsert> = {}) {
  return (await database.db.insert(users).values({ email: "member@example.com", passwordHash: await hashPassword("Valid123!"), firstName: "Member", lastName: "User", ...overrides }).returning())[0];
}

describe("login and lockout", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("uses generic unknown/wrong-password failure and fixed session durations", async () => {
    await user();
    await expect(authenticateUser(database.db, { email: "unknown@example.com", password: "Wrong123!", rememberMe: false, source: "one", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now })).resolves.toMatchObject({ status: "invalid-credentials" });
    await expect(authenticateUser(database.db, { email: "member@example.com", password: "Valid123!", rememberMe: true, source: "two", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now })).resolves.toMatchObject({ status: "authenticated" });
    expect((await database.db.select().from(sessions))[0].expiresAt.getTime() - now.getTime()).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it("locks on the threshold failure and accepts at the exact unlock boundary", async () => {
    const target = await user();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await authenticateUser(database.db, { email: target.email, password: "Wrong123!", rememberMe: false, source: `${attempt}`, hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now });
    }
    const locked = (await database.db.select().from(users).where(eq(users.id, target.id)))[0];
    expect(locked.lockedUntil).toEqual(new Date(now.getTime() + 15 * 60 * 1000));
    await expect(authenticateUser(database.db, { email: target.email, password: "Valid123!", rememberMe: false, source: "unlock", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now: locked.lockedUntil as Date })).resolves.toMatchObject({ status: "authenticated" });
  });

  it("applies suspension before credentials", async () => {
    await user({ status: "suspended" });
    await expect(authenticateUser(database.db, { email: "member@example.com", password: "Wrong123!", rememberMe: false, source: "one", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now })).resolves.toMatchObject({ status: "suspended" });
    expect((await database.db.select().from(users))[0].failedLoginAttempts).toBe(0);
  });
});
