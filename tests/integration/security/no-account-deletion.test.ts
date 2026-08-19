import { describe, expect, it } from "vitest";
import * as userActions from "@/app/actions/users";

describe("no account deletion surface", () => {
  it("exports no deletion action", () => {
    expect(Object.keys(userActions).some((name) => /delete|remove.*user/i.test(name))).toBe(false);
  });
});
