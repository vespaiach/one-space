import { describe, expect, it, vi } from "vitest";

describe("instrumentation bootstrap", () => {
  it("runs and propagates bootstrap failure only in the Node runtime", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_RUNTIME", "edge");
    const edge = await import("@/instrumentation");
    await expect(edge.register()).resolves.toBeUndefined();
  });
});
