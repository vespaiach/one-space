import { describe, expect, it } from "vitest";
import { validateIssueFields, validateLabelName } from "@/lib/issues/validation";

const VALID_INPUT: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
} = {
  title: "Fix header padding",
  description: "",
  status: "backlog",
  priority: "none",
};

describe("title validation", () => {
  it("rejects blank title", () => {
    expect(validateIssueFields({ ...VALID_INPUT, title: "" }).title).toBeDefined();
  });
  it("rejects title that trims to empty", () => {
    expect(validateIssueFields({ ...VALID_INPUT, title: "   " }).title).toBeDefined();
  });
  it("accepts a title at the 255 character boundary", () => {
    expect(validateIssueFields({ ...VALID_INPUT, title: "a".repeat(255) }).title).toBeUndefined();
  });
  it("rejects a title over 255 characters", () => {
    expect(validateIssueFields({ ...VALID_INPUT, title: "a".repeat(256) }).title).toBeDefined();
  });
});

describe("description validation", () => {
  it("allows an empty description", () => {
    expect(validateIssueFields({ ...VALID_INPUT, description: "" }).description).toBeUndefined();
  });
  it("allows an omitted description", () => {
    expect(validateIssueFields({ ...VALID_INPUT, description: undefined }).description).toBeUndefined();
  });
  it("accepts a description at the 10000 character boundary", () => {
    expect(
      validateIssueFields({ ...VALID_INPUT, description: "a".repeat(10000) }).description,
    ).toBeUndefined();
  });
  it("rejects a description over 10000 characters", () => {
    expect(validateIssueFields({ ...VALID_INPUT, description: "a".repeat(10001) }).description).toBeDefined();
  });
});

describe("status validation", () => {
  for (const status of ["backlog", "todo", "in_progress", "done", "canceled"]) {
    it(`accepts ${status}`, () => {
      expect(validateIssueFields({ ...VALID_INPUT, status }).status).toBeUndefined();
    });
  }
  it("rejects an unknown status", () => {
    expect(validateIssueFields({ ...VALID_INPUT, status: "unknown" }).status).toBeDefined();
  });
  it("allows an omitted status", () => {
    expect(validateIssueFields({ ...VALID_INPUT, status: undefined }).status).toBeUndefined();
  });
});

describe("priority validation", () => {
  for (const priority of ["none", "low", "medium", "high", "urgent"]) {
    it(`accepts ${priority}`, () => {
      expect(validateIssueFields({ ...VALID_INPUT, priority }).priority).toBeUndefined();
    });
  }
  it("rejects an unknown priority", () => {
    expect(validateIssueFields({ ...VALID_INPUT, priority: "unknown" }).priority).toBeDefined();
  });
  it("allows an omitted priority", () => {
    expect(validateIssueFields({ ...VALID_INPUT, priority: undefined }).priority).toBeUndefined();
  });
});

describe("label name validation", () => {
  it("rejects a blank label name", () => {
    expect(validateLabelName("")).toBeDefined();
  });
  it("rejects a label name that trims to empty", () => {
    expect(validateLabelName("   ")).toBeDefined();
  });
  it("accepts a label name at the 50 character boundary", () => {
    expect(validateLabelName("a".repeat(50))).toBeUndefined();
  });
  it("rejects a label name over 50 characters", () => {
    expect(validateLabelName("a".repeat(51))).toBeDefined();
  });
});
