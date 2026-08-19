import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ForcedPasswordForm } from "@/components/auth/forced-password-form";
import { getCurrentForcedReset } from "@/lib/auth/session";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await getCurrentForcedReset())) redirect("/login?forcedResetExpired=true");
  const query = await searchParams;
  return (
    <AuthCard
      heading="Change your password"
      subheading="Choose a new password to finish signing in.">
      <ForcedPasswordForm error={typeof query.error === "string" ? query.error : undefined} />
    </AuthCard>
  );
}