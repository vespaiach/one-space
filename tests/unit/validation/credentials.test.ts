import { describe, expect, it } from "vitest";
import { canonicalizeEmail, validatePassword } from "@/lib/validation/credentials";

describe("credential validation", () => {
  it("canonicalizes surrounding whitespace and ASCII case only", () => {
    expect(canonicalizeEmail("  Person+Tag@Example.COM  ")).toEqual({
      ok: true,
      value: "person+tag@example.com",
    });
  });

  it("rejects non-ASCII, malformed, or oversized email input", () => {
    expect(canonicalizeEmail("josé@example.com").ok).toBe(false);
    expect(canonicalizeEmail("missing-at.example.com").ok).toBe(false);
    expect(canonicalizeEmail(`${"a".repeat(245)}@x.test`).ok).toBe(false);
  });

  it("accepts only passwords meeting every bounded policy rule", () => {
    expect(validatePassword("Valid123!")).toEqual({ ok: true, value: "Valid123!" });
    for (const password of ["Short1!", "lowercase1!", "UPPERCASE1!", "NoDigits!", "NoSpecial1"]) {
      expect(validatePassword(password).ok).toBe(false);
    }
    expect(validatePassword(`A1!${"a".repeat(126)}`).ok).toBe(false);
  });
});
