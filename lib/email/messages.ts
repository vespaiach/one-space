import type { Options } from "nodemailer/lib/mailer";

export function createInvitationMessage(to: string, invitationUrl: string): Options {
  return {
    to,
    subject: "You are invited to One Space",
    text: `Complete your registration: ${invitationUrl}\n\nThis link expires in seven days. A resend does not invalidate earlier links.`,
  };
}

export function createPasswordResetMessage(to: string, resetUrl: string): Options {
  return {
    to,
    subject: "Reset your One Space password",
    text: `Reset your password: ${resetUrl}\n\nThis single-use link expires in 60 minutes.`,
  };
}