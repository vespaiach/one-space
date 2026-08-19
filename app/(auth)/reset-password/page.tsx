import { cookies } from "next/headers";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { readRuntimeConfig } from "@/lib/config/env";
import { db } from "@/lib/db";
import { validatePasswordResetIntake } from "@/lib/password-reset/service";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = (await cookies()).get("password_reset_flow")?.value;
  const intake = token
    ? await validatePasswordResetIntake(db, token, readRuntimeConfig().tokenEncryptionKey)
    : null;
  const mode = query.invalid === "true" ? "invalid" : intake?.status === "valid" ? "complete" : "request";
  const requested = query.requested === "true";
  const heading =
    mode === "invalid"
      ? "Link invalid"
      : mode === "complete"
        ? "Set a new password"
        : requested
          ? "Check your email"
          : "Reset your password";
  const subheading =
    mode === "invalid"
      ? undefined
      : mode === "complete"
        ? "Choose a new password for your account."
        : requested
          ? undefined
          : "Enter the email for your account and we'll send you a link to set a new password.";
  return (
    <AuthCard
      heading={heading}
      subheading={subheading}>
      <PasswordResetForm
        mode={mode}
        requested={requested}
        error={typeof query.error === "string" ? query.error : undefined}
      />
    </AuthCard>
  );
}