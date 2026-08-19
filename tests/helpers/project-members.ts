import type { createTestDatabase } from "@/tests/helpers/database";
import { projectMemberships, projects, users } from "@/lib/db/schema";

type TestDatabase = ReturnType<typeof createTestDatabase>["db"];
type UserInsert = typeof users.$inferInsert;
type ProjectInsert = typeof projects.$inferInsert;

export async function createTestAdmin(
  database: TestDatabase,
  overrides: Partial<UserInsert> = {},
): Promise<typeof users.$inferSelect> {
  const [admin] = await database
    .insert(users)
    .values({
      email: "project-admin@example.com",
      passwordHash: "test-password-hash",
      role: "admin",
      status: "active",
      firstName: "Project",
      lastName: "Admin",
      ...overrides,
    })
    .returning();
  return admin;
}

export async function createTestMember(
  database: TestDatabase,
  overrides: Partial<UserInsert> = {},
): Promise<typeof users.$inferSelect> {
  const [member] = await database
    .insert(users)
    .values({
      email: "project-member@example.com",
      passwordHash: "test-password-hash",
      role: "member",
      status: "active",
      firstName: "Project",
      lastName: "Member",
      ...overrides,
    })
    .returning();
  return member;
}

export async function createTestSuspendedUser(
  database: TestDatabase,
  overrides: Partial<UserInsert> = {},
): Promise<typeof users.$inferSelect> {
  return createTestMember(database, {
    email: "suspended-project-member@example.com",
    status: "suspended",
    firstName: "Suspended",
    ...overrides,
  });
}

export async function createTestProject(
  database: TestDatabase,
  createdBy: string,
  overrides: Partial<ProjectInsert> = {},
): Promise<typeof projects.$inferSelect> {
  const [project] = await database
    .insert(projects)
    .values({
      key: "ACTIVE",
      name: "Active Project",
      description: "Project membership test fixture",
      color: "blue",
      status: "active",
      startDate: "2026-08-19",
      createdBy,
      ...overrides,
    })
    .returning();
  return project;
}

export async function createTestArchivedProject(
  database: TestDatabase,
  createdBy: string,
  overrides: Partial<ProjectInsert> = {},
): Promise<typeof projects.$inferSelect> {
  return createTestProject(database, createdBy, {
    key: "ARCHIV",
    name: "Archived Project",
    status: "archived",
    ...overrides,
  });
}

type MembershipFixtureInput = {
  projectId: string;
  userId: string;
  addedByUserId: string;
};

export async function createTestCurrentMembership(
  database: TestDatabase,
  input: MembershipFixtureInput,
): Promise<typeof projectMemberships.$inferSelect> {
  const [membership] = await database.insert(projectMemberships).values(input).returning();
  return membership;
}

export async function createTestHistoricalMembership(
  database: TestDatabase,
  input: MembershipFixtureInput,
): Promise<typeof projectMemberships.$inferSelect> {
  const [membership] = await database
    .insert(projectMemberships)
    .values({
      ...input,
      removedByUserId: input.addedByUserId,
      removedAt: new Date("2026-08-19T12:00:00.000Z"),
    })
    .returning();
  return membership;
}
