import { describe, expect, it } from "vitest";
import {
  parseCanonicalUuid,
  validateAddProjectMemberInput,
} from "@/lib/validation/identifiers";

const projectId = "0198c532-1e16-7f2a-a3b4-31a034e98980";
const userId = "6f9619ff-8b86-d011-b42d-00c04fc964ff";

describe("parseCanonicalUuid", () => {
  it("accepts canonical lowercase UUIDs", () => {
    expect(parseCanonicalUuid(projectId)).toBe(projectId);
    expect(parseCanonicalUuid(userId)).toBe(userId);
  });

  it.each([
    undefined,
    null,
    "",
    " 6f9619ff-8b86-d011-b42d-00c04fc964ff",
    "6F9619FF-8B86-D011-B42D-00C04FC964FF",
    "6f9619ff8b86d011b42d00c04fc964ff",
    "not-a-uuid",
  ])("rejects non-canonical input %s", (value) => {
    expect(parseCanonicalUuid(value)).toBeNull();
  });
});

describe("validateAddProjectMemberInput", () => {
  it("returns only validated Project and user identifiers", () => {
    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("userId", userId);
    formData.set("actorUserId", "0f9619ff-8b86-d011-b42d-00c04fc964ff");
    formData.set("role", "admin");
    formData.set("projectName", "Client-authored Project");
    formData.set("userName", "Client-authored User");
    formData.set("notificationText", "Client-authored Notification");
    formData.set("destination", "/admin/users");

    expect(validateAddProjectMemberInput(formData)).toEqual({
      success: true,
      data: { projectId, userId },
    });
  });

  it("reports both required identifier errors", () => {
    expect(validateAddProjectMemberInput(new FormData())).toEqual({
      success: false,
      fieldErrors: {
        projectId: ["Choose a valid Project."],
        userId: ["Choose a valid user."],
      },
    });
  });

  it("associates malformed identifiers with their fields", () => {
    const formData = new FormData();
    formData.set("projectId", "invalid");
    formData.set("userId", userId);

    expect(validateAddProjectMemberInput(formData)).toEqual({
      success: false,
      fieldErrors: { projectId: ["Choose a valid Project."] },
    });
  });
});
