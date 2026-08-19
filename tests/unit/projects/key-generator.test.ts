import { describe, expect, it } from "vitest";
import { generateProjectKey } from "@/lib/projects/key-generator";

describe("generateProjectKey", () => {
  it("takes first letter of each word for multi-word names", () => {
    expect(generateProjectKey("Marketing Campaign")).toBe("MC");
  });

  it("pads from first word characters for single-word names", () => {
    expect(generateProjectKey("Marketing")).toBe("MA");
  });

  it("truncates at 6 characters", () => {
    expect(generateProjectKey("Alpha Beta Gamma Delta Epsilon Zeta")).toBe("ABGDEZ");
  });

  it("strips non-alphanumeric characters", () => {
    expect(generateProjectKey("Hello-World")).toBe("HW");
  });

  it("returns PROJ fallback when result is empty", () => {
    expect(generateProjectKey("!!!")).toBe("PROJ");
  });

  it("pads single-letter word from first word", () => {
    expect(generateProjectKey("A B")).toBe("AB");
  });
});
