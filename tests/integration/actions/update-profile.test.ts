import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { updateTextProfile } from "@/lib/db/queries/users";
import { auditEvents, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

async function createUser(role: "admin" | "member" = "member") {
  const [user] = await database.db.insert(users).values({ email: `${crypto.randomUUID()}@example.com`, passwordHash: "hash", firstName: "Before", lastName: "User", role }).returning();
  return user;
}

describe("profile updates", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("normalizes and atomically commits a self update with audit data", async () => {
    const member = await createUser();
    await expect(updateTextProfile(database.db, { actor: { userId: member.id, role: "member" }, targetUserId: member.id, firstName: " José ", lastName: " User ", phoneNumber: " ", slackHandle: "@Mixed.Handle" })).resolves.toMatchObject({ status: "updated" });
    const rows = await database.db.select().from(users);
    expect(rows[0]).toMatchObject({ firstName: "José", phoneNumber: null, slackHandle: "mixed.handle", role: "member" });
    expect((await database.db.select({ value: count() }).from(auditEvents))[0].value).toBe(1);
  });

  it("rejects Member-to-other and every Admin-account target without partial writes", async () => {
    const first = await createUser();
    const second = await createUser();
    const admin = await createUser("admin");
    await expect(updateTextProfile(database.db, { actor: { userId: first.id, role: "member" }, targetUserId: second.id, firstName: "Changed", lastName: "User", phoneNumber: "", slackHandle: "" })).resolves.toMatchObject({ status: "forbidden" });
    await expect(updateTextProfile(database.db, { actor: { userId: admin.id, role: "admin" }, targetUserId: admin.id, firstName: "Changed", lastName: "Admin", phoneNumber: "", slackHandle: "" })).resolves.toMatchObject({ status: "forbidden" });
    expect((await database.db.select().from(users)).map((row) => row.firstName)).not.toContain("Changed");
  });

  it("rejects invalid fields without changing any field", async () => {
    const member = await createUser();
    await expect(updateTextProfile(database.db, { actor: { userId: member.id, role: "member" }, targetUserId: member.id, firstName: "", lastName: "Changed", phoneNumber: "", slackHandle: "" })).resolves.toMatchObject({ status: "invalid" });
    expect((await database.db.select().from(users))[0]).toMatchObject({ firstName: "Before", lastName: "User" });
  });
});
