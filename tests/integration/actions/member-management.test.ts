import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { forceMemberPasswordReset, reinstateMember, suspendMember } from "@/lib/db/queries/member-management";
import { createSession } from "@/lib/db/queries/sessions";
import { forcedResetAuthorizations, sessions, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const actorId = crypto.randomUUID();

async function member(status: "active" | "suspended" = "active") {
  return (await database.db.insert(users).values({ email: `${crypto.randomUUID()}@example.com`, passwordHash: "hash", firstName: "Member", lastName: "User", status }).returning())[0];
}

describe("Member management", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    await database.db.insert(users).values({ id: actorId, email: "admin@example.com", passwordHash: "hash", firstName: "Admin", lastName: "User", role: "admin" });
  });
  afterAll(async () => database.close());

  it("suspends and revokes full and restricted credentials", async () => {
    const target = await member();
    await createSession(database.db, target.id, false);
    await database.db.insert(forcedResetAuthorizations).values({ userId: target.id, tokenHash: "a".repeat(64), expiresAt: new Date(Date.now() + 60_000) });
    await expect(suspendMember(database.db, actorId, target.id)).resolves.toMatchObject({ status: "updated" });
    expect((await database.db.select().from(users).where(eq(users.id, target.id)))[0].status).toBe("suspended");
    expect((await database.db.select().from(sessions))[0].revokedAt).not.toBeNull();
    expect((await database.db.select().from(forcedResetAuthorizations))[0].revokedAt).not.toBeNull();
  });

  it("reinstates status only and rejects ineligible transitions", async () => {
    const target = await member("suspended");
    await expect(reinstateMember(database.db, actorId, target.id)).resolves.toMatchObject({ status: "updated" });
    await expect(reinstateMember(database.db, actorId, target.id)).resolves.toMatchObject({ status: "conflict" });
    expect((await database.db.select().from(users).where(eq(users.id, target.id)))[0]).toMatchObject({ status: "active", passwordHash: "hash" });
  });

  it("assigns forced reset to active or suspended Members and rejects Admin targets", async () => {
    const target = await member();
    await expect(forceMemberPasswordReset(database.db, actorId, target.id)).resolves.toMatchObject({ status: "updated" });
    expect((await database.db.select().from(users).where(eq(users.id, target.id)))[0].forcePasswordReset).toBe(true);
    await expect(suspendMember(database.db, actorId, actorId)).resolves.toMatchObject({ status: "conflict" });
  });
});
