import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getProjectAccessByKey } from "@/lib/db/queries/projects";

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const session = await requireSession();
  const { projectKey } = await params;
  const project = await getProjectAccessByKey(db, session.userId, projectKey);
  if (!project) notFound();

  return (
    <article>
      <h1>{project.name}</h1>
      <p>{project.status === "archived" ? "Archived · Read-only" : "Active"}</p>
      <p>{project.description}</p>
    </article>
  );
}