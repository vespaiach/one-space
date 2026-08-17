import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
const drizzleDb = drizzle(client, { schema })

const globalForDb = globalThis as unknown as { db: typeof drizzleDb }

export const db = globalForDb.db ?? drizzleDb

if (process.env.NODE_ENV !== 'production') globalForDb.db = db
