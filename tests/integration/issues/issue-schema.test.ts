import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

type Fixture = {
  creatorId: string;
  memberId: string;
  projectId: string;
};

async function createFixture(): Promise<Fixture> {
  const [creator, member] = await database.client<{ id: string }[]>`
    insert into users (email, password_hash, role, status, first_name, last_name)
    values
      ('issue-schema-creator@example.com', 'hash', 'admin', 'active', 'Issue', 'Creator'),
      ('issue-schema-member@example.com', 'hash', 'member', 'active', 'Issue', 'Member')
    returning id
  `;
  const [project] = await database.client<{ id: string }[]>`
    insert into projects (key, name, description, color, start_date, created_by)
    values ('ISSSCH', 'Issue Schema Project', 'Issue schema test', 'blue', '2026-08-19', ${creator.id})
    returning id
  `;
  return { creatorId: creator.id, memberId: member.id, projectId: project.id };
}

async function insertIssue(
  fixture: Fixture,
  overrides: Partial<{ status: string; priority: string; assigneeId: string | null }> = {},
): Promise<string> {
  const [issue] = await database.client<{ id: string }[]>`
    insert into issues (project_id, title, status, priority, assignee_id, created_by)
    values (
      ${fixture.projectId}, 'Schema test issue',
      ${overrides.status ?? "backlog"}, ${overrides.priority ?? "none"},
      ${overrides.assigneeId ?? null}, ${fixture.creatorId}
    )
    returning id
  `;
  return issue.id;
}

describe("issue tracking persistence schema", () => {
  beforeAll(async () => {
    await database.client`select 1`;
  });

  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("accepts every issue_status enum value and rejects an invalid one", async () => {
    const fixture = await createFixture();
    for (const status of ["backlog", "todo", "in_progress", "done", "canceled"]) {
      await expect(insertIssue(fixture, { status })).resolves.toEqual(expect.any(String));
    }
    await expect(
      database.client`insert into issues (project_id, title, status, priority, created_by)
        values (${fixture.projectId}, 'Bad status', 'not_a_status', 'none', ${fixture.creatorId})`,
    ).rejects.toThrow();
  });

  it("accepts every issue_priority enum value and rejects an invalid one", async () => {
    const fixture = await createFixture();
    for (const priority of ["none", "low", "medium", "high", "urgent"]) {
      await expect(insertIssue(fixture, { priority })).resolves.toEqual(expect.any(String));
    }
    await expect(
      database.client`insert into issues (project_id, title, status, priority, created_by)
        values (${fixture.projectId}, 'Bad priority', 'backlog', 'not_a_priority', ${fixture.creatorId})`,
    ).rejects.toThrow();
  });

  it("defaults status to backlog and priority to none", async () => {
    const fixture = await createFixture();
    const [issue] = await database.client<{ id: string }[]>`
      insert into issues (project_id, title, created_by)
      values (${fixture.projectId}, 'Defaults test', ${fixture.creatorId})
      returning id
    `;
    const [row] = await database.client<{ status: string; priority: string }[]>`
      select status, priority from issues where id = ${issue.id}
    `;
    expect(row.status).toBe("backlog");
    expect(row.priority).toBe("none");
  });

  it("allows a nullable assignee and enforces the assignee foreign key", async () => {
    const fixture = await createFixture();
    await expect(insertIssue(fixture, { assigneeId: fixture.memberId })).resolves.toEqual(expect.any(String));
    await expect(
      database.client`insert into issues (project_id, title, assignee_id, created_by)
        values (${fixture.projectId}, 'Bad assignee', '00000000-0000-0000-0000-000000000000', ${fixture.creatorId})`,
    ).rejects.toThrow();
  });

  it("restricts deleting a project, assignee, or creator referenced by an issue", async () => {
    const fixture = await createFixture();
    await insertIssue(fixture, { assigneeId: fixture.memberId });
    await expect(database.client`delete from projects where id = ${fixture.projectId}`).rejects.toThrow();
    await expect(database.client`delete from users where id = ${fixture.memberId}`).rejects.toThrow();
    await expect(database.client`delete from users where id = ${fixture.creatorId}`).rejects.toThrow();
  });

  it("enforces case-insensitive uniqueness of a label name per project", async () => {
    const fixture = await createFixture();
    await database.client`
      insert into labels (project_id, name, color, created_by)
      values (${fixture.projectId}, 'Bug', 'bug', ${fixture.creatorId})
    `;
    await expect(
      database.client`insert into labels (project_id, name, color, created_by)
        values (${fixture.projectId}, 'bug', 'bug', ${fixture.creatorId})`,
    ).rejects.toThrow();
    await expect(
      database.client`insert into labels (project_id, name, color, created_by)
        values (${fixture.projectId}, 'BUG', 'bug', ${fixture.creatorId})`,
    ).rejects.toThrow();
  });

  it("allows the same label name in a different project", async () => {
    const fixture = await createFixture();
    const [otherProject] = await database.client<{ id: string }[]>`
      insert into projects (key, name, description, color, start_date, created_by)
      values ('ISSSC2', 'Other Project', 'Other', 'green', '2026-08-19', ${fixture.creatorId})
      returning id
    `;
    await database.client`
      insert into labels (project_id, name, color, created_by)
      values (${fixture.projectId}, 'Bug', 'bug', ${fixture.creatorId})
    `;
    await expect(
      database.client`insert into labels (project_id, name, color, created_by)
        values (${otherProject.id}, 'Bug', 'bug', ${fixture.creatorId})`,
    ).resolves.toEqual(expect.anything());
  });

  it("restricts deleting a project or creator referenced by a label", async () => {
    const fixture = await createFixture();
    await database.client`
      insert into labels (project_id, name, color, created_by)
      values (${fixture.projectId}, 'Bug', 'bug', ${fixture.creatorId})
    `;
    await expect(database.client`delete from projects where id = ${fixture.projectId}`).rejects.toThrow();
    await expect(database.client`delete from users where id = ${fixture.creatorId}`).rejects.toThrow();
  });

  it("enforces a composite primary key on issue_labels and cascades when the issue is deleted", async () => {
    const fixture = await createFixture();
    const issueId = await insertIssue(fixture);
    const [label] = await database.client<{ id: string }[]>`
      insert into labels (project_id, name, color, created_by)
      values (${fixture.projectId}, 'Bug', 'bug', ${fixture.creatorId})
      returning id
    `;
    await database.client`insert into issue_labels (issue_id, label_id) values (${issueId}, ${label.id})`;
    await expect(
      database.client`insert into issue_labels (issue_id, label_id) values (${issueId}, ${label.id})`,
    ).rejects.toThrow();

    await database.client`delete from issues where id = ${issueId}`;
    const remaining = await database.client<{ issue_id: string }[]>`
      select issue_id from issue_labels where label_id = ${label.id}
    `;
    expect(remaining).toHaveLength(0);
  });

  it("restricts deleting a label referenced by an issue_labels row", async () => {
    const fixture = await createFixture();
    const issueId = await insertIssue(fixture);
    const [label] = await database.client<{ id: string }[]>`
      insert into labels (project_id, name, color, created_by)
      values (${fixture.projectId}, 'Bug', 'bug', ${fixture.creatorId})
      returning id
    `;
    await database.client`insert into issue_labels (issue_id, label_id) values (${issueId}, ${label.id})`;
    await expect(database.client`delete from labels where id = ${label.id}`).rejects.toThrow();
  });
});
