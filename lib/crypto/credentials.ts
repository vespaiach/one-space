import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type CredentialPurpose = "invitation" | "password-reset";

export type CredentialPayload = {
  purpose: CredentialPurpose;
  issuedAt: Date;
  expiresAt: Date;
  email: string;
  nonce?: string;
};

type SerializedCredentialPayload = Omit<CredentialPayload, "issuedAt" | "expiresAt"> & {
  issuedAt: string;
  expiresAt: string;
};

export class InvalidCredentialError extends Error {
  constructor() {
    super("Invalid credential");
    this.name = "InvalidCredentialError";
  }
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createEncryptedCredential(payload: CredentialPayload, key: Buffer): string {
  if (key.length !== 32) throw new Error("Credential key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const serialized: SerializedCredentialPayload = {
    ...payload,
    issuedAt: payload.issuedAt.toISOString(),
    expiresAt: payload.expiresAt.toISOString(),
  };
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(serialized), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptCredential(
  credential: string,
  expectedPurpose: CredentialPurpose,
  key: Buffer,
  now: Date = new Date(),
): CredentialPayload {
  try {
    const [credentialVersion, encodedIv, encodedCiphertext, encodedTag] = credential.split(".");
    if (credentialVersion !== "v1" || !encodedIv || !encodedCiphertext || !encodedTag || key.length !== 32) {
      throw new InvalidCredentialError();
    }
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Partial<SerializedCredentialPayload>;
    const issuedAt = new Date(parsed.issuedAt ?? "");
    const expiresAt = new Date(parsed.expiresAt ?? "");
    if (
      parsed.purpose !== expectedPurpose ||
      typeof parsed.email !== "string" ||
      Number.isNaN(issuedAt.getTime()) ||
      Number.isNaN(expiresAt.getTime()) ||
      now >= expiresAt
    ) {
      throw new InvalidCredentialError();
    }
    return {
      purpose: expectedPurpose,
      email: parsed.email,
      issuedAt,
      expiresAt,
      ...(parsed.nonce ? { nonce: parsed.nonce } : {}),
    };
  } catch (error) {
    if (error instanceof InvalidCredentialError) throw error;
    throw new InvalidCredentialError();
  }
}