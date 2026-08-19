import { performance } from "node:perf_hooks";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl) throw new Error("DATABASE_URL_TEST is required");
const parsedUrl = new URL(databaseUrl);
if (!parsedUrl.pathname.toLowerCase().includes("test")) {
  throw new Error("DATABASE_URL_TEST must identify a test database");
}
if (databaseUrl === process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_TEST must not equal DATABASE_URL");
}

const sql = postgres(databaseUrl, { max: 10 });
const runId = `perf-${Date.now()}`;
const actorEmail = `${runId}-admin@example.com`;
const notificationDurations = [];
const projectDurations = [];
let notificationVisible = 0;
let projectVisible = 0;

try {
  const [actor] = await sql`
    insert into users (email, password_hash, role, status, first_name, last_name)
    values (${actorEmail}, 'hash', 'admin', 'active', 'Performance', 'Admin')
    returning id
  `;

  for (let operation = 0; operation < 100; operation += 1) {
    const [recipient] = await sql`
      insert into users (email, password_hash, role, status, first_name, last_name)
      values (${`${runId}-member-${operation}@example.com`}, 'hash', 'member', 'active', 'Member', ${String(operation)})
      returning id
    `;
    const [project] = await sql`
      insert into projects (key, name, description, color, start_date, created_by)
      values (${`T${operation.toString().padStart(3, "0")}`}, ${`Timing Project ${operation}`}, 'Timing', 'blue', '2026-08-19', ${actor.id})
      returning id, key
    `;
    await sql.begin(async (transaction) => {
      const [membership] = await transaction`
        insert into project_memberships (project_id, user_id, added_by_user_id)
        values (${project.id}, ${recipient.id}, ${actor.id})
        returning id
      `;
      await transaction`
        insert into notifications (
          recipient_user_id, actor_user_id, kind, project_id, project_membership_id
        ) values (
          ${recipient.id}, ${actor.id}, 'project_member_added', ${project.id}, ${membership.id}
        )
      `;
      await transaction`
        insert into project_activity_entries (
          project_id, actor_user_id, event_type, subject_user_id, project_membership_id
        ) values (
          ${project.id}, ${actor.id}, 'member_added', ${recipient.id}, ${membership.id}
        )
      `;
    });

    const notificationStartedAt = performance.now();
    const notificationRows = await sql`
      select n.id from notifications n
      join projects p on p.id = n.project_id
      where n.recipient_user_id = ${recipient.id}
        and n.kind = 'project_member_added'
        and n.read_at is null
        and p.key = ${project.key}
    `;
    notificationDurations.push(performance.now() - notificationStartedAt);
    if (notificationRows.length === 1) notificationVisible += 1;

    const projectStartedAt = performance.now();
    const projectRows = await sql`
      select p.id from project_memberships pm
      join projects p on p.id = pm.project_id
      where pm.user_id = ${recipient.id}
        and pm.removed_at is null
        and p.key = ${project.key}
    `;
    projectDurations.push(performance.now() - projectStartedAt);
    if (projectRows.length === 1) projectVisible += 1;
  }

  notificationDurations.sort((left, right) => left - right);
  projectDurations.sort((left, right) => left - right);
  const result = {
    operations: 100,
    notificationVisible,
    projectVisible,
    notificationWithinFiveSeconds: notificationDurations.filter((duration) => duration < 5000).length,
    notificationP99Milliseconds: Math.round(notificationDurations[98]),
    projectMaximumMilliseconds: Math.round(projectDurations[99]),
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (
    result.notificationVisible < 99 ||
    result.projectVisible !== 100 ||
    result.notificationWithinFiveSeconds < 99
  ) {
    process.exitCode = 1;
  }
} finally {
  await sql.begin(async (transaction) => {
    await transaction`
      delete from project_activity_entries
      where project_id in (select id from projects where created_by in (select id from users where email = ${actorEmail}))
    `;
    await transaction`
      delete from notifications
      where project_id in (select id from projects where created_by in (select id from users where email = ${actorEmail}))
    `;
    await transaction`
      delete from project_memberships
      where project_id in (select id from projects where created_by in (select id from users where email = ${actorEmail}))
    `;
    await transaction`delete from projects where created_by in (select id from users where email = ${actorEmail})`;
    await transaction`delete from users where email like ${`${runId}-%@example.com`}`;
  });
  await sql.end({ timeout: 5 });
}
