import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { updateProfileWithAvatar } from "@/lib/avatar/profile";
import { reconcileAvatars } from "@/lib/avatar/reconcile";
import { deleteAvatar, writeAvatarCandidate } from "@/lib/avatar/storage";
import { auditEvents, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

describe("atomic profile avatar save", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("commits replace and remove with text fields", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-profile-"));
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Before", lastName: "User" }).returning();
    const bytes = await sharp({ create: { width: 100, height: 100, channels: 3, background: "blue" } }).png().toBuffer();
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: user.id, role: "member" }, targetUserId: user.id, firstName: "After", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "replace", avatar: { bytes, contentType: "image/png" } })).resolves.toMatchObject({ status: "updated" });
    expect((await database.db.select().from(users).where(eq(users.id, user.id)))[0].avatarKey).toMatch(/\.png$/);
    await updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: user.id, role: "member" }, targetUserId: user.id, firstName: "After", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "remove" });
    expect((await database.db.select().from(users).where(eq(users.id, user.id)))[0].avatarKey).toBeNull();
    expect(await readdir(directory)).toEqual([]);
  });

  it("removing an absent avatar is a successful no-op", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-profile-"));
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Before", lastName: "User" }).returning();
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: user.id, role: "member" }, targetUserId: user.id, firstName: "Before", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "remove" })).resolves.toMatchObject({ status: "updated" });
  });

  it("authorizes only Member self-edit or an Admin editing an active Member before decode", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-profile-"));
    const [first, second, admin] = await database.db.insert(users).values([
      { email: "first@example.com", passwordHash: "hash", firstName: "First", lastName: "User" },
      { email: "second@example.com", passwordHash: "hash", firstName: "Second", lastName: "User" },
      { email: "admin@example.com", passwordHash: "hash", firstName: "Admin", lastName: "User", role: "admin" },
    ]).returning();
    const invalidAvatar = { bytes: Buffer.from("not-an-image"), contentType: "image/png" };
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: first.id, role: "member" }, targetUserId: second.id, firstName: "Changed", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "replace", avatar: invalidAvatar })).resolves.toEqual({ status: "forbidden" });
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: admin.id, role: "admin" }, targetUserId: second.id, firstName: "Changed", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "keep" })).resolves.toEqual({ status: "updated" });
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: admin.id, role: "admin" }, targetUserId: admin.id, firstName: "Changed", lastName: "Admin", phoneNumber: "", slackHandle: "", avatarAction: "keep" })).resolves.toEqual({ status: "forbidden" });
  });

  it("preserves all prior profile state on candidate-write and commit failures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-profile-"));
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Before", lastName: "User" }).returning();
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer();
    await expect(updateProfileWithAvatar(database.db, { storagePath: "relative-path", actor: { userId: user.id, role: "member" }, targetUserId: user.id, firstName: "After", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "replace", avatar: { bytes, contentType: "image/png" } })).rejects.toThrow();
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: crypto.randomUUID(), role: "admin" }, targetUserId: user.id, firstName: "After", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "replace", avatar: { bytes, contentType: "image/png" } })).rejects.toThrow();
    expect((await database.db.select().from(users).where(eq(users.id, user.id)))[0]).toMatchObject({ firstName: "Before", avatarKey: null });
    expect(await readdir(directory)).toEqual([]);
  });

  it("keeps committed state when old-file cleanup fails and reconciliation removes only the orphan", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-profile-"));
    const oldKey = await writeAvatarCandidate(directory, Buffer.from("old"), "png");
    const [user] = await database.db.insert(users).values({ email: "member@example.com", passwordHash: "hash", firstName: "Before", lastName: "User", avatarKey: oldKey }).returning();
    const bytes = await sharp({ create: { width: 20, height: 20, channels: 3, background: "blue" } }).png().toBuffer();
    await expect(updateProfileWithAvatar(database.db, { storagePath: directory, actor: { userId: user.id, role: "member" }, targetUserId: user.id, firstName: "After", lastName: "User", phoneNumber: "", slackHandle: "", avatarAction: "replace", avatar: { bytes, contentType: "image/png" }, fileOperations: { writeCandidate: writeAvatarCandidate, deleteFile: async (storagePath, key) => { if (key === oldKey) throw new Error("injected cleanup failure"); await deleteAvatar(storagePath, key); } } })).resolves.toEqual({ status: "updated" });
    const updated = (await database.db.select().from(users).where(eq(users.id, user.id)))[0];
    expect(updated).toMatchObject({ firstName: "After" });
    expect(updated.avatarKey).not.toBe(oldKey);
    expect((await database.db.select().from(auditEvents)).some((event) => event.action === "avatar.cleanup" && event.outcome === "failed")).toBe(true);
    await reconcileAvatars(directory, new Set([updated.avatarKey as string]), new Date(Date.now() + 1000));
    expect(await readdir(directory)).toEqual([updated.avatarKey]);
  });
});
