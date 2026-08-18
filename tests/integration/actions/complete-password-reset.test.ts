import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { completePasswordResetWithCredential, validatePasswordResetIntake } from "@/lib/password-reset/service";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const key = Buffer.alloc(32, 9);
const now = new Date("2026-08-18T12:00:00.000Z");

async function issue() {
  const { requestPasswordResetForEmail } = await import("@/lib/password-reset/service");
  const send = vi.fn().mockResolvedValue({ status: "accepted" });
  await requestPasswordResetForEmail(database.db, { email: "known@example.com", source: "one", hashKey: "hash", tokenKey: key, appOrigin: "https://one-space.test", now, send });
  const message = send.mock.calls[0]?.[0];
  return new URL(String(message.text).match(/https:\/\/\S+/)?.[0] ?? "").searchParams.get("token") ?? "";
}

describe("password reset intake and completion", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    await database.db.insert(users).values({ email: "known@example.com", passwordHash: await hashPassword("Valid123!"), firstName: "Known", lastName: "User" });
  });
  afterAll(async () => database.close());

  it("validates clean intake and rejects wrong/tampered/exact-expiry credentials", async () => {
    const token = await issue();
    await expect(validatePasswordResetIntake(database.db, token, key, now)).resolves.toMatchObject({ status: "valid" });
    await expect(validatePasswordResetIntake(database.db, `${token}x`, key, now)).resolves.toEqual({ status: "invalid" });
    await expect(validatePasswordResetIntake(database.db, token, key, new Date(now.getTime() + 60 * 60 * 1000))).resolves.toEqual({ status: "invalid" });
  });

  it("changes password once, revokes credentials, and preserves suspension/lockout", async () => {
    const token = await issue();
    await database.db.update(users).set({ status: "suspended", lockedUntil: new Date(now.getTime() + 120_000) }).where(eq(users.email, "known@example.com"));
    await expect(completePasswordResetWithCredential(database.db, token, key, await hashPassword("Changed123!"), new Date(now.getTime() + 1000))).resolves.toMatchObject({ status: "changed" });
    const user = (await database.db.select().from(users))[0];
    expect(user.status).toBe("suspended");
    expect(user.lockedUntil).not.toBeNull();
    await expect(verifyPassword("Changed123!", user.passwordHash)).resolves.toBe(true);
    await expect(completePasswordResetWithCredential(database.db, token, key, await hashPassword("Other123!"), new Date(now.getTime() + 2000))).resolves.toEqual({ status: "invalid" });
    expect((await database.db.select().from(passwordResetTokens))[0].usedAt).not.toBeNull();
  });
});
