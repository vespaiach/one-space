import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { projectMemberships, projects, users } from "@/lib/db/schema";

export type ProjectMember = {
  userId: string;
  name: string;
  role: "admin" | "member";
};

export type ProjectMemberCandidate = ProjectMember & {
  state: "eligible" | "already_member" | "suspended";
};

export async function listCurrentProjectMembers(
  database: Database,
  projectId: string,
): Promise<ProjectMember[]> {
  const rows = await database
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(projectMemberships)
    .innerJoin(users, eq(projectMemberships.userId, users.id))
    .where(and(eq(projectMemberships.projectId, projectId), isNull(projectMemberships.removedAt)))
    .orderBy(asc(sql`lower(${users.firstName} || ' ' || ${users.lastName})`), asc(users.id));
  return rows.map((row) => ({
    userId: row.userId,
    name: `${row.firstName} ${row.lastName}`,
    role: row.role,
  }));
}

export async function listProjectMemberCandidates(
  database: Database,
  projectId: string,
): Promise<ProjectMemberCandidate[]> {
  const rows = await database
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      membershipId: projectMemberships.id,
    })
    .from(users)
    .leftJoin(
      projectMemberships,
      and(
        eq(projectMemberships.userId, users.id),
        eq(projectMemberships.projectId, projectId),
        isNull(projectMemberships.removedAt),
      ),
    )
    .orderBy(asc(sql`lower(${users.firstName} || ' ' || ${users.lastName})`), asc(users.id));
  return rows.map((row) => ({
    userId: row.userId,
    name: `${row.firstName} ${row.lastName}`,
    role: row.role,
    state: row.status === "suspended" ? "suspended" : row.membershipId ? "already_member" : "eligible",
  }));
}

export async function getMembershipManagementData(
  database: Database,
  projectKey: string,
  actorUserId: string,
) {
  const [actor] = await database
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  if (!actor || actor.role !== "admin" || actor.status !== "active") return null;

  const [project] = await database
    .select({
      id: projects.id,
      key: projects.key,
      name: projects.name,
      status: projects.status,
    })
    .from(projects)
    .where(eq(projects.key, projectKey))
    .limit(1);
  if (!project) return null;

  const [members, candidates] = await Promise.all([
    listCurrentProjectMembers(database, project.id),
    listProjectMemberCandidates(database, project.id),
  ]);
  const hasEligibleCandidates = candidates.some((candidate) => candidate.state === "eligible");
  return {
    project,
    members,
    candidates,
    hasEligibleCandidates,
    emptyState: hasEligibleCandidates
      ? null
      : "All active accounts are already members. Suspended accounts remain unavailable.",
  };
}