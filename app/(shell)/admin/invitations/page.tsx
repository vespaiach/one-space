import { InvitationForm } from "@/components/auth/invitation-form";
import { requireAdminOrForbidden } from "@/lib/auth/guards";
import { getEmailCapability } from "@/lib/email/smtp";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminOrForbidden();
  const { result } = await searchParams;
  return (
    <section>
      <h1>Invite a member</h1>
      <InvitationForm
        emailCapability={getEmailCapability()}
        result={typeof result === "string" ? result : undefined}
      />
    </section>
  );
}