"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireForcedReset } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { clearAuthenticationCookies } from "@/lib/auth/session";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { completeForcedReset } from "@/lib/db/queries/passwords";
import { createConfiguredSmtpAdapter } from "@/lib/email/smtp";
import {
  completePasswordResetWithCredential,
  requestPasswordResetForEmail,
} from "@/lib/password-reset/service";
import { validatePassword } from "@/lib/validation/credentials";

export async function completeForcedPasswordReset(formData: FormData): Promise<void> {
  await requireForcedReset();
  const password = validatePassword(String(formData.get("password") ?? ""));
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (!password.ok || password.value !== confirmation) redirect("/change-password?error=validation");
  const token = (await cookies()).get("forced_reset")?.value;
  if (!token) redirect("/login?forcedResetExpired=true");
  const result = await completeForcedReset(db, token, await hashPassword(password.value));
  await clearAuthenticationCookies();
  if (result.status !== "changed") redirect("/login?forcedResetExpired=true");
  redirect("/login?passwordChanged=true");
}

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const config = readRuntimeConfig();
  const requestHeaders = await headers();
  const source = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  await requestPasswordResetForEmail(db, {
    email: String(formData.get("email") ?? ""),
    source,
    hashKey: config.rateLimitHashKey,
    tokenKey: config.tokenEncryptionKey,
    appOrigin: config.appOrigin,
    send: createConfiguredSmtpAdapter(config.smtp).send,
  });
  redirect("/reset-password?requested=true");
}

export async function completePasswordReset(formData: FormData): Promise<void> {
  const password = validatePassword(String(formData.get("password") ?? ""));
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (!password.ok || password.value !== confirmation) redirect("/reset-password?error=validation");
  const token = (await cookies()).get("password_reset_flow")?.value;
  if (!token) redirect("/reset-password?invalid=true");
  const config = readRuntimeConfig();
  const result = await completePasswordResetWithCredential(
    db,
    token,
    config.tokenEncryptionKey,
    await hashPassword(password.value),
  );
  await clearAuthenticationCookies();
  if (result.status !== "changed") redirect("/reset-password?invalid=true");
  redirect("/login?reset=true");
}