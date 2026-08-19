import type { ValidationResult } from "./profile";

const emailPattern =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function canonicalizeEmail(input: string): ValidationResult<string> {
  const value = input.trim().toLowerCase();
  const [localPart = "", domain = ""] = value.split("@");
  if (
    !value ||
    value.length > 254 ||
    localPart.length > 64 ||
    !domain ||
    !Array.from(value).every((character) => character.charCodeAt(0) <= 127) ||
    !emailPattern.test(value)
  ) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value };
}

export function validatePassword(input: string): ValidationResult<string> {
  const valid =
    Array.from(input).length >= 8 &&
    Array.from(input).length <= 128 &&
    /[A-Z]/.test(input) &&
    /[a-z]/.test(input) &&
    /[0-9]/.test(input) &&
    /[^\p{L}\p{N}\s]/u.test(input) &&
    !/[\p{Cc}\p{Cf}]/u.test(input);
  return valid
    ? { ok: true, value: input }
    : {
        ok: false,
        error: "Use 8 to 128 characters with uppercase, lowercase, a number, and a special character.",
      };
}