import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusMessage } from "@/components/ui/status-message";
import { MemberManagementControls } from "@/components/users/member-management-controls";
import { UserProfile } from "@/components/users/user-profile";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { findUserById } from "@/lib/db/queries/users";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const user = await findUserById(db, id);
  if (!user) notFound();
  const query = await searchParams;
  const canEdit =
    user.status === "active" &&
    ((session.userId === user.id && user.role === "member") ||
      (session.role === "admin" && user.role === "member"));
  return (
    <section>
      {query.result === "conflict" ? (
        <StatusMessage tone="warning">
          The account changed before this action completed. Refresh and review its current state.
        </StatusMessage>
      ) : query.result ? (
        <StatusMessage tone="success">The account change was committed successfully.</StatusMessage>
      ) : query.updated === "true" ? (
        <StatusMessage tone="success">The profile was updated successfully.</StatusMessage>
      ) : null}
      <UserProfile user={user} />
      {canEdit ? <Link href={`/users/${user.id}/edit`}>Edit profile</Link> : null}
      {session.role === "admin" && user.role === "member" ? <MemberManagementControls user={user} /> : null}
    </section>
  );
}