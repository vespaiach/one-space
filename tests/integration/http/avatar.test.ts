import { describe, expect, it } from "vitest";
import { avatarResponseHeaders } from "@/lib/avatar/http";

describe("private avatar delivery", () => {
  it("uses fixed content type, nosniff, and private no-store caching", () => {
    const headers = avatarResponseHeaders("image/png");
    expect(headers.get("Content-Type")).toBe("image/png");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Cache-Control")).toBe("private, no-store");
  });
});
