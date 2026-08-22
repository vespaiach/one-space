import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return { client, db: drizzle(client, { schema }) };
}

const connection = createDatabase(process.env.DATABASE_URL);
const drizzleDb = connection.db;

const globalForDb = globalThis as unknown as { db: typeof drizzleDb };

export const db = globalForDb.db ?? drizzleDb;

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];