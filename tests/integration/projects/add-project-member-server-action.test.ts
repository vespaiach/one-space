import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import {
  createTestAdmin,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";

const mockGetCurrentSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentSession: mockGetCurrentSession }));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

let actionDatabase: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return actionDatabase;
  },
}));

const database = createTestDatabase();

function memberFormData(projectId: string, userId: string): FormData {
  const formData = new FormData();
  formData.set("projectId", projectId);
  formData.set("userId", userId);
  formData.set("actorUserId", userId);
  formData.set("role", "admin");
  formData.set("notificationText", "unsafe");
  formData.set("destination", "/unsafe");
  return formData;
}

describe("addProjectMember Server Action", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    actionDatabase = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
  });

  afterAll(async () => {
    await database.close();
  });

  it("returns unauthenticated before processing submitted identifiers", async () => {
    mockGetCurrentSession.mockResolvedValue(null);
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(addProjectMember({ status: "idle" }, memberFormData("private", "private"))).resolves.toEqual(
      expect.objectContaining({ status: "error", code: "unauthenticated" }),
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects direct invocation by a Member without Project disclosure", async () => {
    const member = await createTestMember(database.db);
    mockGetCurrentSession.mockResolvedValue({
      sessionId: "session",
      userId: member.id,
      role: "member",
      status: "active",
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
    });
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(addProjectMember({ status: "idle" }, memberFormData("private", "private"))).resolves.toEqual(
      expect.objectContaining({ status: "error", code: "forbidden" }),
    );
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns linked field errors for missing and malformed identifiers", async () => {
    const actor = await createTestAdmin(database.db);
    mockGetCurrentSession.mockResolvedValue({
      sessionId: "session",
      userId: actor.id,
      role: "admin",
      status: "active",
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
    });
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(addProjectMember({ status: "idle" }, new FormData())).resolves.toMatchObject({
      status: "error",
      code: "invalid_input",
      fieldErrors: { projectId: expect.any(Array), userId: expect.any(Array) },
    });
    await expect(
      addProjectMember({ status: "idle" }, memberFormData("not-a-uuid", "also-invalid")),
    ).resolves.toMatchObject({ status: "error", code: "invalid_input" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns server-resolved success data and revalidates only after commit", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db);
    const project = await createTestProject(database.db, actor.id, {
      key: "FRESH",
      name: "Fresh Project",
    });
    mockGetCurrentSession.mockResolvedValue({
      sessionId: "session",
      userId: actor.id,
      role: "admin",
      status: "active",
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
    });
    const { addProjectMember } = await import("@/app/actions/project-members");

    const result = await addProjectMember({ status: "idle" }, memberFormData(project.id, target.id));

    expect(result).toMatchObject({
      status: "success",
      membershipId: expect.any(String),
      message: "Project Member was added to Fresh Project.",
    });
    expect(mockRevalidatePath.mock.calls).toEqual([
      [`/projects/${project.key}/settings/members`],
      [`/projects/${project.key}`],
      ["/projects"],
      ["/"],
    ]);
  });

  it("does not revalidate after an expected transaction rejection", async () => {
    const actor = await createTestAdmin(database.db);
    const target = await createTestMember(database.db, { status: "suspended" });
    const project = await createTestProject(database.db, actor.id);
    mockGetCurrentSession.mockResolvedValue({
      sessionId: "session",
      userId: actor.id,
      role: "admin",
      status: "active",
      expiresAt: new Date("2026-08-20T00:00:00.000Z"),
    });
    const { addProjectMember } = await import("@/app/actions/project-members");

    await expect(
      addProjectMember({ status: "idle" }, memberFormData(project.id, target.id)),
    ).resolves.toMatchObject({ status: "error", code: "user_ineligible" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
