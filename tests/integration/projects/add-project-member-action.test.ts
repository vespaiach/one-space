import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addProjectMember } from "@/lib/projects/add-project-member";
import {
  notifications,
  projectActivityEntries,
  projectMemberships,
} from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestArchivedProject,
  createTestHistoricalMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const database = createTestDatabase();

async function countCommittedRecords(projectId: string, userId: string) {
  const memberships = await database.db
    .select()
    .from(projectMemberships)
    .where(
      and(
        eq(projectMemberships.projectId, projectId),
        eq(projectMemberships.userId, userId),
        isNull(projectMemberships.removedAt),
      ),
    );
  const recipientNotifications = await database.db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId));
  const activityEntries = await database.db
    .select()
    .from(projectActivityEntries)
    .where(eq(projectActivityEntries.projectId, projectId));
  return {
    memberships: memberships.length,
    notifications: recipientNotifications.length,
    activityEntries: activityEntries.length,
  };
}

describe("addProjectMember transaction", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it.each([
    { label: "active Member", targetRole: "member" as const, archived: false, self: false },
    { label: "active Admin", targetRole: "admin" as const, archived: false, self: false },
    { label: "acting Admin", targetRole: "admin" as const, archived: false, self: true },
    { label: "archived Project member", targetRole: "member" as const, archived: true, self: false },
  ])("atomically adds an eligible $label", async ({ targetRole, archived, self }) => {
    const actor = await createTestAdmin(database.db);
    const target = self
      ? actor
      : targetRole === "admin"
        ? await createTestAdmin(database.db, {
            email: "other-admin@example.com",
            firstName: "Other",
          })
        : await createTestMember(database.db);
    const project = archived
      ? await createTestArchivedProject(database.db, actor.id)
      : await createTestProject(database.db, actor.id);

    const result = await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: target.id,
    });

    expect(result).toMatchObject({
      status: "success",
      projectName: project.name,
      projectKey: project.key,
      userName: `${target.firstName} ${target.lastName}`,
    });
    expect(await countCommittedRecords(project.id, target.id)).toEqual({
      memberships: 1,
      notifications: 1,
      activityEntries: 1,
    });
  });

  it.each(["membership", "notification", "activity"] as const)(
    "rolls back all records after an injected %s write failure",
    async (failurePoint) => {
      const actor = await createTestAdmin(database.db);
      const target = await createTestMember(database.db);
      const project = await createTestProject(database.db, actor.id);

      const result = await addProjectMember(
        database.db,
        { actorUserId: actor.id, projectId: project.id, userId: target.id },
        { failurePoint },
      );

      expect(result).toMatchObject({ status: "error", code: "unexpected" });
      expect(await countCommittedRecords(project.id, target.id)).toEqual({
        memberships: 0,
        notifications: 0,
        activityEntries: 0,
      });
    },
  );

  it("creates a new side-effect set when a removed user is re-added", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);
    await createTestHistoricalMembership(database.db, {
      addedByUserId: actor.id,
      projectId: project.id,
      userId: target.id,
    });

    const result = await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: target.id,
    });

    expect(result.status).toBe("success");
    const membershipPeriods = await database.db
      .select()
      .from(projectMemberships)
      .where(
        and(eq(projectMemberships.projectId, project.id), eq(projectMemberships.userId, target.id)),
      );
    expect(membershipPeriods).toHaveLength(2);
    expect(await countCommittedRecords(project.id, target.id)).toEqual({
      memberships: 1,
      notifications: 1,
      activityEntries: 1,
    });
  });
});
