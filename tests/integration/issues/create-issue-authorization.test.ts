import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { issues } from "@/lib/db/schema";
import {
  createTestAdmin,
  createTestCurrentMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const mockGetCurrentSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: mockGetCurrentSession,
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

let _actionDb: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return _actionDb;
  },
}));

const database = createTestDatabase();
afterAll(async () => database.close());

describe("createIssue — authorization", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
  });

  it("rejects a non-member of an existing project as forbidden, without inserting a row", async () => {
    const owner = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, owner.id);
    const outsider = await createTestMember(database.db, { email: "outsider@example.com" });
    mockGetCurrentSession.mockResolvedValue({ userId: outsider.id, role: "member", sessionId: "s" });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Should not be created");

    const result = await createIssue(null, formData);

    expect(result).toMatchObject({ error: "forbidden" });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });

  it("rejects an unknown project key as forbidden, identically to a non-member, without revealing existence", async () => {
    const someone = await createTestAdmin(database.db);
    mockGetCurrentSession.mockResolvedValue({ userId: someone.id, role: "admin", sessionId: "s" });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", "GHOST");
    formData.set("title", "Should not be created");

    const result = await createIssue(null, formData);

    expect(result).toMatchObject({ error: "forbidden" });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });

  it("rejects an unauthenticated request as forbidden", async () => {
    mockGetCurrentSession.mockResolvedValue(null);

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", "ANY");
    formData.set("title", "Should not be created");

    const result = await createIssue(null, formData);

    expect(result).toMatchObject({ error: "forbidden" });
  });

  it("allows an active project member to create an issue", async () => {
    const owner = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, owner.id);
    const member = await createTestMember(database.db);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: member.id,
      addedByUserId: owner.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: member.id, role: "member", sessionId: "s" });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Fix header padding");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(await database.db.select().from(issues)).toHaveLength(1);
  });
});
