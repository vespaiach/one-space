import { notFound, redirect } from "next/navigation";
import { ProfileEditor } from "@/components/users/profile-editor";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { findUserById } from "@/lib/db/queries/users";

export default async function EditProfilePage({
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
  const authorized =
    user.status === "active" &&
    ((session.userId === user.id && user.role === "member") ||
      (session.role === "admin" && user.role === "member"));
  if (!authorized) redirect(`/users/${id}`);
  const query = await searchParams;
  return (
    <section>
      <h1>Edit profile</h1>
      <ProfileEditor
        user={user}
        error={typeof query.error === "string" ? query.error : undefined}
        field={typeof query.field === "string" ? query.field : undefined}
      />
    </section>
  );
}