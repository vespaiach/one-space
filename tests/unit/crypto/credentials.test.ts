import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createEncryptedCredential,
  createOpaqueToken,
  decryptCredential,
  hashToken,
} from "@/lib/crypto/credentials";

const key = randomBytes(32);
const now = new Date("2026-08-18T12:00:00.000Z");

describe("credential protection", () => {
  it("creates random opaque tokens and stable SHA-256 hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).toHaveLength(64);
    expect(first).not.toBe(second);
    expect(hashToken(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(first)).toBe(hashToken(first));
  });

  it("encrypts purpose-bound payloads with exact expiry", () => {
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const credential = createEncryptedCredential(
      { purpose: "password-reset", issuedAt: now, expiresAt, email: "user@example.com", nonce: "nonce" },
      key,
    );
    const payload = decryptCredential(credential, "password-reset", key, now);
    expect(payload.expiresAt).toEqual(expiresAt);
    expect(payload.email).toBe("user@example.com");
  });

  it("rejects tampering, wrong purpose, and exact-expiry use", () => {
    const expiresAt = new Date(now.getTime() + 1000);
    const credential = createEncryptedCredential(
      { purpose: "invitation", issuedAt: now, expiresAt, email: "user@example.com" },
      key,
    );
    expect(() => decryptCredential(credential, "password-reset", key, now)).toThrow();
    const parts = credential.split(".");
    const tamperedCiphertext = `${parts[2]?.startsWith("A") ? "B" : "A"}${parts[2]?.slice(1)}`;
    expect(() => decryptCredential(`${parts[0]}.${parts[1]}.${tamperedCiphertext}.${parts[3]}`, "invitation", key, now)).toThrow();
    expect(() => decryptCredential(credential, "invitation", key, expiresAt)).toThrow();
  });
});
