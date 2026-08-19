import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://one-space.test${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("Proxy routing hints", () => {
  it.each(["/login", "/reset-password", "/auth/invitation?token=secret", "/auth/password-reset?token=secret", "/api/health"])(
    "allows public route %s",
    (path) => expect(proxy(request(path)).status).toBe(200),
  );

  it("requires the invitation flow for registration", () => {
    expect(proxy(request("/register")).headers.get("location")).toContain("/register?invalid=true");
    expect(proxy(request("/register", "invitation_flow=value")).status).toBe(200);
  });

  it("does not loop when redirecting to the invalid registration state", () => {
    expect(proxy(request("/register?invalid=true")).status).toBe(200);
  });

  it("requires restricted authorization for forced password change", () => {
    expect(proxy(request("/change-password")).headers.get("location")).toContain("/login");
    expect(proxy(request("/change-password", "forced_reset=value")).status).toBe(200);
  });

  it("redirects protected pages with a safe relative return path", () => {
    const response = proxy(request("/users/abc?tab=profile"));
    expect(response.headers.get("location")).toBe("https://one-space.test/login?from=%2Fusers%2Fabc");
    expect(proxy(request("/admin/invitations", "session=value")).status).toBe(200);
  });

  it("returns a detail-free private 401 for a protected avatar request", async () => {
    const response = proxy(request("/api/users/id/avatar"));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.text()).resolves.toBe("");
  });
});
