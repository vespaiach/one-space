import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sendInvitationForAdmin } from "@/lib/invitations/service";
import { auditEvents, users } from "@/lib/db/schema";
import { createTestDatabase, truncateFeatureTables } from "@/tests/helpers/database";

const database = createTestDatabase();
const now = new Date("2026-08-18T12:00:00.000Z");
const settings = {
  actorId: crypto.randomUUID(),
  hashKey: "rate-secret",
  tokenKey: Buffer.alloc(32, 7),
  appOrigin: "https://one-space.test",
  now,
};

describe("invitation action", () => {
  beforeEach(async () => {
    await truncateFeatureTables(database.client);
    await database.db.insert(users).values({
      id: settings.actorId,
      email: "admin@example.com",
      passwordHash: "hash",
      firstName: "Admin",
      lastName: "User",
      role: "admin",
    });
  });
  afterAll(async () => database.close());

  it("sends a fresh seven-day link only after SMTP acceptance", async () => {
    const send = vi.fn().mockResolvedValue({ status: "accepted" });
    const result = await sendInvitationForAdmin(database.db, { ...settings, email: " New@Example.COM ", send });
    expect(result.status).toBe("sent");
    expect(result.warning).toContain("does not invalidate");
    const message = send.mock.calls[0]?.[0];
    expect(message.to).toBe("new@example.com");
    expect(message.text).toContain("/auth/invitation?token=");
  });

  it("rejects registered canonical emails and both rolling limits", async () => {
    await database.db.insert(users).values({
      email: "member@example.com",
      passwordHash: "hash",
      firstName: "Member",
      lastName: "User",
    });
    const send = vi.fn();
    await expect(sendInvitationForAdmin(database.db, { ...settings, email: " MEMBER@example.com ", send })).resolves.toMatchObject({ status: "ineligible" });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not report sent when SMTP rejects or fails", async () => {
    for (const deliveryStatus of ["rejected", "failed"] as const) {
      await expect(
        sendInvitationForAdmin(database.db, {
          ...settings,
          email: `${deliveryStatus}@example.com`,
          send: vi.fn().mockResolvedValue({ status: deliveryStatus }),
        }),
      ).resolves.toMatchObject({ status: "delivery-failed" });
    }
    expect((await database.db.select().from(auditEvents)).every((event) => event.reasonCode === "delivery_failed")).toBe(true);
    expect(JSON.stringify(await database.db.select().from(auditEvents))).not.toContain("@example.com");
  });
});
