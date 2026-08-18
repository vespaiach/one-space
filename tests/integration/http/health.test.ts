import { describe, expect, it, vi } from "vitest";
import { evaluateHealth } from "@/lib/health/status";

describe("health capability reporting", () => {
  it("reports healthy bounded component state", async () => {
    await expect(
      evaluateHealth({ database: vi.fn().mockResolvedValue(true), email: vi.fn().mockResolvedValue(true), avatarStorage: vi.fn().mockResolvedValue(true) }),
    ).resolves.toEqual({ status: "ok", database: "ok", email: "ok", avatarStorage: "ok" });
  });

  it("keeps core health available when only email is degraded", async () => {
    await expect(
      evaluateHealth({ database: vi.fn().mockResolvedValue(true), email: vi.fn().mockResolvedValue(false), avatarStorage: vi.fn().mockResolvedValue(true) }),
    ).resolves.toEqual({ status: "degraded", database: "ok", email: "degraded", avatarStorage: "ok" });
  });

  it("reports unhealthy without disclosing probe errors", async () => {
    await expect(
      evaluateHealth({ database: vi.fn().mockRejectedValue(new Error("postgres://secret")), email: vi.fn().mockResolvedValue(true), avatarStorage: vi.fn().mockResolvedValue(false) }),
    ).resolves.toEqual({ status: "unhealthy", database: "unhealthy", email: "ok", avatarStorage: "unhealthy" });
  });
});
