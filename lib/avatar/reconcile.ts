import { readdir, stat } from "node:fs/promises";
import { deleteAvatar, resolveAvatarPath } from "./storage";

export async function reconcileAvatars(
  storagePath: string,
  referencedKeys: ReadonlySet<string>,
  olderThan: Date,
): Promise<string[]> {
  const removed: string[] = [];
  let keys: string[];
  try {
    keys = await readdir(storagePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return removed;
    throw error;
  }
  for (const key of keys) {
    if (referencedKeys.has(key)) continue;
    const metadata = await stat(resolveAvatarPath(storagePath, key));
    if (metadata.mtime > olderThan) continue;
    await deleteAvatar(storagePath, key);
    removed.push(key);
  }
  return removed;
}