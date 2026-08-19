import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { isNull } from "drizzle-orm";
import { requestPasswordResetForEmail } from "@/lib/password-reset/service";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const settings = { source: "127.0.0.1", hashKey: "hash", tokenKey: Buffer.alloc(32, 9), appOrigin: "https://one-space.test", now: new Date("2026-08-18T12:00:00.000Z") };

describe("password reset request", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("returns the same generic result for known, unknown, and suspended accounts", async () => {
    await database.db.insert(users).values({ email: "known@example.com", passwordHash: "hash", firstName: "Known", lastName: "User", status: "suspended" });
    const send = vi.fn().mockResolvedValue({ status: "accepted" });
    const known = await requestPasswordResetForEmail(database.db, { ...settings, email: " KNOWN@example.com ", send });
    const unknown = await requestPasswordResetForEmail(database.db, { ...settings, source: "127.0.0.2", email: "unknown@example.com", send });
    expect(known).toEqual({ status: "accepted" });
    expect(unknown).toEqual({ status: "accepted" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("supersedes prior unused rows and stores only nonce hashes", async () => {
    await database.db.insert(users).values({ email: "known@example.com", passwordHash: "hash", firstName: "Known", lastName: "User" });
    const send = vi.fn().mockResolvedValue({ status: "accepted" });
    await requestPasswordResetForEmail(database.db, { ...settings, email: "known@example.com", send });
    await requestPasswordResetForEmail(database.db, { ...settings, source: "127.0.0.2", email: "known@example.com", send, now: new Date(settings.now.getTime() + 1000) });
    expect(await database.db.select().from(passwordResetTokens).where(isNull(passwordResetTokens.usedAt))).toHaveLength(1);
    expect((await database.db.select().from(passwordResetTokens))[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the generic response and invalidates issuance on SMTP failure", async () => {
    await database.db.insert(users).values({ email: "known@example.com", passwordHash: "hash", firstName: "Known", lastName: "User" });
    await expect(requestPasswordResetForEmail(database.db, { ...settings, email: "known@example.com", send: vi.fn().mockResolvedValue({ status: "failed" }) })).resolves.toEqual({ status: "accepted" });
    expect((await database.db.select().from(passwordResetTokens))[0].usedAt).not.toBeNull();
  });
});
