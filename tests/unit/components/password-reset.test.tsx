import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordResetForm } from "@/components/auth/password-reset-form";

describe("password reset UI", () => {
  it("renders the request form and generic confirmation", () => {
    const { rerender } = render(<PasswordResetForm requestAction={vi.fn()} completeAction={vi.fn()} mode="request" />);
    expect(screen.getByLabelText(/email/i)).not.toBeNull();
    rerender(<PasswordResetForm requestAction={vi.fn()} completeAction={vi.fn()} mode="request" requested />);
    expect(screen.getByRole("status").textContent).toMatch(/if an account matches/i);
  });

  it("renders completion and safe invalid-link recovery modes", () => {
    const { rerender } = render(<PasswordResetForm requestAction={vi.fn()} completeAction={vi.fn()} mode="complete" />);
    expect(screen.getByLabelText(/new password/i)).not.toBeNull();
    rerender(<PasswordResetForm requestAction={vi.fn()} completeAction={vi.fn()} mode="invalid" />);
    expect(screen.getByRole("link", { name: /request a new reset/i })).not.toBeNull();
  });
});
