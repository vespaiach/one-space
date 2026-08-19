import { cookies } from "next/headers";
import { AuthCard } from "@/components/auth/auth-card";
import { RegistrationForm } from "@/components/auth/registration-form";
import { readRuntimeConfig } from "@/lib/config/env";
import { decryptCredential } from "@/lib/crypto/credentials";
import { canonicalizeEmail } from "@/lib/validation/credentials";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const flow = (await cookies()).get("invitation_flow")?.value;
  let email: string | undefined;
  if (flow) {
    try {
      const payload = decryptCredential(flow, "invitation", readRuntimeConfig().tokenEncryptionKey);
      const canonical = canonicalizeEmail(payload.email);
      if (canonical.ok && canonical.value === payload.email) email = canonical.value;
    } catch {
      email = undefined;
    }
  }
  const invalid = !email || query.invalid === "true";
  return (
    <AuthCard
      heading={invalid ? "Invitation invalid" : "Create your account"}
      subheading={invalid ? undefined : "Just a few details to finish."}>
      <RegistrationForm
        email={email}
        invalid={invalid}
        error={typeof query.error === "string" ? query.error : undefined}
      />
    </AuthCard>
  );
}