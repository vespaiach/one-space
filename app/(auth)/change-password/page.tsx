import { redirect } from "next/navigation";
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
    <section>
      <h1>Change your password</h1>
      <ForcedPasswordForm error={typeof query.error === "string" ? query.error : undefined} />
    </section>
  );
}