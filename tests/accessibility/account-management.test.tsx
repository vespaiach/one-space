import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ForcedPasswordForm } from "@/components/auth/forced-password-form";
import { InvitationForm } from "@/components/auth/invitation-form";
import { LoginForm } from "@/components/auth/login-form";
import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { RegistrationForm } from "@/components/auth/registration-form";
import { MemberManagementControls } from "@/components/users/member-management-controls";
import { ProfileEditor } from "@/components/users/profile-editor";
import { UserDirectory } from "@/components/users/user-directory";
import { UserProfile } from "@/components/users/user-profile";

const member = {
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Member",
  lastName: "User",
  role: "member" as const,
  status: "active" as const,
  phoneNumber: null,
  slackHandle: null,
  avatarKey: null,
};
const action = vi.fn();

axe.configure({ rules: [{ id: "color-contrast", enabled: false }] });

async function expectNoSeriousViolations(view: ReactNode) {
  const { container } = render(<main>{view}</main>);
  const results = await axe.run(container);
  const serious = results.violations.filter(({ impact }) => impact === "critical" || impact === "serious");
  expect(serious).toEqual([]);
  cleanup();
}

describe("account management accessibility", () => {
  it("has no critical or serious axe findings across in-scope states", async () => {
    const states: ReactNode[] = [
      <InvitationForm key="invite-normal" action={action} />,
      <InvitationForm key="invite-degraded" action={action} emailCapability="degraded" />,
      <InvitationForm key="invite-error" action={action} result="delivery-failed" />,
      <InvitationForm key="invite-limited" action={action} result="rate-limited" />,
      <RegistrationForm key="registration-normal" action={action} email="member@example.com" />,
      <RegistrationForm key="registration-error" action={action} email="member@example.com" error="invalid" />,
      <RegistrationForm key="registration-invalid" invalid />,
      <LoginForm key="login-normal" action={action} />,
      <LoginForm key="login-invalid" action={action} error="invalid" />,
      <LoginForm key="login-suspended" action={action} error="suspended" />,
      <LoginForm key="login-locked" action={action} error="locked" retryAt="2026-08-18T12:15:00Z" />,
      <LoginForm key="login-limited" action={action} error="rate-limited" retryAt="2026-08-18T12:15:00Z" />,
      <PasswordResetForm key="reset-request" mode="request" requestAction={action} />,
      <PasswordResetForm key="reset-confirmation" mode="request" requested requestAction={action} />,
      <PasswordResetForm key="reset-complete" mode="complete" completeAction={action} />,
      <PasswordResetForm key="reset-error" mode="complete" error="invalid" completeAction={action} />,
      <PasswordResetForm key="reset-invalid" mode="invalid" />,
      <ForcedPasswordForm key="forced" action={action} />,
      <ForcedPasswordForm key="forced-error" action={action} error="invalid" />,
      <UserDirectory key="directory" users={[member]} />,
      <UserProfile key="profile" user={member} />,
      <ProfileEditor key="editor" user={member} action={action} />,
      <MemberManagementControls
        key="management"
        user={member}
        actions={{ suspend: action, reinstate: action, forceReset: action, promote: action }}
      />,
    ];
    for (const state of states) await expectNoSeriousViolations(state);
  });
});
