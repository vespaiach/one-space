import { mkdtemp, readdir, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteAvatar, readAvatar, resolveAvatarPath, writeAvatarCandidate } from "@/lib/avatar/storage";
import { reconcileAvatars } from "@/lib/avatar/reconcile";

describe("private avatar storage", () => {
  it("writes immutable fsynced candidates and reads only confined keys", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-"));
    const key = await writeAvatarCandidate(directory, Buffer.from("image"), "png");
    expect(key).toMatch(/^[0-9a-f-]+\.png$/);
    expect((await stat(resolveAvatarPath(directory, key))).size).toBe(5);
    await expect(readAvatar(directory, key)).resolves.toEqual(Buffer.from("image"));
    expect(() => resolveAvatarPath(directory, "../secret.png")).toThrow();
    await deleteAvatar(directory, key);
    expect(await readdir(directory)).toEqual([]);
  });

  it("reconciles only old unreferenced candidates", async () => {
    const directory = await mkdtemp(join(tmpdir(), "one-space-avatar-"));
    const referenced = await writeAvatarCandidate(directory, Buffer.from("referenced"), "png");
    const orphan = await writeAvatarCandidate(directory, Buffer.from("orphan"), "jpg");
    await utimes(resolveAvatarPath(directory, orphan), new Date(0), new Date(0));
    await expect(reconcileAvatars(directory, new Set([referenced]), new Date())).resolves.toEqual([orphan]);
    expect(await readdir(directory)).toEqual([referenced]);
  });
});
