"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { createConfiguredSmtpAdapter } from "@/lib/email/smtp";
import { sendInvitationForAdmin } from "@/lib/invitations/service";

export async function sendInvitation(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const config = readRuntimeConfig();
  const result = await sendInvitationForAdmin(db, {
    actorId: admin.userId,
    email: String(formData.get("email") ?? ""),
    hashKey: config.rateLimitHashKey,
    tokenKey: config.tokenEncryptionKey,
    appOrigin: config.appOrigin,
    send: createConfiguredSmtpAdapter(config.smtp).send,
  });
  redirect(`/admin/invitations?result=${encodeURIComponent(result.status)}`);
}