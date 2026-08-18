import { describe, expect, it } from "vitest";
import { normalizeName, normalizePhoneNumber, normalizeSlackHandle } from "@/lib/validation/profile";

describe("profile validation", () => {
  it("normalizes Unicode names and preserves international letters", () => {
    expect(normalizeName("  Jose\u0301   O’Neill  ")).toEqual({ ok: true, value: "José O’Neill" });
  });

  it("rejects empty, oversized, control, and disallowed name input", () => {
    expect(normalizeName("   ").ok).toBe(false);
    expect(normalizeName("a".repeat(101)).ok).toBe(false);
    expect(normalizeName("Name\u0000").ok).toBe(false);
    expect(normalizeName("Name_1").ok).toBe(false);
  });

  it("stores blank phone values as absent and rejects controls or excess length", () => {
    expect(normalizePhoneNumber("  ")).toEqual({ ok: true, value: null });
    expect(normalizePhoneNumber("  +1 317 555 0123  ")).toEqual({ ok: true, value: "+1 317 555 0123" });
    expect(normalizePhoneNumber("1".repeat(51)).ok).toBe(false);
    expect(normalizePhoneNumber("317\n555").ok).toBe(false);
  });

  it("canonicalizes Slack handles without a leading at sign", () => {
    expect(normalizeSlackHandle(" @Mixed.Handle ")).toEqual({ ok: true, value: "mixed.handle" });
    expect(normalizeSlackHandle("")).toEqual({ ok: true, value: null });
    expect(normalizeSlackHandle("two words").ok).toBe(false);
    expect(normalizeSlackHandle("x".repeat(81)).ok).toBe(false);
  });
});
