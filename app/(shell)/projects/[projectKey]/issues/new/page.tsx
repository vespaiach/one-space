import { notFound } from "next/navigation";
import { CreateIssueForm } from "@/components/projects/issues/create-issue-form";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listLabelsForProject } from "@/lib/db/queries/labels";
import { listCurrentProjectMembers } from "@/lib/db/queries/project-members";
import { getProjectAccessByKey } from "@/lib/db/queries/projects";

export default async function NewIssuePage({ params }: { params: Promise<{ projectKey: string }> }) {
  const session = await requireSession();
  const { projectKey } = await params;
  const project = await getProjectAccessByKey(db, session.userId, projectKey);
  if (!project) notFound();

  const [members, labels] = await Promise.all([
    listCurrentProjectMembers(db, project.id),
    listLabelsForProject(db, project.id),
  ]);

  return (
    <article>
      <h1>New issue</h1>
      <p>{project.name}</p>
      <CreateIssueForm
        projectKey={project.key}
        members={members}
        labels={labels}
      />
    </article>
  );
}