import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { listSidebarProjectsForUser } from "@/lib/db/queries/projects";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import { createTestIssue } from "@/tests/helpers/issues";
import {
  createTestAdmin,
  createTestCurrentMembership,
  createTestHistoricalMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const database = createTestDatabase();

describe("Sidebar project list", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("shows only the current user's projects, with color and live issue count", async () => {
    const admin = await createTestAdmin(database.db);
    const member = await createTestMember(database.db);
    const ownProject = await createTestProject(database.db, admin.id, {
      key: "OWNED",
      name: "Owned Project",
      color: "oklch(0.6 0.1 50)",
    });
    const otherProject = await createTestProject(database.db, admin.id, {
      key: "OTHER",
      name: "Other Project",
      color: "oklch(0.5 0.1 200)",
    });
    await createTestCurrentMembership(database.db, {
      projectId: ownProject.id,
      userId: member.id,
      addedByUserId: admin.id,
    });
    await createTestIssue(database.db, ownProject.id, admin.id);
    await createTestIssue(database.db, ownProject.id, admin.id);
    await createTestIssue(database.db, otherProject.id, admin.id);

    await expect(listSidebarProjectsForUser(database.db, member.id)).resolves.toEqual([
      { key: "OWNED", name: "Owned Project", color: "oklch(0.6 0.1 50)", issueCount: 2 },
    ]);
  });

  it("returns zero issue count for a project with no issues", async () => {
    const admin = await createTestAdmin(database.db);
    const member = await createTestMember(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: member.id,
      addedByUserId: admin.id,
    });

    await expect(listSidebarProjectsForUser(database.db, member.id)).resolves.toEqual([
      expect.objectContaining({ key: project.key, issueCount: 0 }),
    ]);
  });

  it("excludes projects the user has no active membership for", async () => {
    const admin = await createTestAdmin(database.db);
    const historicalMember = await createTestMember(database.db);
    const nonMember = await createTestMember(database.db, { email: "sidebar-non-member@example.com" });
    const project = await createTestProject(database.db, admin.id);
    await createTestHistoricalMembership(database.db, {
      projectId: project.id,
      userId: historicalMember.id,
      addedByUserId: admin.id,
    });

    await expect(listSidebarProjectsForUser(database.db, historicalMember.id)).resolves.toEqual([]);
    await expect(listSidebarProjectsForUser(database.db, nonMember.id)).resolves.toEqual([]);
  });
});
