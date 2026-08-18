import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InvitationForm } from "@/components/auth/invitation-form";
import { RegistrationForm } from "@/components/auth/registration-form";

describe("invitation and registration UI", () => {
  it("renders the mandatory stateless resend warning and capability state", () => {
    render(<InvitationForm action={vi.fn()} emailCapability="degraded" />);
    expect(screen.getByText(/resending does not invalidate/i)).not.toBeNull();
    expect(screen.getByText(/email delivery is degraded/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /send invitation/i })).not.toBeNull();
  });

  it("renders the accessible single-step registration fields", () => {
    render(<RegistrationForm action={vi.fn()} email="new@example.com" />);
    expect((screen.getByDisplayValue("new@example.com") as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText(/^password$/i) as HTMLInputElement).required).toBe(true);
  });

  it("renders one invalid-link state without a registration form", () => {
    render(<RegistrationForm action={vi.fn()} invalid />);
    expect(screen.getByRole("status").textContent).toMatch(/invitation link is invalid or expired/i);
    expect(screen.queryByRole("button", { name: /create account/i })).toBeNull();
  });
});
