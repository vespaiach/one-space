import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "@/components/users/profile-editor";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Amy",
  lastName: "Able",
  role: "member" as const,
  status: "active" as const,
  phoneNumber: null,
  slackHandle: null,
  avatarKey: null,
};

describe("profile editor", () => {
  it("renders role read-only, linked fields, Save, and Cancel", () => {
    render(<ProfileEditor user={user} error="invalid" field="firstName" action={vi.fn()} />);
    expect((screen.getByDisplayValue("Member") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.getByRole("button", { name: /save/i })).not.toBeNull();
    expect(screen.getByRole("link", { name: /cancel/i }).getAttribute("href")).toBe(`/users/${user.id}`);
    expect(screen.queryByLabelText(/avatar/i)).toBeNull();
    expect(screen.getByLabelText("First name").getAttribute("aria-describedby")).toContain(
      "edit-first-name-error",
    );
    expect(screen.getByRole("status")).toBe(document.activeElement);
  });
});
