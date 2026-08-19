import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

const avatarKeyPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png)$/i;

export function resolveAvatarPath(storagePath: string, key: string): string {
  if (!isAbsolute(storagePath) || !avatarKeyPattern.test(key))
    throw new Error("Invalid avatar storage path or key");
  const root = resolve(storagePath);
  const path = resolve(join(root, key));
  if (relative(root, path).startsWith("..")) throw new Error("Avatar key escapes storage");
  return path;
}

export async function writeAvatarCandidate(storagePath: string, bytes: Buffer, extension: "jpg" | "png") {
  await mkdir(storagePath, { recursive: true, mode: 0o700 });
  const key = `${randomUUID()}.${extension}`;
  const path = resolveAvatarPath(storagePath, key);
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(path).catch(() => undefined);
    throw error;
  } finally {
    await handle.close().catch(() => undefined);
  }
  try {
    const directory = await open(storagePath, "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    await unlink(path).catch(() => undefined);
    throw error;
  }
  return key;
}

export function readAvatar(storagePath: string, key: string): Promise<Buffer> {
  return readFile(resolveAvatarPath(storagePath, key));
}

export async function deleteAvatar(storagePath: string, key: string): Promise<void> {
  try {
    await unlink(resolveAvatarPath(storagePath, key));
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}