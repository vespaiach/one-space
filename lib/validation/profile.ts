export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const namePattern = /^[\p{L}\p{M} .’'-]+$/u;
const slackPattern = /^[a-z0-9._-]+$/;
const controlPattern = /[\p{Cc}\p{Cf}]/u;

function characterLength(value: string): number {
  return Array.from(value).length;
}

export function normalizeName(input: string): ValidationResult<string> {
  const value = input.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (characterLength(value) < 1 || characterLength(value) > 100 || !namePattern.test(value)) {
    return { ok: false, error: "Enter a name using 1 to 100 letters and common name punctuation." };
  }
  return { ok: true, value };
}

export function normalizePhoneNumber(input: string): ValidationResult<string | null> {
  const value = input.normalize("NFC").trim();
  if (!value) return { ok: true, value: null };
  if (characterLength(value) > 50 || controlPattern.test(value)) {
    return { ok: false, error: "Enter a phone number using at most 50 printable characters." };
  }
  return { ok: true, value };
}

export function normalizeSlackHandle(input: string): ValidationResult<string | null> {
  const trimmed = input.normalize("NFC").trim();
  if (!trimmed) return { ok: true, value: null };
  const value = (trimmed.startsWith("@") ? trimmed.slice(1) : trimmed).toLowerCase();
  if (value.length < 1 || value.length > 80 || !slackPattern.test(value)) {
    return {
      ok: false,
      error: "Enter a Slack handle using letters, numbers, periods, underscores, or hyphens.",
    };
  }
  return { ok: true, value };
}