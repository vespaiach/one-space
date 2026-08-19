import { mkdtemp, readdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pruneExpiredData } from "@/lib/maintenance/prune";
import {
  forcedResetAuthorizations,
  passwordResetTokens,
  rateLimitEvents,
  rateLimitStates,
  sessions,
  users,
} from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");

describe("expired credential and avatar pruning", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("is idempotent and preserves live credentials and referenced avatars", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-prune-"));
    const [user] = await database.db
      .insert(users)
      .values({
        email: "member@example.com",
        passwordHash: "hash",
        firstName: "Member",
        lastName: "User",
        avatarKey: "11111111-1111-4111-8111-111111111111.png",
      })
      .returning();
    await Promise.all([
      writeFile(join(directory, user.avatarKey as string), "referenced"),
      writeFile(join(directory, "22222222-2222-4222-8222-222222222222.png"), "orphan"),
    ]);
    await utimes(join(directory, "22222222-2222-4222-8222-222222222222.png"), new Date(0), new Date(0));
    await database.db.insert(sessions).values([
      { userId: user.id, tokenHash: "a".repeat(64), expiresAt: new Date(now.getTime() - 1) },
      { userId: user.id, tokenHash: "b".repeat(64), expiresAt: new Date(now.getTime() + 60_000) },
    ]);
    await database.db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: "c".repeat(64),
      expiresAt: new Date(now.getTime() - 1),
    });
    await database.db.insert(forcedResetAuthorizations).values({
      userId: user.id,
      tokenHash: "d".repeat(64),
      expiresAt: new Date(now.getTime() - 1),
    });
    await database.db.insert(rateLimitEvents).values({
      scope: "reset_source",
      keyHash: "e".repeat(64),
      occurredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    });
    await database.db.insert(rateLimitStates).values({
      scope: "reset_source",
      keyHash: "e".repeat(64),
      limitedUntil: new Date(now.getTime() - 1),
      updatedAt: new Date(now.getTime() - 1),
    });

    await pruneExpiredData(database.db, directory, now);
    await pruneExpiredData(database.db, directory, now);

    expect(await database.db.select().from(sessions)).toHaveLength(1);
    expect(await database.db.select().from(passwordResetTokens)).toHaveLength(0);
    expect(await database.db.select().from(forcedResetAuthorizations)).toHaveLength(0);
    expect(await database.db.select().from(rateLimitEvents)).toHaveLength(0);
    expect(await database.db.select().from(rateLimitStates)).toHaveLength(0);
    expect(await readdir(directory)).toEqual([user.avatarKey]);
  });
});
