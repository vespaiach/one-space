import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { promoteMember, suspendMember } from "@/lib/db/queries/member-management";
import { createSession, findSession } from "@/lib/db/queries/sessions";
import { users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const actorId = crypto.randomUUID();

describe("Member promotion", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    await database.db.insert(users).values({ id: actorId, email: "admin@example.com", passwordHash: "hash", firstName: "Admin", lastName: "User", role: "admin" });
  });
  afterAll(async () => database.close());

  it("promotes an active Member and preserves next-request session authority", async () => {
    const [target] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Member", lastName: "User" }).returning();
    const session = await createSession(database.db, target.id, false);
    await expect(promoteMember(database.db, actorId, target.id)).resolves.toMatchObject({ status: "updated" });
    expect((await findSession(database.db, session.token))?.role).toBe("admin");
  });

  it("rejects suspended/Admin targets and serializes suspend-versus-promote", async () => {
    const [target] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Member", lastName: "User" }).returning();
    const results = await Promise.all([promoteMember(database.db, actorId, target.id), suspendMember(database.db, actorId, target.id)]);
    expect(results.filter((result) => result.status === "updated")).toHaveLength(1);
    const final = (await database.db.select().from(users).where(eq(users.id, target.id)))[0];
    expect(final.role === "admin" || final.status === "suspended").toBe(true);
    await expect(promoteMember(database.db, actorId, target.id)).resolves.toMatchObject({ status: "conflict" });
  });
});
