import { describe, expect, it } from "vitest";
import { validateProjectFields } from "@/lib/projects/validation";

const ALLOWED_COLORS = ["red", "coral", "orange", "amber", "yellow", "lime", "green", "teal", "sky", "blue", "purple", "pink"] as const;

const VALID_INPUT = {
  name: "Test Project",
  key: "PROJ",
  description: "Valid description",
  color: "blue",
  startDate: "2026-09-01",
  endDate: undefined as string | undefined,
};

describe("key validation", () => {
  it("accepts PROJ", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "PROJ" }).key).toBeUndefined();
  });

  it("accepts two-character key", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "AB" }).key).toBeUndefined();
  });

  it("rejects lowercase key", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "proj" }).key).toBeDefined();
  });

  it("rejects key of length 1", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "P" }).key).toBeDefined();
  });

  it("rejects key longer than 6 characters", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "TOOLONG7" }).key).toBeDefined();
  });

  it("rejects key with special characters", () => {
    expect(validateProjectFields({ ...VALID_INPUT, key: "P!" }).key).toBeDefined();
  });
});

describe("color validation", () => {
  it("accepts all 12 allowed color keys", () => {
    for (const color of ALLOWED_COLORS) {
      expect(validateProjectFields({ ...VALID_INPUT, color }).color).toBeUndefined();
    }
  });

  it("rejects gray", () => {
    expect(validateProjectFields({ ...VALID_INPUT, color: "gray" }).color).toBeDefined();
  });

  it("rejects black", () => {
    expect(validateProjectFields({ ...VALID_INPUT, color: "black" }).color).toBeDefined();
  });

  it("rejects empty color", () => {
    expect(validateProjectFields({ ...VALID_INPUT, color: "" }).color).toBeDefined();
  });
});

describe("date validation", () => {
  it("rejects endDate equal to startDate", () => {
    expect(
      validateProjectFields({ ...VALID_INPUT, startDate: "2026-09-01", endDate: "2026-09-01" }).endDate,
    ).toBeDefined();
  });

  it("rejects endDate before startDate", () => {
    expect(
      validateProjectFields({ ...VALID_INPUT, startDate: "2026-09-01", endDate: "2026-08-31" }).endDate,
    ).toBeDefined();
  });

  it("accepts missing endDate", () => {
    expect(
      validateProjectFields({ ...VALID_INPUT, endDate: undefined }).endDate,
    ).toBeUndefined();
  });
});

describe("name validation", () => {
  it("rejects blank name", () => {
    expect(validateProjectFields({ ...VALID_INPUT, name: "" }).name).toBeDefined();
  });

  it("rejects name that trims to empty", () => {
    expect(validateProjectFields({ ...VALID_INPUT, name: "   " }).name).toBeDefined();
  });
});

describe("description validation", () => {
  it("rejects description over 10000 characters", () => {
    expect(
      validateProjectFields({ ...VALID_INPUT, description: "a".repeat(10001) }).description,
    ).toBeDefined();
  });
});
