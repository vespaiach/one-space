import { eq } from "drizzle-orm";
import type { Options } from "nodemailer/lib/mailer";
import { createEncryptedCredential } from "@/lib/crypto/credentials";
import type { Database } from "@/lib/db";
import { auditEvents, users } from "@/lib/db/schema";
import { createInvitationMessage } from "@/lib/email/messages";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { canonicalizeEmail } from "@/lib/validation/credentials";

export const INVITATION_NON_REVOCATION_WARNING =
  "Resending does not invalidate earlier links. Each authentic link remains usable until its seven-day expiry or registration of the canonical email.";

type SendInvitationInput = {
  actorId: string;
  email: string;
  hashKey: string;
  tokenKey: Buffer;
  appOrigin: string;
  now?: Date;
  send: (message: Options) => Promise<{ status: "accepted" | "rejected" | "failed" }>;
};

export async function sendInvitationForAdmin(database: Database, input: SendInvitationInput) {
  const emailResult = canonicalizeEmail(input.email);
  if (!emailResult.ok) return { status: "invalid-email" as const };
  const now = input.now ?? new Date();
  const [actorLimit, recipientLimit] = await Promise.all([
    checkRateLimit(database, { scope: "invite_actor", key: input.actorId, hashKey: input.hashKey, now }),
    checkRateLimit(database, {
      scope: "invite_recipient",
      key: emailResult.value,
      hashKey: input.hashKey,
      now,
    }),
  ]);
  if (!actorLimit.allowed || !recipientLimit.allowed) return { status: "rate-limited" as const };

  const existing = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, emailResult.value))
    .limit(1);
  if (existing.length > 0) return { status: "ineligible" as const };

  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const token = createEncryptedCredential(
    { purpose: "invitation", issuedAt: now, expiresAt, email: emailResult.value },
    input.tokenKey,
  );
  const url = new URL("/auth/invitation", input.appOrigin);
  url.searchParams.set("token", token);
  const delivery = await input.send(createInvitationMessage(emailResult.value, url.toString()));
  await database.insert(auditEvents).values({
    category: "operations",
    action: "email.invitation",
    outcome: delivery.status === "accepted" ? "succeeded" : "degraded",
    actorId: input.actorId,
    reasonCode: delivery.status === "accepted" ? undefined : "delivery_failed",
    occurredAt: now,
  });
  return delivery.status === "accepted"
    ? { status: "sent" as const, warning: INVITATION_NON_REVOCATION_WARNING }
    : { status: "delivery-failed" as const };
}