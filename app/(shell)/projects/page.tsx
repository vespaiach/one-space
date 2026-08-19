import Link from "next/link";
import { requireSession } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listProjectsForUser } from "@/lib/db/queries/projects";

export default async function ProjectsPage() {
  const session = await requireSession();
  const projects = await listProjectsForUser(db, session.userId);
  return (
    <section>
      <h1>Projects</h1>
      {projects.length === 0 ? (
        <p>No Projects are available.</p>
      ) : (
        <ul>
          {projects.map((project) => (
            <li key={project.id}>
              <Link href={`/projects/${project.key}`}>{project.name}</Link>
              {project.status === "archived" ? " · Archived · Read-only" : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}