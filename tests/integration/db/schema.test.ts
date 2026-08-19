import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

describe("feature schema", () => {
  beforeAll(async () => {
    await database.client`select 1`;
  });

  beforeEach(async () => {
    await truncateFeatureTables(database.client);
  });

  afterAll(async () => {
    await database.close();
  });

  it("creates all seven entities", async () => {
    const rows = await database.client<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name in (
        'users', 'sessions', 'password_reset_tokens', 'forced_reset_authorizations',
        'rate_limit_events', 'rate_limit_states', 'audit_events'
      )
    `;
    expect(rows.map((row) => row.table_name).sort()).toHaveLength(7);
  });

  it("enforces canonical email uniqueness and account state enums", async () => {
    await database.client`
      insert into users (email, password_hash, role, status, first_name, last_name)
      values ('person@example.com', 'hash', 'member', 'active', 'First', 'Last')
    `;
    await expect(database.client`
      insert into users (email, password_hash, role, status, first_name, last_name)
      values ('person@example.com', 'hash', 'member', 'active', 'Other', 'Person')
    `).rejects.toThrow();
    await expect(database.client`
      insert into users (email, password_hash, role, status, first_name, last_name)
      values ('other@example.com', 'hash', 'owner', 'active', 'Other', 'Person')
    `).rejects.toThrow();
  });

  it("uses restrictive user relations", async () => {
    const [user] = await database.client<{ id: string }[]>`
      insert into users (email, password_hash, role, status, first_name, last_name)
      values ('person@example.com', 'hash', 'member', 'active', 'First', 'Last') returning id
    `;
    await database.client`
      insert into sessions (token_hash, user_id, expires_at)
      values (${'a'.repeat(64)}, ${user.id}, now() + interval '2 hours')
    `;
    await expect(database.client`delete from users where id = ${user.id}`).rejects.toThrow();
  });
});
