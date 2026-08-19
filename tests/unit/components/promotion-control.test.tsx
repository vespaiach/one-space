import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberManagementControls } from "@/components/users/member-management-controls";

describe("promotion control", () => {
  it("is present only for an active Member and names the confirmation action", () => {
    render(<MemberManagementControls user={{ id: "11111111-1111-4111-8111-111111111111", firstName: "Member", lastName: "User", role: "member", status: "active", phoneNumber: null, slackHandle: null, avatarKey: null }} actions={{ suspend: vi.fn(), reinstate: vi.fn(), forceReset: vi.fn(), promote: vi.fn() }} />);
    expect(screen.getByRole("button", { name: /promote member to admin/i })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /promote member to admin/i }));
    expect(screen.getByRole("button", { name: /confirm promote member to admin/i })).toBe(document.activeElement);
  });
});
