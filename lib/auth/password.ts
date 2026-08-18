import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const PASSWORD_SCRYPT_PARAMETERS = {
  N: 2 ** 15,
  r: 8,
  p: 3,
  keyLength: 64,
  maxmem: 64 * 1024 * 1024,
} as const;

const version = "1";
const dummySalt = Buffer.from("7dd50d8728e8cab8511bc8c538528c53bf936f0442a850ab65add2f7dc3c9d0b", "hex");

type ScryptParameters = {
  N: number;
  r: number;
  p: number;
  keyLength: number;
  maxmem: number;
};

function derive(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters = PASSWORD_SCRYPT_PARAMETERS,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      parameters.keyLength,
      { N: parameters.N, r: parameters.r, p: parameters.p, maxmem: parameters.maxmem },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

type EncodedPassword = { N: number; r: number; p: number; salt: Buffer; key: Buffer };

function parseEncodedPassword(encoded: string): EncodedPassword | null {
  const [algorithm, encodedVersion, encodedN, encodedR, encodedP, salt, key] = encoded.split("$");
  if (algorithm !== "scrypt" || encodedVersion !== `v=${version}` || !salt || !key) return null;
  const N = Number(encodedN?.replace("N=", ""));
  const r = Number(encodedR?.replace("r=", ""));
  const p = Number(encodedP?.replace("p=", ""));
  if (![N, r, p].every(Number.isSafeInteger)) return null;
  try {
    return { N, r, p, salt: Buffer.from(salt, "base64url"), key: Buffer.from(key, "base64url") };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32);
  const key = await derive(password, salt);
  return `scrypt$v=${version}$N=${PASSWORD_SCRYPT_PARAMETERS.N}$r=${PASSWORD_SCRYPT_PARAMETERS.r}$p=${PASSWORD_SCRYPT_PARAMETERS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parseEncodedPassword(encoded);
  if (!parsed || parsed.key.length !== PASSWORD_SCRYPT_PARAMETERS.keyLength) {
    await derive(password, dummySalt);
    return false;
  }
  const key = await derive(password, parsed.salt, { ...PASSWORD_SCRYPT_PARAMETERS, ...parsed });
  return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
}

export async function verifyPasswordOrDummy(password: string, encoded: string | null): Promise<boolean> {
  if (encoded) return verifyPassword(password, encoded);
  await derive(password, dummySalt);
  return false;
}

export function needsPasswordUpgrade(encoded: string): boolean {
  const parsed = parseEncodedPassword(encoded);
  return (
    !parsed ||
    parsed.N !== PASSWORD_SCRYPT_PARAMETERS.N ||
    parsed.r !== PASSWORD_SCRYPT_PARAMETERS.r ||
    parsed.p !== PASSWORD_SCRYPT_PARAMETERS.p ||
    parsed.key.length !== PASSWORD_SCRYPT_PARAMETERS.keyLength
  );
}