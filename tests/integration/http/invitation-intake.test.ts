import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createEncryptedCredential } from "@/lib/crypto/credentials";
import { processInvitationIntake } from "@/lib/invitations/intake";
import { users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const key = Buffer.alloc(32, 4);
const now = new Date("2026-08-18T12:00:00.000Z");

function credential(purpose: "invitation" | "password-reset" = "invitation", expiresAt = new Date(now.getTime() + 60_000)) {
  return createEncryptedCredential({ purpose, issuedAt: now, expiresAt, email: "new@example.com" }, key);
}

describe("invitation intake", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("accepts a valid credential for a clean redirect cookie", async () => {
    await expect(processInvitationIntake(database.db, { token: credential(), tokenKey: key, hashKey: "hash", source: "127.0.0.1", now })).resolves.toMatchObject({ status: "valid", email: "new@example.com" });
  });

  it("collapses expiry, tampering, and wrong purpose into one invalid result", async () => {
    const values = [
      credential("password-reset"),
      credential("invitation", now),
      `${credential().slice(0, -4)}xxxx`,
    ];
    for (const token of values) {
      await expect(processInvitationIntake(database.db, { token, tokenKey: key, hashKey: "hash", source: "127.0.0.1", now })).resolves.toEqual({ status: "invalid" });
    }
  });

  it("rejects authentic links after canonical registration", async () => {
    await database.db.insert(users).values({ email: "new@example.com", passwordHash: "hash", firstName: "New", lastName: "User" });
    await expect(processInvitationIntake(database.db, { token: credential(), tokenKey: key, hashKey: "hash", source: "127.0.0.1", now })).resolves.toEqual({ status: "invalid" });
  });
});
