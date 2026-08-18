import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("avatar backup and restore scripts", () => {
  it("coordinates encrypted artifacts, retention, checksums, isolated restore, and reference verification", async () => {
    const backup = await readFile("ops/backup.sh", "utf8");
    const restore = await readFile("ops/restore.sh", "utf8");
    const verify = await readFile("ops/verify-restore.sh", "utf8");
    expect(backup).toContain("pg_dump");
    expect(backup).toContain("sha256");
    expect(backup).toContain("30");
    expect(restore).toContain("RESTORE_DATABASE_URL");
    expect(verify).toContain("avatar_key");
  });
});
