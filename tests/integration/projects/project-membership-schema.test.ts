import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

type Fixture = {
  actorId: string;
  memberId: string;
  projectId: string;
};

async function createFixture(): Promise<Fixture> {
  const [actor, member] = await database.client<{ id: string }[]>`
    insert into users (email, password_hash, role, status, first_name, last_name)
    values
      ('schema-admin@example.com', 'hash', 'admin', 'active', 'Schema', 'Admin'),
      ('schema-member@example.com', 'hash', 'member', 'active', 'Schema', 'Member')
    returning id
  `;
  const [project] = await database.client<{ id: string }[]>`
    insert into projects (key, name, description, color, start_date, created_by)
    values ('SCHEMA', 'Schema Project', 'Schema test', 'blue', '2026-08-19', ${actor.id})
    returning id
  `;
  return { actorId: actor.id, memberId: member.id, projectId: project.id };
}

async function addMembership(fixture: Fixture): Promise<string> {
  const [membership] = await database.client<{ id: string }[]>`
    insert into project_memberships (project_id, user_id, added_by_user_id)
    values (${fixture.projectId}, ${fixture.memberId}, ${fixture.actorId})
    returning id
  `;
  return membership.id;
}

describe("project membership persistence schema", () => {
  beforeAll(async () => {
    await database.client`select 1`;
  });

  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("keeps membership history while allowing only one active period", async () => {
    const fixture = await createFixture();
    const firstMembershipId = await addMembership(fixture);

    await expect(addMembership(fixture)).rejects.toThrow();
    await database.client`
      update project_memberships
      set removed_at = now(), removed_by_user_id = ${fixture.actorId}
      where id = ${firstMembershipId}
    `;
    await expect(addMembership(fixture)).resolves.toEqual(expect.any(String));

    const memberships = await database.client<{ removed_at: Date | null }[]>`
      select removed_at from project_memberships
      where project_id = ${fixture.projectId} and user_id = ${fixture.memberId}
      order by added_at
    `;
    expect(memberships).toHaveLength(2);
    expect(memberships.filter((membership) => membership.removed_at === null)).toHaveLength(1);
  });

  it("requires removal time and remover identity to be paired", async () => {
    const fixture = await createFixture();
    const membershipId = await addMembership(fixture);

    await expect(database.client`
      update project_memberships set removed_at = now() where id = ${membershipId}
    `).rejects.toThrow();
    await expect(database.client`
      update project_memberships set removed_by_user_id = ${fixture.actorId} where id = ${membershipId}
    `).rejects.toThrow();
  });

  it("deduplicates Notification and activity records by membership source", async () => {
    const fixture = await createFixture();
    const membershipId = await addMembership(fixture);

    await database.client`
      insert into notifications (
        recipient_user_id, actor_user_id, kind, project_id, project_membership_id
      ) values (
        ${fixture.memberId}, ${fixture.actorId}, 'project_member_added',
        ${fixture.projectId}, ${membershipId}
      )
    `;
    await expect(database.client`
      insert into notifications (
        recipient_user_id, actor_user_id, kind, project_id, project_membership_id
      ) values (
        ${fixture.memberId}, ${fixture.actorId}, 'project_member_added',
        ${fixture.projectId}, ${membershipId}
      )
    `).rejects.toThrow();

    await database.client`
      insert into project_activity_entries (
        project_id, actor_user_id, event_type, subject_user_id, project_membership_id
      ) values (
        ${fixture.projectId}, ${fixture.actorId}, 'member_added',
        ${fixture.memberId}, ${membershipId}
      )
    `;
    await expect(database.client`
      insert into project_activity_entries (
        project_id, actor_user_id, event_type, subject_user_id, project_membership_id
      ) values (
        ${fixture.projectId}, ${fixture.actorId}, 'member_added',
        ${fixture.memberId}, ${membershipId}
      )
    `).rejects.toThrow();
  });

  it("defines the required lookup and partial unique indexes", async () => {
    const rows = await database.client<{ indexname: string; indexdef: string }[]>`
      select indexname, indexdef from pg_indexes
      where schemaname = 'public' and tablename in (
        'project_memberships', 'notifications', 'project_activity_entries'
      )
    `;
    const indexes = new Map(rows.map((row) => [row.indexname, row.indexdef]));

    expect(indexes.get("project_memberships_one_active_per_user")).toContain(
      "WHERE (removed_at IS NULL)",
    );
    expect(indexes.has("project_memberships_user_removed_idx")).toBe(true);
    expect(indexes.has("project_memberships_project_removed_added_idx")).toBe(true);
    expect(indexes.has("notifications_kind_membership_unique")).toBe(true);
    expect(indexes.has("notifications_recipient_read_created_idx")).toBe(true);
    expect(indexes.has("project_activity_entries_event_membership_unique")).toBe(true);
    expect(indexes.has("project_activity_entries_project_created_id_idx")).toBe(true);
  });

  it("uses restrictive foreign keys for retained membership history", async () => {
    const fixture = await createFixture();
    const membershipId = await addMembership(fixture);
    await database.client`
      insert into notifications (
        recipient_user_id, actor_user_id, kind, project_id, project_membership_id
      ) values (
        ${fixture.memberId}, ${fixture.actorId}, 'project_member_added',
        ${fixture.projectId}, ${membershipId}
      )
    `;
    await database.client`
      insert into project_activity_entries (
        project_id, actor_user_id, event_type, subject_user_id, project_membership_id
      ) values (
        ${fixture.projectId}, ${fixture.actorId}, 'member_added',
        ${fixture.memberId}, ${membershipId}
      )
    `;

    await expect(database.client`delete from users where id = ${fixture.memberId}`).rejects.toThrow();
    await expect(database.client`delete from projects where id = ${fixture.projectId}`).rejects.toThrow();
    await expect(database.client`delete from project_memberships where id = ${membershipId}`).rejects.toThrow();
  });
});
