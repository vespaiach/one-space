import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { notifications, projectActivityEntries, projectMemberships, projects, users } from "@/lib/db/schema";

export type AddProjectMemberErrorCode =
  | "conflict"
  | "project_not_found"
  | "user_not_found"
  | "user_ineligible"
  | "already_member"
  | "unexpected";

export type AddProjectMemberResult =
  | {
      status: "success";
      membershipId: string;
      projectKey: string;
      projectName: string;
      userName: string;
    }
  | { status: "error"; code: AddProjectMemberErrorCode };

type AddProjectMemberInput = {
  actorUserId: string;
  projectId: string;
  userId: string;
};

type AddProjectMemberOptions = {
  failurePoint?: "membership" | "notification" | "activity";
  beforeMembershipInsert?: () => Promise<void>;
};

function isActiveMembershipConflict(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") return false;
    const databaseError = current as { code?: unknown; cause?: unknown };
    if (databaseError.code === "23505") return true;
    current = databaseError.cause;
  }
  return false;
}

function injectFailure(
  currentPoint: AddProjectMemberOptions["failurePoint"],
  expectedPoint: NonNullable<AddProjectMemberOptions["failurePoint"]>,
): void {
  if (currentPoint === expectedPoint) throw new Error(`injected_${expectedPoint}_failure`);
}

export async function addProjectMember(
  database: Database,
  input: AddProjectMemberInput,
  options: AddProjectMemberOptions = {},
): Promise<AddProjectMemberResult> {
  try {
    return await database.transaction(async (transaction) => {
      const [actor] = await transaction
        .select({ role: users.role, status: users.status })
        .from(users)
        .where(eq(users.id, input.actorUserId))
        .limit(1);
      if (!actor || actor.role !== "admin" || actor.status !== "active") {
        return { status: "error", code: "conflict" };
      }

      const [project] = await transaction
        .select({ id: projects.id, key: projects.key, name: projects.name })
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);
      if (!project) return { status: "error", code: "project_not_found" };

      const [target] = await transaction
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!target) return { status: "error", code: "user_not_found" };
      if (target.status !== "active") return { status: "error", code: "user_ineligible" };

      const [activeMembership] = await transaction
        .select({ id: projectMemberships.id })
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.projectId, project.id),
            eq(projectMemberships.userId, target.id),
            isNull(projectMemberships.removedAt),
          ),
        )
        .limit(1);
      if (activeMembership) return { status: "error", code: "already_member" };

      await options.beforeMembershipInsert?.();

      const [currentActor] = await transaction
        .select({ role: users.role, status: users.status })
        .from(users)
        .where(eq(users.id, input.actorUserId))
        .limit(1);
      if (!currentActor || currentActor.role !== "admin" || currentActor.status !== "active") {
        return { status: "error", code: "conflict" };
      }

      const [currentTarget] = await transaction
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, target.id))
        .limit(1);
      if (!currentTarget || currentTarget.status !== "active") {
        return { status: "error", code: "conflict" };
      }

      const [currentProject] = await transaction
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, project.id))
        .limit(1);
      if (!currentProject) return { status: "error", code: "project_not_found" };

      const [currentMembership] = await transaction
        .select({ id: projectMemberships.id })
        .from(projectMemberships)
        .where(
          and(
            eq(projectMemberships.projectId, project.id),
            eq(projectMemberships.userId, target.id),
            isNull(projectMemberships.removedAt),
          ),
        )
        .limit(1);
      if (currentMembership) return { status: "error", code: "already_member" };

      const [membership] = await transaction
        .insert(projectMemberships)
        .values({
          projectId: project.id,
          userId: target.id,
          addedByUserId: input.actorUserId,
        })
        .returning({ id: projectMemberships.id });
      injectFailure(options.failurePoint, "membership");

      await transaction.insert(notifications).values({
        recipientUserId: target.id,
        actorUserId: input.actorUserId,
        kind: "project_member_added",
        projectId: project.id,
        projectMembershipId: membership.id,
      });
      injectFailure(options.failurePoint, "notification");

      await transaction.insert(projectActivityEntries).values({
        projectId: project.id,
        actorUserId: input.actorUserId,
        eventType: "member_added",
        subjectUserId: target.id,
        projectMembershipId: membership.id,
      });
      injectFailure(options.failurePoint, "activity");

      return {
        status: "success",
        membershipId: membership.id,
        projectKey: project.key,
        projectName: project.name,
        userName: `${target.firstName} ${target.lastName}`,
      };
    });
  } catch (error) {
    return isActiveMembershipConflict(error)
      ? { status: "error", code: "already_member" }
      : { status: "error", code: "unexpected" };
  }
}