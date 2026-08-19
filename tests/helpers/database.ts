import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readTestDatabaseUrl } from "@/lib/config/env";
import * as schema from "@/lib/db/schema";

export function createTestDatabase(environment: NodeJS.ProcessEnv = process.env) {
  const url = readTestDatabaseUrl(environment);
  const client = postgres(url, { max: 1 });
  return {
    client,
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}

export async function truncateFeatureTables(client: postgres.Sql): Promise<void> {
  readTestDatabaseUrl();
  await client.unsafe(
    "TRUNCATE TABLE projects, audit_events, rate_limit_states, rate_limit_events, forced_reset_authorizations, password_reset_tokens, sessions, users RESTART IDENTITY CASCADE",
  );
}
