import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { issueLabels, labels } from "@/lib/db/schema";
import { createIssue } from "@/lib/issues/create-issue";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";
import { createTestAdmin, createTestCurrentMembership, createTestProject } from "@/tests/helpers/project-members";

const firstDatabase = createTestDatabase();
const secondDatabase = createTestDatabase();

function synchronizedBarrier() {
  let arrivals = 0;
  let release: (() => void) | undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait: async () => {
      arrivals += 1;
      if (arrivals === 2) release?.();
      await released;
    },
    arrivals: () => arrivals,
  };
}

describe("createIssue — label creation concurrency (US5)", () => {
  beforeEach(async () => {
    await truncateFeatureTables(firstDatabase.client);
  });

  afterAll(async () => {
    await Promise.all([firstDatabase.close(), secondDatabase.close()]);
  });

  it("creates exactly one label row when two issues request the identical new label name (differing only in case) simultaneously", async () => {
    const admin = await createTestAdmin(firstDatabase.db);
    const project = await createTestProject(firstDatabase.db, admin.id);
    await createTestCurrentMembership(firstDatabase.db, {
      projectId: project.id,
      userId: admin.id,
      addedByUserId: admin.id,
    });
    const barrier = synchronizedBarrier();

    const [firstResult, secondResult] = await Promise.all([
      createIssue(
        firstDatabase.db,
        { projectId: project.id, userId: admin.id, title: "First concurrent issue", newLabelNames: ["Urgent"] },
        { beforeLabelInsert: barrier.wait },
      ),
      createIssue(
        secondDatabase.db,
        { projectId: project.id, userId: admin.id, title: "Second concurrent issue", newLabelNames: ["urgent"] },
        { beforeLabelInsert: barrier.wait },
      ),
    ]);

    expect(barrier.arrivals()).toBe(2);
    if ("error" in firstResult || "fieldErrors" in firstResult) throw new Error("first creation failed");
    if ("error" in secondResult || "fieldErrors" in secondResult) throw new Error("second creation failed");

    const projectLabels = await firstDatabase.db.select().from(labels).where(eq(labels.projectId, project.id));
    expect(projectLabels).toHaveLength(1);

    const firstIssueLabels = await firstDatabase.db
      .select()
      .from(issueLabels)
      .where(eq(issueLabels.issueId, firstResult.issueId));
    const secondIssueLabels = await firstDatabase.db
      .select()
      .from(issueLabels)
      .where(eq(issueLabels.issueId, secondResult.issueId));
    expect(firstIssueLabels).toHaveLength(1);
    expect(secondIssueLabels).toHaveLength(1);
    expect(firstIssueLabels[0].labelId).toBe(projectLabels[0].id);
    expect(secondIssueLabels[0].labelId).toBe(projectLabels[0].id);
  });
});
