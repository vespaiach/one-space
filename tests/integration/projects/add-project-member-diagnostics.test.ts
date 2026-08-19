import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditEvents } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  commitProjectMembership: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentSession: mocks.getCurrentSession }));
vi.mock("@/lib/projects/add-project-member", () => ({
  addProjectMember: mocks.commitProjectMembership,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

let actionDatabase: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return actionDatabase;
  },
}));

const database = createTestDatabase();

describe("add Project member diagnostics", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    actionDatabase = database.db;
    mocks.getCurrentSession.mockReset();
    mocks.commitProjectMembership.mockReset();
    mocks.revalidatePath.mockReset();
  });

  afterAll(async () => {
    await database.close();
  });

  it("records exactly one allowlisted event for an unexpected failure", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id, {
      name: "Private Acquisition Project",
    });
    mocks.getCurrentSession.mockResolvedValue({ userId: actor.id, role: "admin", status: "active" });
    mocks.commitProjectMembership.mockResolvedValue({ status: "error", code: "unexpected" });
    const data = new FormData();
    data.set("projectId", project.id);
    data.set("userId", target.id);
    data.set("email", "private-person@example.com");
    data.set("sessionToken", "raw-session-token");
    data.set("projectContent", "Private Acquisition Project");
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(addProjectMember({ status: "idle" }, data)).resolves.toMatchObject({
      status: "error",
      code: "unexpected",
    });

    const events = await database.db.select().from(auditEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      category: "operations",
      action: "project.membership.add",
      outcome: "failed",
      actorId: actor.id,
      targetId: target.id,
      reasonCode: "transaction_failed",
    });
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("raw-session-token");
    expect(serialized).not.toContain("private-person@example.com");
    expect(serialized).not.toContain("Private Acquisition Project");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
