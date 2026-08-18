import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberManagementControls } from "@/components/users/member-management-controls";
import { LoginForm } from "@/components/auth/login-form";

const user = { id: "11111111-1111-4111-8111-111111111111", firstName: "Member", lastName: "User", role: "member" as const, status: "active" as const, phoneNumber: null, slackHandle: null, avatarKey: null };

describe("Member management controls", () => {
  it("shows eligible actions and no deletion control", () => {
    render(<MemberManagementControls user={user} actions={{ suspend: vi.fn(), reinstate: vi.fn(), forceReset: vi.fn(), promote: vi.fn() }} />);
    expect(screen.getByRole("button", { name: /suspend/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /force password reset/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /promote/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
  });

  it("requires confirmation, moves focus, and returns focus on cancellation", async () => {
    render(<MemberManagementControls user={user} actions={{ suspend: vi.fn(), reinstate: vi.fn(), forceReset: vi.fn(), promote: vi.fn() }} />);
    const trigger = screen.getByRole("button", { name: /suspend member/i });
    fireEvent.click(trigger);
    const confirm = screen.getByRole("button", { name: /confirm suspend member/i });
    expect(document.activeElement).toBe(confirm);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await Promise.resolve();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /suspend member/i }));
  });

  it("shows reinstate but not promote for suspended Members", () => {
    render(<MemberManagementControls user={{ ...user, status: "suspended" }} actions={{ suspend: vi.fn(), reinstate: vi.fn(), forceReset: vi.fn(), promote: vi.fn() }} />);
    expect(screen.getByRole("button", { name: /reinstate/i })).not.toBeNull();
    expect(screen.queryByRole("button", { name: /promote/i })).toBeNull();
  });

  it("announces explicit suspension and lockout states", () => {
    const { rerender } = render(<LoginForm action={vi.fn()} error="suspended" />);
    expect(screen.getByRole("status").textContent).toMatch(/account has been suspended/i);
    rerender(<LoginForm action={vi.fn()} error="locked" retryAt="2026-08-18T12:15:00.000Z" />);
    expect(screen.getByRole("status").textContent).toContain("2026-08-18T12:15:00.000Z");
  });
});
