import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { registerInvitedUser } from "@/lib/db/queries/registration";
import { sessions, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");

describe("invited registration", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("creates one active Member and fixed two-hour session", async () => {
    const result = await registerInvitedUser(database.db, {
      email: "member@example.com",
      passwordHash: "hash",
      firstName: "First",
      lastName: "Last",
      now,
    });
    expect(result.status).toBe("registered");
    const [user] = await database.db.select().from(users).where(eq(users.email, "member@example.com"));
    const [session] = await database.db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(user).toMatchObject({ role: "member", status: "active" });
    expect(session.expiresAt.getTime() - now.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it("chooses exactly one concurrent canonical-email winner", async () => {
    const input = { email: "winner@example.com", passwordHash: "hash", firstName: "First", lastName: "Last", now };
    const results = await Promise.all([registerInvitedUser(database.db, input), registerInvitedUser(database.db, input)]);
    expect(results.map((result) => result.status).sort()).toEqual(["email-in-use", "registered"]);
    const [userCount] = await database.db.select({ value: count() }).from(users);
    const [sessionCount] = await database.db.select({ value: count() }).from(sessions);
    expect(userCount.value).toBe(1);
    expect(sessionCount.value).toBe(1);
  });
});
