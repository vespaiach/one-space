import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { issueLabels, issues, labels, projectMemberships } from "@/lib/db/schema";
import {
  createTestAdmin,
  createTestCurrentMembership,
  createTestMember,
  createTestProject,
} from "@/tests/helpers/project-members";
import { createTestLabel } from "@/tests/helpers/issues";
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

describe("createIssue — minimal creation (US1)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
  });

  it("creates a title-only issue defaulted to backlog/none/no labels/unassigned", async () => {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Fix header padding on mobile");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row).toMatchObject({
      projectId: project.id,
      title: "Fix header padding on mobile",
      status: "backlog",
      priority: "none",
      assigneeId: null,
      createdBy: admin.id,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/projects/${project.key}`);
  });

  it("rejects a blank title with a field error and inserts no row", async () => {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "   ");

    const result = await createIssue(null, formData);

    expect(result).toMatchObject({ fieldErrors: { title: expect.any(String) } });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });
});

describe("createIssue — status and priority (US2)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  async function seedMemberProject() {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    return { admin, project };
  }

  for (const status of ["backlog", "todo", "in_progress", "done", "canceled"]) {
    it(`accepts and persists status ${status}`, async () => {
      const { project } = await seedMemberProject();
      const { createIssue } = await import("@/app/actions/issues");
      const formData = new FormData();
      formData.set("projectKey", project.key);
      formData.set("title", `Issue with status ${status}`);
      formData.set("status", status);

      await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

      const [row] = await database.db.select().from(issues);
      expect(row.status).toBe(status);
    });
  }

  for (const priority of ["none", "low", "medium", "high", "urgent"]) {
    it(`accepts and persists priority ${priority}`, async () => {
      const { project } = await seedMemberProject();
      const { createIssue } = await import("@/app/actions/issues");
      const formData = new FormData();
      formData.set("projectKey", project.key);
      formData.set("title", `Issue with priority ${priority}`);
      formData.set("priority", priority);

      await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

      const [row] = await database.db.select().from(issues);
      expect(row.priority).toBe(priority);
    });
  }

  it("returns a field error for an invalid status value", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Bad status issue");
    formData.set("status", "not_a_status");

    const result = await createIssue(null, formData);
    expect(result).toMatchObject({ fieldErrors: { status: expect.any(String) } });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });

  it("returns a field error for an invalid priority value", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Bad priority issue");
    formData.set("priority", "not_a_priority");

    const result = await createIssue(null, formData);
    expect(result).toMatchObject({ fieldErrors: { priority: expect.any(String) } });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });

  it("defaults priority to none when omitted", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "No priority specified");
    formData.set("status", "todo");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.priority).toBe("none");
  });
});

describe("createIssue — description (US3)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  async function seedMemberProject() {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    return { admin, project };
  }

  it("stores the description as raw markdown text, not rendered HTML", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Issue with markdown description");
    formData.set("description", "**bold** and _italic_");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.description).toBe("**bold** and _italic_");
  });

  it("allows an empty description", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "No description issue");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.description).toBeNull();
  });

  it("rejects a description over 10000 characters with a field error", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Overlong description issue");
    formData.set("description", "a".repeat(10001));

    const result = await createIssue(null, formData);
    expect(result).toMatchObject({ fieldErrors: { description: expect.any(String) } });
    expect(await database.db.select().from(issues)).toHaveLength(0);
  });
});

describe("createIssue — assignee (US4)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  async function seedMemberProjectWithAssignee() {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    const assignee = await createTestMember(database.db, { email: "assignee@example.com" });
    const membership = await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: assignee.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    return { admin, project, assignee, membership };
  }

  it("stores the assignee when a valid active member is selected", async () => {
    const { project, assignee } = await seedMemberProjectWithAssignee();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Assigned issue");
    formData.set("assigneeId", assignee.id);

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.assigneeId).toBe(assignee.id);
  });

  it('resolves "me" shorthand to the current session user', async () => {
    const { project, admin } = await seedMemberProjectWithAssignee();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Assign to me issue");
    formData.set("assigneeId", "me");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.assigneeId).toBe(admin.id);
  });

  it("leaves the issue unassigned when no assignee is submitted", async () => {
    const { project } = await seedMemberProjectWithAssignee();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Unassigned issue");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.assigneeId).toBeNull();
  });

  it("creates the issue unassigned with an assigneeCleared notice when the assignee is no longer an active member at submission time", async () => {
    const { project, assignee, membership } = await seedMemberProjectWithAssignee();
    await database.db
      .update(projectMemberships)
      .set({ removedAt: new Date(), removedByUserId: assignee.id })
      .where(eq(projectMemberships.id, membership.id));

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Stale assignee issue");
    formData.set("assigneeId", assignee.id);

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(row.assigneeId).toBeNull();
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining("assigneeCleared"));
  });
});

describe("createIssue — labels (US5)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  async function seedMemberProject() {
    const admin = await createTestAdmin(database.db);
    const project = await createTestProject(database.db, admin.id);
    await createTestCurrentMembership(database.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    return { admin, project };
  }

  async function issueLabelNames(issueId: string): Promise<string[]> {
    const rows = await database.db
      .select({ name: labels.name })
      .from(issueLabels)
      .innerJoin(labels, eq(issueLabels.labelId, labels.id))
      .where(eq(issueLabels.issueId, issueId));
    return rows.map((row) => row.name).sort();
  }

  it("applies two existing labels independently via issue_labels", async () => {
    const { admin, project } = await seedMemberProject();
    const bug = await createTestLabel(database.db, project.id, admin.id, { name: "Bug" });
    const design = await createTestLabel(database.db, project.id, admin.id, { name: "Design", color: "design" });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Multi-label issue");
    formData.append("labelIds[]", bug.id);
    formData.append("labelIds[]", design.id);

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(await issueLabelNames(row.id)).toEqual(["Bug", "Design"]);
  });

  it("creates and attaches a brand-new label typed inline", async () => {
    const { project } = await seedMemberProject();
    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Inline label issue");
    formData.append("newLabelNames[]", "Performance");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(issues);
    expect(await issueLabelNames(row.id)).toEqual(["Performance"]);
    const createdLabels = await database.db.select().from(labels).where(eq(labels.projectId, project.id));
    expect(createdLabels).toHaveLength(1);
  });

  it("reuses an existing label case-insensitively instead of creating a duplicate", async () => {
    const { admin, project } = await seedMemberProject();
    await createTestLabel(database.db, project.id, admin.id, { name: "Bug" });

    const { createIssue } = await import("@/app/actions/issues");
    const formData = new FormData();
    formData.set("projectKey", project.key);
    formData.set("title", "Case-insensitive reuse issue");
    formData.append("newLabelNames[]", "bug");

    await expect(createIssue(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const allLabels = await database.db.select().from(labels).where(eq(labels.projectId, project.id));
    expect(allLabels).toHaveLength(1);
    const [row] = await database.db.select().from(issues);
    expect(await issueLabelNames(row.id)).toEqual(["Bug"]);
  });
});
