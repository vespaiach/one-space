"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateUser } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";
import { clearAuthenticationCookies, setForcedResetCookie, setSessionCookie } from "@/lib/auth/session";
import { readRuntimeConfig } from "@/lib/config/env";
import { decryptCredential } from "@/lib/crypto/credentials";
import { db } from "@/lib/db";
import { registerInvitedUser } from "@/lib/db/queries/registration";
import { revokeSession } from "@/lib/db/queries/sessions";
import { canonicalizeEmail, validatePassword } from "@/lib/validation/credentials";
import { normalizeName } from "@/lib/validation/profile";

export async function register(formData: FormData): Promise<void> {
  const flow = (await cookies()).get("invitation_flow")?.value;
  if (!flow) redirect("/register?invalid=true");
  const config = readRuntimeConfig();
  let email: string;
  try {
    const payload = decryptCredential(flow, "invitation", config.tokenEncryptionKey);
    const canonicalEmail = canonicalizeEmail(payload.email);
    if (!canonicalEmail.ok || canonicalEmail.value !== payload.email) throw new Error("Invalid email");
    email = canonicalEmail.value;
  } catch {
    redirect("/register?invalid=true");
  }

  const firstName = normalizeName(String(formData.get("firstName") ?? ""));
  const lastName = normalizeName(String(formData.get("lastName") ?? ""));
  const password = validatePassword(String(formData.get("password") ?? ""));
  const confirmation = String(formData.get("confirmPassword") ?? "");
  if (!firstName.ok || !lastName.ok || !password.ok || password.value !== confirmation) {
    redirect("/register?error=validation");
  }
  const result = await registerInvitedUser(db, {
    email,
    passwordHash: await hashPassword(password.value),
    firstName: firstName.value,
    lastName: lastName.value,
  });
  if (result.status !== "registered") {
    (await cookies()).delete("invitation_flow");
    redirect("/register?error=email-in-use");
  }
  await setSessionCookie(result.token, result.expiresAt);
  (await cookies()).delete("invitation_flow");
  redirect("/users?registered=true");
}

export async function login(formData: FormData): Promise<void> {
  const config = readRuntimeConfig();
  const requestHeaders = await headers();
  const source = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = await authenticateUser(db, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    rememberMe: formData.get("rememberMe") === "on",
    source,
    hashKey: config.rateLimitHashKey,
    maxAttempts: config.loginMaxAttempts,
    lockoutMinutes: config.loginLockoutMinutes,
  });
  await clearAuthenticationCookies();
  if (result.status === "authenticated") {
    await setSessionCookie(result.token, result.expiresAt);
    redirect("/users");
  }
  if (result.status === "forced-reset") {
    await setForcedResetCookie(result.token, result.expiresAt);
    redirect("/change-password");
  }
  const retryAt =
    "retryAt" in result && result.retryAt
      ? `&retryAt=${encodeURIComponent(result.retryAt.toISOString())}`
      : "";
  redirect(`/login?error=${result.status}${retryAt}`);
}

export async function logout(): Promise<void> {
  const token = (await cookies()).get("session")?.value;
  if (token) await revokeSession(db, token);
  await clearAuthenticationCookies();
  redirect("/login");
}