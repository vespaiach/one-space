import { readFile } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getMembershipManagementData } from "@/lib/db/queries/project-members";
import { listNotificationsForRecipient } from "@/lib/db/queries/notifications";
import { notifications, projectActivityEntries, projectMemberships } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const mocks = vi.hoisted(() => ({ getCurrentSession: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

let actionDatabase: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return actionDatabase;
  },
}));

const database = createTestDatabase();

function craftedForm(projectId: string, userId: string): FormData {
  const data = new FormData();
  data.set("projectId", projectId);
  data.set("userId", userId);
  data.set("actorUserId", userId);
  data.set("role", "admin");
  data.set("accountStatus", "active");
  data.set("projectName", "Client Private Project");
  data.set("roster", "Client Private Roster");
  data.set("notificationText", "Client Notification Text");
  data.set("destination", "/admin/private");
  data.set("sessionToken", "raw-session-token");
  return data;
}

describe("Project membership privacy", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    actionDatabase = database.db;
    mocks.getCurrentSession.mockReset();
    mocks.revalidatePath.mockReset();
  });

  afterAll(async () => {
    await database.close();
  });

  it("reveals no Project, roster, candidate, or account state to a Member actor", async () => {
    const actor = await createTestAdmin(database.db);
    const memberActor = await createTestMember(database.db, { firstName: "Unauthorized" });
    const target = await createTestMember(database.db, {
      email: "private-target@example.com",
      firstName: "Private",
    });
    const project = await createTestProject(database.db, actor.id, {
      name: "Private Project Name",
    });
    mocks.getCurrentSession.mockResolvedValue({ userId: memberActor.id, role: "member", status: "active" });
    const { addProjectMember } = await import("@/app/actions/project-members");

    const result = await addProjectMember({ status: "idle" }, craftedForm(project.id, target.id));

    expect(result).toEqual({ status: "error", code: "forbidden", message: "Admin access is required." });
    expect(JSON.stringify(result)).not.toMatch(/Private Project Name|Private Target|active|suspended/);
    await expect(getMembershipManagementData(database.db, project.key, memberActor.id)).resolves.toBeNull();
  });

  it("ignores crafted actor, content, destination, form-body, and session fields", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const other = await createTestMember(database.db, {
      email: "notification-outsider@example.com",
      firstName: "Outsider",
    });
    const project = await createTestProject(database.db, actor.id, { name: "Server Project" });
    mocks.getCurrentSession.mockResolvedValue({ userId: actor.id, role: "admin", status: "active" });
    const { addProjectMember } = await import("@/app/actions/project-members");

    const result = await addProjectMember({ status: "idle" }, craftedForm(project.id, target.id));

    expect(result).toMatchObject({ status: "success", message: "Project Member was added to Server Project." });
    const persisted = JSON.stringify({
      memberships: await database.db.select().from(projectMemberships),
      notifications: await database.db.select().from(notifications),
      activity: await database.db.select().from(projectActivityEntries),
    });
    expect(persisted).not.toMatch(
      /raw-session-token|Client Private Project|Client Private Roster|Client Notification Text|\/admin\/private/,
    );
    await expect(listNotificationsForRecipient(database.db, other.id)).resolves.toEqual([]);
  });

  it("contains no logging path for submitted membership or Notification data", async () => {
    const sources = await Promise.all([
      readFile("app/actions/project-members.ts", "utf8"),
      readFile("lib/projects/add-project-member.ts", "utf8"),
      readFile("lib/db/queries/project-members.ts", "utf8"),
      readFile("lib/db/queries/notifications.ts", "utf8"),
    ]);
    expect(sources.join("\n")).not.toMatch(/console\.(?:log|info|warn|error)/);
  });
});
