import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { listNotificationsForRecipient } from "@/lib/db/queries/notifications";
import { notifications, projects } from "@/lib/db/schema";
import { addProjectMember } from "@/lib/projects/add-project-member";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestHistoricalMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const database = createTestDatabase();

describe("Project membership Notification reads", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("appears unread on the recipient's next read and remains recipient-private", async () => {
    const actor = await createTestAdmin(database.db);
    const recipient = await createTestMember(database.db);
    const otherUser = await createTestMember(database.db, {
      email: "other-recipient@example.com",
      firstName: "Other",
    });
    const project = await createTestProject(database.db, actor.id);
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: recipient.id,
    });

    await expect(listNotificationsForRecipient(database.db, recipient.id)).resolves.toEqual([
      expect.objectContaining({
        message: "Project Admin added you to Active Project.",
        href: "/projects/ACTIVE",
        readAt: null,
      }),
    ]);
    await expect(listNotificationsForRecipient(database.db, otherUser.id)).resolves.toEqual([]);
  });

  it("orders unread first, then newest creation and stable identity", async () => {
    const actor = await createTestAdmin(database.db);
    const recipient = await createTestMember(database.db);
    const firstProject = await createTestProject(database.db, actor.id, {
      key: "FIRST",
      name: "First Project",
    });
    const secondProject = await createTestProject(database.db, actor.id, {
      key: "SECOND",
      name: "Second Project",
    });
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: firstProject.id,
      userId: recipient.id,
    });
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: secondProject.id,
      userId: recipient.id,
    });
    const rows = await database.db.select().from(notifications);
    const first = rows.find((row) => row.projectId === firstProject.id);
    if (!first) throw new Error("first Notification fixture missing");
    await database.db
      .update(notifications)
      .set({ readAt: new Date("2026-08-19T13:00:00.000Z") })
      .where(eq(notifications.id, first.id));

    const result = await listNotificationsForRecipient(database.db, recipient.id);

    expect(result.map((notification) => notification.projectName)).toEqual([
      "Second Project",
      "First Project",
    ]);
    expect(result.map((notification) => notification.readAt === null)).toEqual([true, false]);
  });

  it("resolves the current Project name and key after a rename", async () => {
    const actor = await createTestAdmin(database.db);
    const recipient = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: recipient.id,
    });
    await database.db
      .update(projects)
      .set({ key: "RENAMD", name: "Renamed Project" })
      .where(eq(projects.id, project.id));

    await expect(listNotificationsForRecipient(database.db, recipient.id)).resolves.toEqual([
      expect.objectContaining({
        projectName: "Renamed Project",
        message: "Project Admin added you to Renamed Project.",
        href: "/projects/RENAMD",
      }),
    ]);
  });

  it("creates one Notification per membership period and none for duplicate attempts", async () => {
    const actor = await createTestAdmin(database.db);
    const recipient = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id);

    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: recipient.id,
    });
    await addProjectMember(database.db, {
      actorUserId: actor.id,
      projectId: project.id,
      userId: recipient.id,
    });
    expect(await listNotificationsForRecipient(database.db, recipient.id)).toHaveLength(1);

    await truncateFeatureTables(database.client);
    const secondActor = await createTestAdmin(database.db);
    const secondRecipient = await createTestMember(database.db);
    const secondProject = await createTestProject(database.db, secondActor.id);
    await createTestHistoricalMembership(database.db, {
      projectId: secondProject.id,
      userId: secondRecipient.id,
      addedByUserId: secondActor.id,
    });
    await addProjectMember(database.db, {
      actorUserId: secondActor.id,
      projectId: secondProject.id,
      userId: secondRecipient.id,
    });

    expect(await listNotificationsForRecipient(database.db, secondRecipient.id)).toHaveLength(1);
  });
});
