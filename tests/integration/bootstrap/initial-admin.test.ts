import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { ensureInitialAdmin } from "@/lib/bootstrap/initial-admin";
import { users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const config = { email: "admin@example.com", password: "Admin1234!", firstName: "Initial", lastName: "Admin" };

describe("initial Admin bootstrap", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("creates exactly one Admin in an empty database and is concurrency safe", async () => {
    await Promise.all([ensureInitialAdmin(database.db, config), ensureInitialAdmin(database.db, config)]);
    const rows = await database.db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "admin@example.com", role: "admin", status: "active" });
  });

  it("preserves an existing active Admin regardless of changed config", async () => {
    await ensureInitialAdmin(database.db, config);
    await ensureInitialAdmin(database.db, { ...config, email: "changed@example.com", password: "Changed123!" });
    expect(await database.db.select().from(users)).toHaveLength(1);
    expect((await database.db.select().from(users).where(eq(users.email, "admin@example.com")))[0]).toBeDefined();
  });

  it("rejects missing config on empty data and non-empty data without an active Admin", async () => {
    await expect(ensureInitialAdmin(database.db, null)).rejects.toThrow(/configuration/i);
    await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Member", lastName: "User" });
    await expect(ensureInitialAdmin(database.db, config)).rejects.toThrow(/active Admin/i);
  });
});
