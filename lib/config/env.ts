import { isAbsolute, relative, resolve } from "node:path";

const positiveInteger = /^[1-9]\d*$/;

export type RuntimeConfig = {
  databaseUrl: string;
  appOrigin: string;
  tokenEncryptionKey: Buffer;
  rateLimitHashKey: string;
  loginMaxAttempts: number;
  loginLockoutMinutes: number;
  smtp: {
    host: string;
    port: number;
    from: string;
    auth?: { user: string; pass: string };
  };
  avatarStoragePath: string;
};

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parsePositiveInteger(environment: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const value = environment[name]?.trim();
  if (!value) return fallback;
  if (!positiveInteger.test(value)) throw new Error(`${name} must be a positive integer`);
  return Number(value);
}

function parseTokenEncryptionKey(value: string): Buffer {
  const key = /^[0-9a-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes");
  return key;
}

function assertPrivateAvatarPath(value: string, cwd: string): string {
  if (!isAbsolute(value)) throw new Error("AVATAR_STORAGE_PATH must be absolute");
  const path = resolve(value);
  const forbiddenPaths = [cwd, resolve(cwd, "public"), resolve(cwd, ".next")];
  if (
    forbiddenPaths.some(
      (forbidden) => relative(forbidden, path) === "" || !relative(forbidden, path).startsWith(".."),
    )
  ) {
    throw new Error("AVATAR_STORAGE_PATH must be outside the checkout and web root");
  }
  return path;
}

export function readRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): RuntimeConfig {
  const appOrigin = new URL(required(environment, "APP_ORIGIN"));
  if (appOrigin.protocol !== "https:" || appOrigin.pathname !== "/") {
    throw new Error("APP_ORIGIN must be an HTTPS origin without a path");
  }

  const smtpUser = environment.SMTP_USER?.trim();
  const smtpPass = environment.SMTP_PASS?.trim();
  if (Boolean(smtpUser) !== Boolean(smtpPass)) {
    throw new Error("SMTP_USER and SMTP_PASS must be configured together");
  }

  return {
    databaseUrl: required(environment, "DATABASE_URL"),
    appOrigin: appOrigin.origin,
    tokenEncryptionKey: parseTokenEncryptionKey(required(environment, "TOKEN_ENCRYPTION_KEY")),
    rateLimitHashKey: required(environment, "RATE_LIMIT_HASH_KEY"),
    loginMaxAttempts: parsePositiveInteger(environment, "LOGIN_MAX_ATTEMPTS", 5),
    loginLockoutMinutes: parsePositiveInteger(environment, "LOGIN_LOCKOUT_MINUTES", 15),
    smtp: {
      host: required(environment, "SMTP_HOST"),
      port: parsePositiveInteger(environment, "SMTP_PORT", 587),
      from: required(environment, "SMTP_FROM"),
      ...(smtpUser && smtpPass ? { auth: { user: smtpUser, pass: smtpPass } } : {}),
    },
    avatarStoragePath: assertPrivateAvatarPath(required(environment, "AVATAR_STORAGE_PATH"), resolve(cwd)),
  };
}

export function readTestDatabaseUrl(environment: NodeJS.ProcessEnv = process.env): string {
  const value = required(environment, "DATABASE_URL_TEST");
  const url = new URL(value);
  const databaseName = url.pathname.slice(1).toLowerCase();
  if (!databaseName.includes("test") || ["postgres", "template0", "template1"].includes(databaseName)) {
    throw new Error("DATABASE_URL_TEST must identify an isolated database whose name contains test");
  }
  if (value === environment.DATABASE_URL) {
    throw new Error("DATABASE_URL_TEST must not equal DATABASE_URL");
  }
  return value;
}