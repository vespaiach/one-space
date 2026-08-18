import { and, count, eq, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import type { Database } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { canonicalizeEmail, validatePassword } from "@/lib/validation/credentials";
import { normalizeName } from "@/lib/validation/profile";

export type InitialAdminConfig = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

export async function ensureInitialAdmin(
  database: Database,
  config: InitialAdminConfig | null,
): Promise<void> {
  await database.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(714001)`);
    const [totalResult] = await transaction.select({ value: count() }).from(users);
    const activeAdmin = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active")))
      .limit(1);
    if (activeAdmin.length > 0) return;
    if (Number(totalResult?.value ?? 0) > 0) {
      throw new Error("Recovery required: existing data has no active Admin");
    }
    if (!config) throw new Error("Initial Admin configuration is required for an empty database");

    const email = canonicalizeEmail(config.email);
    const firstName = normalizeName(config.firstName);
    const lastName = normalizeName(config.lastName);
    const password = validatePassword(config.password);
    if (!email.ok || !firstName.ok || !lastName.ok || !password.ok) {
      throw new Error("Initial Admin configuration is invalid");
    }
    const passwordHash = await hashPassword(password.value);
    await transaction.insert(users).values({
      email: email.value,
      passwordHash,
      role: "admin",
      status: "active",
      firstName: firstName.value,
      lastName: lastName.value,
    });
  });
}