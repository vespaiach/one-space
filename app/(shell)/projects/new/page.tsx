import { asc, ne } from "drizzle-orm";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function NewProjectPage() {
  const admin = await requireAdmin();

  const availableUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(ne(users.id, admin.userId))
    .orderBy(asc(users.firstName), asc(users.lastName));

  const pickerUsers = availableUsers.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim(),
    email: u.email,
  }));

  return (
    <main>
      <h1>New Project</h1>
      <CreateProjectForm availableUsers={pickerUsers} />
    </main>
  );
}