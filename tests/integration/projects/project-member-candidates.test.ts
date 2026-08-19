import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getMembershipManagementData } from "@/lib/db/queries/project-members";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestCurrentMembership,
  createTestMember,
  createTestProject,
  createTestSuspendedUser,
} from "@/tests/helpers/project-members";

const database = createTestDatabase();

describe("Project member candidates", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("returns minimal deterministic eligible, already-member, and suspended states", async () => {
    const actor = await createTestAdmin(database.db, { firstName: "Avery", lastName: "Admin" });
    const existing = await createTestMember(database.db, {
      email: "existing@example.com",
      firstName: "Blair",
      lastName: "Member",
    });
    await createTestMember(database.db, {
      email: "eligible@example.com",
      firstName: "Casey",
      lastName: "Member",
    });
    await createTestSuspendedUser(database.db, {
      email: "suspended@example.com",
      firstName: "Devon",
      lastName: "Member",
    });
    const project = await createTestProject(database.db, actor.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: existing.id,
      addedByUserId: actor.id,
    });

    const result = await getMembershipManagementData(database.db, project.key, actor.id);

    expect(result?.candidates.map(({ name, role, state }) => ({ name, role, state }))).toEqual([
      { name: "Avery Admin", role: "admin", state: "eligible" },
      { name: "Blair Member", role: "member", state: "already_member" },
      { name: "Casey Member", role: "member", state: "eligible" },
      { name: "Devon Member", role: "member", state: "suspended" },
    ]);
    expect(Object.keys(result?.candidates[0] ?? {}).sort()).toEqual(["name", "role", "state", "userId"]);
    expect(JSON.stringify(result)).not.toContain("@example.com");
  });

  it("returns an explanatory state when every active account is assigned", async () => {
    const actor = await createTestAdmin(database.db);
    const member = await createTestMember(database.db);
    await createTestSuspendedUser(database.db);
    const project = await createTestProject(database.db, actor.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: actor.id,
      addedByUserId: actor.id,
    });
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: member.id,
      addedByUserId: actor.id,
    });

    await expect(getMembershipManagementData(database.db, project.key, actor.id)).resolves.toMatchObject({
      hasEligibleCandidates: false,
      emptyState: "All active accounts are already members. Suspended accounts remain unavailable.",
    });
  });

  it("returns no protected candidate data to a non-Admin actor", async () => {
    const actor = await createTestAdmin(database.db);
    const member = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);

    await expect(getMembershipManagementData(database.db, project.key, member.id)).resolves.toBeNull();
  });
});
