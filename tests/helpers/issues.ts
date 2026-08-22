import type { createTestDatabase } from "@/tests/helpers/database";
import { issueLabels, issues, labels } from "@/lib/db/schema";

type TestDatabase = ReturnType<typeof createTestDatabase>["db"];
type IssueInsert = typeof issues.$inferInsert;
type LabelInsert = typeof labels.$inferInsert;

export async function createTestIssue(
  database: TestDatabase,
  projectId: string,
  createdBy: string,
  overrides: Partial<IssueInsert> = {},
): Promise<typeof issues.$inferSelect> {
  const [issue] = await database
    .insert(issues)
    .values({
      projectId,
      title: "Test issue",
      createdBy,
      ...overrides,
    })
    .returning();
  return issue;
}

export async function createTestLabel(
  database: TestDatabase,
  projectId: string,
  createdBy: string,
  overrides: Partial<LabelInsert> = {},
): Promise<typeof labels.$inferSelect> {
  const [label] = await database
    .insert(labels)
    .values({
      projectId,
      name: "Bug",
      color: "bug",
      createdBy,
      ...overrides,
    })
    .returning();
  return label;
}

export async function attachTestLabel(database: TestDatabase, issueId: string, labelId: string): Promise<void> {
  await database.insert(issueLabels).values({ issueId, labelId });
}
