import { eq, sql } from "drizzle-orm";
import { createOpaqueToken, hashToken } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

type RegistrationInput = {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  now?: Date;
};

export async function registerInvitedUser(database: Database, input: RegistrationInput) {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`registration:${input.email}`}, 0))`,
    );
    const existing = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing.length > 0) return { status: "email-in-use" as const };

    const now = input.now ?? new Date();
    const [user] = await transaction
      .insert(users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        role: "member",
        status: "active",
        firstName: input.firstName,
        lastName: input.lastName,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Registration did not create a user");

    const token = createOpaqueToken();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    await transaction.insert(sessions).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
    });
    return { status: "registered" as const, userId: user.id, token, expiresAt };
  });
}