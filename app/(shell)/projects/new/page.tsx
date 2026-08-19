import { CreateProjectForm } from "@/components/projects/create-project-form";
import { requireAdmin } from "@/lib/auth/guards";

export default async function NewProjectPage() {
  await requireAdmin();
  return (
    <main>
      <h1>New Project</h1>
      <CreateProjectForm />
    </main>
  );
}