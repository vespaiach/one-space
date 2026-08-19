import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { listUsers, findUserById } from "@/lib/db/queries/users";
import { users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

describe("authenticated user read model", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("returns every account in deterministic name and ID order", async () => {
    await database.db.insert(users).values([
      { email: "z@example.com", passwordHash: "hash", firstName: "Zed", lastName: "Able", status: "suspended" },
      { email: "a@example.com", passwordHash: "hash", firstName: "Amy", lastName: "Able", role: "admin" },
    ]);
    const rows = await listUsers(database.db);
    expect(rows.map((row) => `${row.firstName}:${row.status}`)).toEqual(["Amy:active", "Zed:suspended"]);
  });

  it("preserves absent optional fields and returns null for unknown IDs", async () => {
    const [user] = await database.db.insert(users).values({ email: "a@example.com", passwordHash: "hash", firstName: "Amy", lastName: "Able" }).returning();
    await expect(findUserById(database.db, user.id)).resolves.toMatchObject({ phoneNumber: null, slackHandle: null, avatarKey: null });
    await expect(findUserById(database.db, crypto.randomUUID())).resolves.toBeNull();
  });
});
