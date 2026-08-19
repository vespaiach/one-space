import { and, asc, eq, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { projectMemberships, projects } from "@/lib/db/schema";

export type AccessibleProject = {
  id: string;
  key: string;
  name: string;
  description: string;
  status: "active" | "archived";
  access: "member" | "read_only";
  canEdit: boolean;
};

function mapProjectAccess(row: Omit<AccessibleProject, "access" | "canEdit">): AccessibleProject {
  const canEdit = row.status === "active";
  return { ...row, access: canEdit ? "member" : "read_only", canEdit };
}

export async function listProjectsForUser(database: Database, userId: string): Promise<AccessibleProject[]> {
  const rows = await database
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      status: projects.status,
    })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .where(and(eq(projectMemberships.userId, userId), isNull(projectMemberships.removedAt)))
    .orderBy(asc(projects.name), asc(projects.id));
  return rows.map(mapProjectAccess);
}

export async function getProjectAccessByKey(
  database: Database,
  userId: string,
  projectKey: string,
): Promise<AccessibleProject | null> {
  const [row] = await database
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      description: projects.description,
      status: projects.status,
    })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .where(
      and(
        eq(projectMemberships.userId, userId),
        isNull(projectMemberships.removedAt),
        eq(projects.key, projectKey),
      ),
    )
    .limit(1);
  return row ? mapProjectAccess(row) : null;
}