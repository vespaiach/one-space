import { readFile } from "node:fs/promises";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createSession } from "@/lib/db/queries/sessions";
import { checkRateLimit } from "@/lib/rate-limit/rate-limiter";
import { auditEvents, rateLimitEvents, sessions, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();

describe("credential and disclosure hygiene", () => {
  beforeEach(async () => truncateFeatureTables(database.client));
  afterAll(async () => database.close());

  it("stores credential and rate-limit hashes without raw secrets or source values", async () => {
    const [user] = await database.db
      .insert(users)
      .values({ email: "member@example.com", passwordHash: "password-hash", firstName: "Member", lastName: "User" })
      .returning();
    const session = await createSession(database.db, user.id, false);
    const source = "203.0.113.19";
    await checkRateLimit(database.db, {
      scope: "login_source",
      key: source,
      hashKey: "rate-limit-secret",
      now: new Date("2026-08-18T12:00:00Z"),
    });
    const storedSession = JSON.stringify(await database.db.select().from(sessions));
    const storedLimits = JSON.stringify(await database.db.select().from(rateLimitEvents));
    expect(storedSession).not.toContain(session.token);
    expect(storedSession).not.toContain("password-hash");
    expect(storedLimits).not.toContain(source);
  });

  it("keeps audit schema bounded and token intake responses non-referring", async () => {
    const columns = Object.keys(auditEvents);
    expect(columns).not.toEqual(expect.arrayContaining(["email", "phoneNumber", "slackHandle", "token", "image"]));
    const invitationRoute = await readFile("app/auth/invitation/route.ts", "utf8");
    const resetRoute = await readFile("app/auth/password-reset/route.ts", "utf8");
    expect(invitationRoute).toContain('"Referrer-Policy", "no-referrer"');
    expect(resetRoute).toContain('"Referrer-Policy", "no-referrer"');
  });

  it("contains no application logging path for profile values, sources, tokens, or image bytes", async () => {
    const files = [
      "app/actions/auth.ts",
      "app/actions/invitations.ts",
      "app/actions/password.ts",
      "app/actions/users.ts",
      "lib/invitations/service.ts",
      "lib/password-reset/service.ts",
      "lib/avatar/profile.ts",
    ];
    for (const file of files) {
      expect(await readFile(file, "utf8")).not.toMatch(/console\.(?:log|info|warn|error)/);
    }
  });
});
