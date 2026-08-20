import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import { projectMembers, projects, users } from "@/lib/db/schema";

// --- Module mocks (hoisted before imports) ---

const mockGetCurrentSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  getCurrentSession: mockGetCurrentSession,
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

// Use a getter so testDb is resolved at call time (after beforeAll sets it)
let _actionDb: ReturnType<typeof createTestDatabase>["db"] | null = null;
vi.mock("@/lib/db", () => ({
  get db() {
    return _actionDb;
  },
}));

// ---

const database = createTestDatabase();
afterAll(async () => database.close());

async function seedAdmin() {
  const [admin] = await database.db
    .insert(users)
    .values({
      email: "admin@example.com",
      passwordHash: "hash",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    })
    .returning();
  return admin;
}

async function seedMember() {
  const [member] = await database.db
    .insert(users)
    .values({
      email: "member@example.com",
      passwordHash: "hash",
      firstName: "Member",
      lastName: "User",
      role: "member",
    })
    .returning();
  return member;
}

// --- Phase 3 / T008: Access Control ---

describe("createProject — access control (US3)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
  });

  it("returns forbidden and inserts no row when called with a member session", async () => {
    const member = await seedMember();
    mockGetCurrentSession.mockResolvedValue({
      userId: member.id,
      role: "member",
      sessionId: "test-session",
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Test Project");
    formData.set("key", "TEST");
    formData.set("description", "A description");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");

    const result = await createProject(null, formData);

    expect(result).toMatchObject({ error: "forbidden" });
    const rows = await database.db.select().from(projects);
    expect(rows).toHaveLength(0);
  });
});

// --- Phase 4 / T012: Project Creation (US1) ---

describe("createProject — project creation (US1)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
  });

  it("inserts a project row and redirects on valid required fields", async () => {
    const admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({
      userId: admin.id,
      role: "admin",
      sessionId: "test-session",
    });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Marketing Campaign");
    formData.set("key", "MC");
    formData.set("description", "**Goal**: Launch Q3 campaign.");
    formData.set("color", "amber");
    formData.set("startDate", "2026-09-01");

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const rows = await database.db.select().from(projects);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "MC",
      name: "Marketing Campaign",
      description: "**Goal**: Launch Q3 campaign.",
      color: "amber",
      startDate: "2026-09-01",
      endDate: null,
      createdBy: admin.id,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/projects");
  });

  it("returns name field error when name is missing", async () => {
    const admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "");
    formData.set("key", "TEST");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");

    const result = await createProject(null, formData);
    expect(result).toMatchObject({ fieldErrors: { name: expect.any(String) } });
  });

  it("returns key field error for invalid key format", async () => {
    const admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Test");
    formData.set("key", "mc!");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");

    const result = await createProject(null, formData);
    expect(result).toMatchObject({ fieldErrors: { key: expect.any(String) } });
  });

  it("returns key field error when key already exists in DB", async () => {
    const admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    await database.db.insert(projects).values({
      key: "MC",
      name: "Existing",
      description: "existing",
      color: "red",
      startDate: "2026-01-01",
      createdBy: admin.id,
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Mobile Core");
    formData.set("key", "MC");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");

    const result = await createProject(null, formData);
    expect(result).toMatchObject({ fieldErrors: { key: "This key is already in use. Choose a different one." } });
  });

  it("stores description as raw markdown (not HTML)", async () => {
    const admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "MD Test");
    formData.set("key", "MDT");
    formData.set("description", "**bold** and _italic_");
    formData.set("color", "green");
    formData.set("startDate", "2026-09-01");

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(projects);
    expect(row.description).toBe("**bold** and _italic_");
  });
});

// --- Phase 5 / T016: End Date Validation (US2) ---

describe("createProject — end date (US2)", () => {
  let admin: Awaited<ReturnType<typeof seedAdmin>>;

  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
  });

  it("stores end date when valid (after start date)", async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Bounded");
    formData.set("key", "BND");
    formData.set("description", "desc");
    formData.set("color", "teal");
    formData.set("startDate", "2026-09-01");
    formData.set("endDate", "2026-12-31");

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(projects);
    expect(row.endDate).toBe("2026-12-31");
  });

  it("returns end date field error when end date equals start date", async () => {
    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Same Dates");
    formData.set("key", "SMD");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");
    formData.set("endDate", "2026-09-01");

    const result = await createProject(null, formData);
    expect(result).toMatchObject({ fieldErrors: { endDate: "End date must be after the start date" } });
    expect(await database.db.select().from(projects)).toHaveLength(0);
  });

  it("returns end date field error when end date before start date", async () => {
    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Bad Dates");
    formData.set("key", "BDT");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");
    formData.set("endDate", "2026-08-31");

    const result = await createProject(null, formData);
    expect(result).toMatchObject({ fieldErrors: { endDate: "End date must be after the start date" } });
  });

  it("stores null end_date when no end date provided", async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Open Project");
    formData.set("key", "OPN");
    formData.set("description", "desc");
    formData.set("color", "purple");
    formData.set("startDate", "2026-09-01");

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [row] = await database.db.select().from(projects);
    expect(row.endDate).toBeNull();
  });
});

// --- Phase 6 / T023: Member Insertion (US3) ---

async function seedSecondMember() {
  const [member] = await database.db
    .insert(users)
    .values({
      email: "member2@example.com",
      passwordHash: "hash",
      firstName: "Second",
      lastName: "Member",
      role: "member",
    })
    .returning();
  return member;
}

describe("createProject — member insertion (US3)", () => {
  let admin: Awaited<ReturnType<typeof seedAdmin>>;

  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    _actionDb = database.db;
    mockGetCurrentSession.mockReset();
    mockRevalidatePath.mockReset();
    mockRedirect.mockReset();
    admin = await seedAdmin();
    mockGetCurrentSession.mockResolvedValue({ userId: admin.id, role: "admin", sessionId: "s" });
  });

  it("inserts two project_members rows for two valid memberIds", async () => {
    const member1 = await seedMember();
    const member2 = await seedSecondMember();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Team Project");
    formData.set("key", "TEAM");
    formData.set("description", "desc");
    formData.set("color", "blue");
    formData.set("startDate", "2026-09-01");
    formData.append("memberIds[]", member1.id);
    formData.append("memberIds[]", member2.id);

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [project] = await database.db.select().from(projects);
    const members = await database.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));
    expect(members).toHaveLength(2);
    expect(members.map((m) => m.userId)).toContain(member1.id);
    expect(members.map((m) => m.userId)).toContain(member2.id);
  });

  it("inserts no project_members rows when no memberIds submitted", async () => {
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Solo Project");
    formData.set("key", "SOLO");
    formData.set("description", "desc");
    formData.set("color", "red");
    formData.set("startDate", "2026-09-01");

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [project] = await database.db.select().from(projects);
    const members = await database.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));
    expect(members).toHaveLength(0);
  });

  it("silently drops admin's own UUID from memberIds", async () => {
    const member = await seedMember();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Admin Self Project");
    formData.set("key", "SELF");
    formData.set("description", "desc");
    formData.set("color", "green");
    formData.set("startDate", "2026-09-01");
    formData.append("memberIds[]", admin.id);
    formData.append("memberIds[]", member.id);

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [project] = await database.db.select().from(projects);
    const members = await database.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(member.id);
    expect(members.map((m) => m.userId)).not.toContain(admin.id);
  });

  it("silently drops non-existent UUID and inserts remaining valid member", async () => {
    const member = await seedMember();
    const nonExistentUuid = "00000000-0000-0000-0000-000000000001";
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Filter Project");
    formData.set("key", "FILT");
    formData.set("description", "desc");
    formData.set("color", "teal");
    formData.set("startDate", "2026-09-01");
    formData.append("memberIds[]", member.id);
    formData.append("memberIds[]", nonExistentUuid);

    await expect(createProject(null, formData)).rejects.toThrow("NEXT_REDIRECT");

    const [project] = await database.db.select().from(projects);
    const members = await database.db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(member.id);
  });

  it("rolls back the projects row when project_members insert fails", async () => {
    const member = await seedMember();
    const realDb = database.db;

    _actionDb = new Proxy(realDb, {
      get(target, prop) {
        if (prop === "transaction") {
          return async (_fn: unknown) => {
            throw new Error("Simulated project_members insert failure");
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (target as any)[prop];
      },
    }) as typeof realDb;

    const { createProject } = await import("@/app/actions/projects");
    const formData = new FormData();
    formData.set("name", "Rollback Project");
    formData.set("key", "RBK");
    formData.set("description", "desc");
    formData.set("color", "purple");
    formData.set("startDate", "2026-09-01");
    formData.append("memberIds[]", member.id);

    await expect(createProject(null, formData)).rejects.toThrow();

    const projectRows = await realDb.select().from(projects);
    expect(projectRows).toHaveLength(0);
  });
});
