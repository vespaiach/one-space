import { count, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { notifications, projectActivityEntries, projectMemberships } from "@/lib/db/schema";
import { addProjectMember } from "@/lib/projects/add-project-member";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestHistoricalMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const firstDatabase = createTestDatabase();
const secondDatabase = createTestDatabase();

function synchronizedBarrier() {
  let arrivals = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait: async () => {
      arrivals += 1;
      if (arrivals === 2) release?.();
      await released;
    },
    arrivals: () => arrivals,
  };
}

async function cardinality(projectId: string, userId: string) {
  const [memberships] = await firstDatabase.db
    .select({ value: count() })
    .from(projectMemberships)
    .where(eq(projectMemberships.userId, userId));
  const [recipientNotifications] = await firstDatabase.db
    .select({ value: count() })
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId));
  const [activityEntries] = await firstDatabase.db
    .select({ value: count() })
    .from(projectActivityEntries)
    .where(eq(projectActivityEntries.projectId, projectId));
  return [memberships.value, recipientNotifications.value, activityEntries.value];
}

describe("add Project member concurrency", () => {
  beforeEach(async () => {
    await truncateFeatureTables(firstDatabase.client);
  });

  afterAll(async () => {
    await Promise.all([firstDatabase.close(), secondDatabase.close()]);
  });

  it("allows one winner across 20 synchronized duplicate pairs", async () => {
    for (let index = 0; index < 20; index += 1) {
      await truncateFeatureTables(firstDatabase.client);
      const actor = await createTestAdmin(firstDatabase.db, {
        email: `admin-${index}@example.com`,
      });
      const target = await createTestMember(firstDatabase.db, {
        email: `member-${index}@example.com`,
      });
      const project = await createTestProject(firstDatabase.db, actor.id, {
        key: `P${index.toString().padStart(2, "0")}`,
      });
      const barrier = synchronizedBarrier();
      const input = { actorUserId: actor.id, projectId: project.id, userId: target.id };

      const results = await Promise.all([
        addProjectMember(firstDatabase.db, input, { beforeMembershipInsert: barrier.wait }),
        addProjectMember(secondDatabase.db, input, { beforeMembershipInsert: barrier.wait }),
      ]);

      expect(barrier.arrivals()).toBe(2);
      expect(results.map((result) => (result.status === "success" ? "success" : result.code)).sort()).toEqual([
        "already_member",
        "success",
      ]);
      expect(await cardinality(project.id, target.id)).toEqual([1, 1, 1]);
    }
  });

  it("keeps exact cardinality across 20 repeats after success", async () => {
    const actor = await createTestAdmin(firstDatabase.db);
    const target = await createTestMember(firstDatabase.db);
    const project = await createTestProject(firstDatabase.db, actor.id);
    const input = { actorUserId: actor.id, projectId: project.id, userId: target.id };
    await addProjectMember(firstDatabase.db, input);

    const repeats = await Promise.all(
      Array.from({ length: 20 }, () => addProjectMember(secondDatabase.db, input)),
    );

    expect(repeats.every((result) => result.status === "error" && result.code === "already_member")).toBe(
      true,
    );
    expect(await cardinality(project.id, target.id)).toEqual([1, 1, 1]);
  });

  it("creates one new side-effect set after removal and re-add", async () => {
    const actor = await createTestAdmin(firstDatabase.db);
    const target = await createTestMember(firstDatabase.db);
    const project = await createTestProject(firstDatabase.db, actor.id);
    await createTestHistoricalMembership(firstDatabase.db, {
      projectId: project.id,
      userId: target.id,
      addedByUserId: actor.id,
    });

    await expect(
      addProjectMember(firstDatabase.db, {
        actorUserId: actor.id,
        projectId: project.id,
        userId: target.id,
      }),
    ).resolves.toMatchObject({ status: "success" });
    expect(await cardinality(project.id, target.id)).toEqual([2, 1, 1]);
  });
});
