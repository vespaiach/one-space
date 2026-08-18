import { UserDirectory } from "@/components/users/user-directory";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listUsers } from "@/lib/db/queries/users";

export default async function UsersPage() {
  await requireSession();
  const users = await listUsers(db);
  return (
    <section>
      <h1>People</h1>
      <UserDirectory users={users} />
    </section>
  );
}