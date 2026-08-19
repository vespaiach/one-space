import { describe, expect, it } from "vitest";
import {
  PASSWORD_SCRYPT_PARAMETERS,
  hashPassword,
  needsPasswordUpgrade,
  verifyPassword,
  verifyPasswordOrDummy,
} from "@/lib/auth/password";

describe("password hashing", () => {
  it("encodes the approved versioned scrypt parameters and unique salts", async () => {
    const first = await hashPassword("Valid123!");
    const second = await hashPassword("Valid123!");
    expect(first).not.toBe(second);
    expect(first).toContain(`N=${PASSWORD_SCRYPT_PARAMETERS.N}`);
    expect(first).toContain(`r=${PASSWORD_SCRYPT_PARAMETERS.r}`);
    expect(first).toContain(`p=${PASSWORD_SCRYPT_PARAMETERS.p}`);
  });

  it("verifies correct passwords and rejects incorrect values", async () => {
    const encoded = await hashPassword("Valid123!");
    await expect(verifyPassword("Valid123!", encoded)).resolves.toBe(true);
    await expect(verifyPassword("Wrong123!", encoded)).resolves.toBe(false);
  });

  it("performs dummy password work for an unknown account", async () => {
    await expect(verifyPasswordOrDummy("Valid123!", null)).resolves.toBe(false);
  });

  it("detects obsolete or malformed parameter encodings", async () => {
    const encoded = await hashPassword("Valid123!");
    expect(needsPasswordUpgrade(encoded)).toBe(false);
    expect(needsPasswordUpgrade(encoded.replace("N=32768", "N=16384"))).toBe(true);
    expect(needsPasswordUpgrade("invalid")).toBe(true);
  });
});
