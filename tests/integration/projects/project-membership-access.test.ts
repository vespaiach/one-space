import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getProjectAccessByKey,
  listProjectsForUser,
} from "@/lib/db/queries/projects";
import { listCurrentProjectMembers } from "@/lib/db/queries/project-members";
import { projects } from "@/lib/db/schema";
import { addProjectMember } from "@/lib/projects/add-project-member";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestHistoricalMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const database = createTestDatabase();

describe("Project membership access reads", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("makes a successful membership immediately visible in the roster and Project list", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);

    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: target.id,
    });

    await expect(listCurrentProjectMembers(database.db, project.id)).resolves.toEqual([
      expect.objectContaining({ userId: target.id, name: "Project Member", role: "member" }),
    ]);
    await expect(listProjectsForUser(database.db, target.id)).resolves.toEqual([
      expect.objectContaining({ id: project.id, key: project.key, access: "member" }),
    ]);
  });

  it("derives active edit access and archived read-only access from current Project status", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: target.id,
    });

    await expect(getProjectAccessByKey(database.db, target.id, project.key)).resolves.toMatchObject({
      status: "active",
      access: "member",
      canEdit: true,
    });

    await database.db.update(projects).set({ status: "archived" }).where(eq(projects.id, project.id));

    await expect(getProjectAccessByKey(database.db, target.id, project.key)).resolves.toMatchObject({
      status: "archived",
      access: "read_only",
      canEdit: false,
    });
  });

  it("does not expose a Project to absent or historical members", async () => {
    const actor = await createTestAdmin(database.db);
    const historicalMember = await createTestMember(database.db);
    const nonMember = await createTestMember(database.db, {
      email: "non-member@example.com",
      firstName: "Non",
    });
    const project = await createTestProject(database.db, actor.id);
    await createTestHistoricalMembership(database.db, {
      addedByUserId: actor.id,
      projectId: project.id,
      userId: historicalMember.id,
    });

    await expect(listProjectsForUser(database.db, historicalMember.id)).resolves.toEqual([]);
    await expect(getProjectAccessByKey(database.db, historicalMember.id, project.key)).resolves.toBeNull();
    await expect(getProjectAccessByKey(database.db, nonMember.id, project.key)).resolves.toBeNull();
  });
});
