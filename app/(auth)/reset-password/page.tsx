import { cookies } from "next/headers";
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
  return (
    <section>
      <h1>Reset password</h1>
      <PasswordResetForm
        mode={mode}
        requested={query.requested === "true"}
        error={typeof query.error === "string" ? query.error : undefined}
      />
    </section>
  );
}