import { randomBytes } from "node:crypto";
import { vi } from "vitest";

export function createTestEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return Object.assign({
    NODE_ENV: "test",
    DATABASE_URL: "postgres://one_space_dev:one_space_dev@localhost:5432/one_space_dev",
    DATABASE_URL_TEST: "postgres://one_space_test:one_space_test@localhost:5432/one_space_feature_test",
    APP_ORIGIN: "https://one-space.test",
    TOKEN_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    RATE_LIMIT_HASH_KEY: randomBytes(32).toString("hex"),
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
    LOGIN_MAX_ATTEMPTS: "5",
    LOGIN_LOCKOUT_MINUTES: "15",
    SMTP_HOST: "localhost",
    SMTP_PORT: "1025",
    SMTP_FROM: "noreply@one-space.test",
    INITIAL_ADMIN_EMAIL: "admin@example.com",
    INITIAL_ADMIN_PASSWORD: "Admin1234!",
    INITIAL_ADMIN_FIRST_NAME: "Initial",
    INITIAL_ADMIN_LAST_NAME: "Admin",
    AVATAR_STORAGE_PATH: "/tmp/one-space-feature-test-avatars",
    BACKUP_ENCRYPTION_KEY_FILE: "/tmp/one-space-feature-test-backup.key",
  }, overrides);
}

export function useDeterministicClock(now: string | Date): Date {
  const instant = typeof now === "string" ? new Date(now) : now;
  vi.useFakeTimers();
  vi.setSystemTime(instant);
  return instant;
}
