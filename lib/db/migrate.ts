import { join } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "@/lib/db";

export function runMigrations(
  database: Database,
  migrationsFolder = join(process.cwd(), "drizzle/migrations"),
) {
  return migrate(database, { migrationsFolder });
}