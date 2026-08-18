import { eq } from "drizzle-orm";
import { decryptCredential } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { canonicalizeEmail } from "@/lib/validation/credentials";

type InvitationIntakeInput = {
  token: string;
  tokenKey: Buffer;
  hashKey: string;
  source: string;
  now?: Date;
};

export async function processInvitationIntake(database: Database, input: InvitationIntakeInput) {
  const now = input.now ?? new Date();
  try {
    const payload = decryptCredential(input.token, "invitation", input.tokenKey, now);
    const email = canonicalizeEmail(payload.email);
    if (!email.ok || email.value !== payload.email) throw new Error("Invalid canonical email");
    const existing = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.value))
      .limit(1);
    if (existing.length > 0) return { status: "invalid" as const };
    return { status: "valid" as const, email: email.value, expiresAt: payload.expiresAt };
  } catch {
    await checkRateLimit(database, {
      scope: "token_validation_source",
      key: input.source,
      hashKey: input.hashKey,
      now,
    });
    return { status: "invalid" as const };
  }
}