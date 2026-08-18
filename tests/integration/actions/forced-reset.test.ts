import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { authenticateUser } from "@/lib/auth/login";
import { completeForcedReset } from "@/lib/db/queries/passwords";
import { findForcedResetAuthorization } from "@/lib/db/queries/sessions";
import { forcedResetAuthorizations, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");

describe("restricted forced reset", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("credential login creates only a 15-minute restricted authorization", async () => {
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: await hashPassword("Valid123!"), firstName: "Member", lastName: "User", forcePasswordReset: true }).returning();
    const result = await authenticateUser(database.db, { email: user.email, password: "Valid123!", rememberMe: false, source: "one", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now });
    expect(result.status).toBe("forced-reset");
    if (result.status !== "forced-reset") return;
    expect(result.expiresAt.getTime() - now.getTime()).toBe(15 * 60 * 1000);
    expect(await findForcedResetAuthorization(database.db, result.token, result.expiresAt)).toBeNull();
  });

  it("completes password change, clears the flag, and consumes authorization", async () => {
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: await hashPassword("Valid123!"), firstName: "Member", lastName: "User", forcePasswordReset: true }).returning();
    const login = await authenticateUser(database.db, { email: user.email, password: "Valid123!", rememberMe: false, source: "one", hashKey: "hash", maxAttempts: 5, lockoutMinutes: 15, now });
    if (login.status !== "forced-reset") throw new Error("Expected forced reset");
    await expect(completeForcedReset(database.db, login.token, await hashPassword("Changed123!"), new Date(now.getTime() + 1000))).resolves.toMatchObject({ status: "changed" });
    const updated = (await database.db.select().from(users).where(eq(users.id, user.id)))[0];
    expect(updated.forcePasswordReset).toBe(false);
    await expect(verifyPassword("Changed123!", updated.passwordHash)).resolves.toBe(true);
    expect((await database.db.select().from(forcedResetAuthorizations))[0].consumedAt).not.toBeNull();
  });
});
