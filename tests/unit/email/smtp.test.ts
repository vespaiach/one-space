import { describe, expect, it, vi } from "vitest";
import { createInvitationMessage, createPasswordResetMessage } from "@/lib/email/messages";
import { createSmtpAdapter } from "@/lib/email/smtp";

describe("SMTP adapter", () => {
  it("reports provider acceptance without returning recipient or token data", async () => {
    const sendMail = vi.fn().mockResolvedValue({ accepted: ["user@example.com"], rejected: [] });
    const adapter = createSmtpAdapter({ sendMail });
    await expect(adapter.send(createInvitationMessage("user@example.com", "https://one-space.test/token"))).resolves.toEqual({
      status: "accepted",
    });
  });

  it("maps rejection and timeout to bounded failures", async () => {
    const rejected = createSmtpAdapter({
      sendMail: vi.fn().mockResolvedValue({ accepted: [], rejected: ["user@example.com"] }),
    });
    await expect(rejected.send(createPasswordResetMessage("user@example.com", "https://one-space.test/token"))).resolves.toEqual({
      status: "rejected",
    });

    const timedOut = createSmtpAdapter({ sendMail: vi.fn().mockRejectedValue(new Error("ETIMEDOUT recipient secret")) });
    await expect(timedOut.send(createInvitationMessage("user@example.com", "https://one-space.test/token"))).resolves.toEqual({
      status: "failed",
    });
  });

  it("treats delayed or duplicate accepted recipients as one acceptance", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      accepted: ["user@example.com", "user@example.com"],
      rejected: [],
      response: "queued",
    });
    const adapter = createSmtpAdapter({ sendMail });
    await expect(adapter.send(createInvitationMessage("user@example.com", "https://one-space.test/token"))).resolves.toEqual({
      status: "accepted",
    });
  });
});
