import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { AuthorizationError, requireAdmin, requireForcedReset, requireSession } from "@/lib/auth/guards";
import {
  createForcedResetAuthorization,
  createSession,
  findForcedResetAuthorization,
  findSession,
  revokeAllSessions,
  revokeSession,
} from "@/lib/db/queries/sessions";
import { users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");

async function insertUser(role: "admin" | "member" = "member") {
  const [user] = await database.db
    .insert(users)
    .values({ email: `${crypto.randomUUID()}@example.com`, passwordHash: "hash", role, firstName: "Test", lastName: "User" })
    .returning();
  return user;
}

describe("sessions and authoritative guards", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("creates fixed two-hour and 21-day sessions", async () => {
    const user = await insertUser();
    const standard = await createSession(database.db, user.id, false, now);
    const remembered = await createSession(database.db, user.id, true, now);
    expect(standard.expiresAt.getTime() - now.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(remembered.expiresAt.getTime() - now.getTime()).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it("joins current role and denies suspension or forced reset", async () => {
    const user = await insertUser();
    const session = await createSession(database.db, user.id, false, now);
    expect((await findSession(database.db, session.token, now))?.role).toBe("member");
    await database.db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    expect((await findSession(database.db, session.token, now))?.role).toBe("admin");
    await database.db.update(users).set({ status: "suspended" }).where(eq(users.id, user.id));
    expect(await findSession(database.db, session.token, now)).toBeNull();
    await database.db.update(users).set({ status: "active", forcePasswordReset: true }).where(eq(users.id, user.id));
    expect(await findSession(database.db, session.token, now)).toBeNull();
  });

  it("revokes one session or every session", async () => {
    const user = await insertUser();
    const first = await createSession(database.db, user.id, false, now);
    const second = await createSession(database.db, user.id, false, now);
    await revokeSession(database.db, first.token, now);
    expect(await findSession(database.db, first.token, now)).toBeNull();
    expect(await findSession(database.db, second.token, now)).not.toBeNull();
    await revokeAllSessions(database.db, user.id, now);
    expect(await findSession(database.db, second.token, now)).toBeNull();
  });

  it("enforces session, Admin, and restricted outcomes", async () => {
    const member = {
      sessionId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      role: "member" as const,
      status: "active" as const,
      expiresAt: new Date(now.getTime() + 60_000),
    };
    const admin = { ...member, role: "admin" as const };
    await expect(requireSession(member)).resolves.toEqual(member);
    await expect(requireAdmin(admin)).resolves.toEqual(admin);
    await expect(requireAdmin(member)).rejects.toMatchObject({ code: "forbidden" } satisfies Partial<AuthorizationError>);
    await expect(requireSession(null)).rejects.toMatchObject({ code: "unauthorized" } satisfies Partial<AuthorizationError>);

    const user = await insertUser();
    await database.db.update(users).set({ forcePasswordReset: true }).where(eq(users.id, user.id));
    const authorization = await createForcedResetAuthorization(database.db, user.id, now);
    const context = await findForcedResetAuthorization(database.db, authorization.token, now);
    await expect(requireForcedReset(context)).resolves.toMatchObject({ userId: user.id });
  });
});
