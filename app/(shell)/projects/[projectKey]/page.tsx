import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getProjectAccessByKey } from "@/lib/db/queries/projects";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const { projectKey } = await params;
  const project = await getProjectAccessByKey(db, session.userId, projectKey);
  if (!project) notFound();

  const query = await searchParams;
  const assigneeCleared = query.assigneeCleared === "1";

  return (
    <article>
      <h1>{project.name}</h1>
      <p>{project.status === "archived" ? "Archived · Read-only" : "Active"}</p>
      <p>{project.description}</p>
      {assigneeCleared ? (
        <p>
          The selected assignee was no longer a member of this project, so the issue was created unassigned.
        </p>
      ) : null}
      <Link href={`/projects/${project.key}/issues/new`}>New issue</Link>
    </article>
  );
}