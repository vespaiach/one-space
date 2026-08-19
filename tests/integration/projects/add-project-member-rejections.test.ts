import { count, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { notifications, projectActivityEntries, projectMemberships, users } from "@/lib/db/schema";
import { addProjectMember as commitProjectMembership } from "@/lib/projects/add-project-member";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestCurrentMembership,
  createTestMember,
  createTestProject,
  createTestSuspendedUser,
} from "@/tests/helpers/project-members";

const sessionMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/session", () => ({ getCurrentSession: sessionMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let actionDatabase: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return actionDatabase;
  },
}));

const database = createTestDatabase();
const concurrentDatabase = createTestDatabase();

function formData(projectId: string, userId: string): FormData {
  const data = new FormData();
  data.set("projectId", projectId);
  data.set("userId", userId);
  return data;
}

async function sideEffectCount() {
  const [memberships] = await database.db.select({ value: count() }).from(projectMemberships);
  const [recipientNotifications] = await database.db.select({ value: count() }).from(notifications);
  const [activityEntries] = await database.db.select({ value: count() }).from(projectActivityEntries);
  return memberships.value + recipientNotifications.value + activityEntries.value;
}

describe("add Project member rejection matrix", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    actionDatabase = database.db;
    sessionMock.mockReset();
  });

  afterAll(async () => {
    await Promise.all([database.close(), concurrentDatabase.close()]);
  });

  it.each(["missing", "expired", "revoked"])(
    "rejects a %s current session without side effects",
    async () => {
      const actor = await createTestAdmin(database.db);
      const target = await createTestMember(database.db);
      const project = await createTestProject(database.db, actor.id);
      sessionMock.mockResolvedValue(null);
      const { addProjectMember } = await import("@/app/actions/project-members");

      await expect(
        addProjectMember({ status: "idle" }, formData(project.id, target.id)),
      ).resolves.toMatchObject({ status: "error", code: "unauthenticated" });
      expect(await sideEffectCount()).toBe(0);
    },
  );

  it("rejects a Member actor and malformed identifiers", async () => {
    const member = await createTestMember(database.db);
    sessionMock.mockResolvedValue({ userId: member.id, role: "member", status: "active" });
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(addProjectMember({ status: "idle" }, formData("invalid", "invalid"))).resolves.toMatchObject(
      { status: "error", code: "forbidden" },
    );
    sessionMock.mockResolvedValue({ userId: member.id, role: "admin", status: "active" });
    await expect(addProjectMember({ status: "idle" }, formData("invalid", "invalid"))).resolves.toMatchObject(
      { status: "error", code: "invalid_input" },
    );
    expect(await sideEffectCount()).toBe(0);
  });

  it("returns bounded outcomes for unknown Project, unknown user, suspended user, and duplicate", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const suspended = await createTestSuspendedUser(database.db);
    const project = await createTestProject(database.db, actor.id);
    const unknownProjectId = "0198c532-1e16-7f2a-a3b4-31a034e98980";
    const unknownUserId = "0198c532-1e16-7f2a-a3b4-31a034e98981";

    await expect(
      commitProjectMembership(database.db, {
        actorUserId: actor.id,
        projectId: unknownProjectId,
        userId: target.id,
      }),
    ).resolves.toEqual({ status: "error", code: "project_not_found" });
    await expect(
      commitProjectMembership(database.db, {
        actorUserId: actor.id,
        projectId: project.id,
        userId: unknownUserId,
      }),
    ).resolves.toEqual({ status: "error", code: "user_not_found" });
    await expect(
      commitProjectMembership(database.db, {
        actorUserId: actor.id,
        projectId: project.id,
        userId: suspended.id,
      }),
    ).resolves.toEqual({ status: "error", code: "user_ineligible" });

    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: target.id,
      addedByUserId: actor.id,
    });
    await expect(
      commitProjectMembership(database.db, {
        actorUserId: actor.id,
        projectId: project.id,
        userId: target.id,
      }),
    ).resolves.toEqual({ status: "error", code: "already_member" });
  });

  it("detects eligibility that becomes stale before the membership write", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);

    const result = await commitProjectMembership(
      database.db,
      { actorUserId: actor.id, projectId: project.id, userId: target.id },
      {
        beforeMembershipInsert: async () => {
          await concurrentDatabase.db
            .update(users)
            .set({ status: "suspended" })
            .where(eq(users.id, target.id));
        },
      },
    );

    expect(result).toEqual({ status: "error", code: "conflict" });
    expect(await sideEffectCount()).toBe(0);
  });

  it("returns unexpected and rolls back an injected transaction failure", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);

    await expect(
      commitProjectMembership(
        database.db,
        { actorUserId: actor.id, projectId: project.id, userId: target.id },
        { failurePoint: "notification" },
      ),
    ).resolves.toEqual({ status: "error", code: "unexpected" });
    expect(await sideEffectCount()).toBe(0);
  });
});
