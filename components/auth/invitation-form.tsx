import * as stylex from "@stylexjs/stylex";
import { sendInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { StatusMessage } from "@/components/ui/status-message";
import { INVITATION_NON_REVOCATION_WARNING } from "@/lib/invitations/service";
import { space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
});

type InvitationFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  emailCapability?: "ok" | "degraded";
  result?: string;
};

export function InvitationForm({
  action = sendInvitation,
  emailCapability = "ok",
  result,
}: InvitationFormProps) {
  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      {emailCapability === "degraded" ? (
        <StatusMessage tone="warning">
          Email delivery is degraded. You can retry when service recovers.
        </StatusMessage>
      ) : null}
      {result === "sent" ? (
        <StatusMessage tone="success">Invitation accepted for delivery.</StatusMessage>
      ) : null}
      {result && result !== "sent" ? (
        <StatusMessage tone="error">
          {result === "rate-limited"
            ? "Too many invitations were attempted. Wait for the rolling limit to clear, then retry."
            : "The invitation could not be sent. Review the address or try again."}
        </StatusMessage>
      ) : null}
      <FormField
        id="invitation-email"
        label="Email address">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </FormField>
      <StatusMessage tone="warning">{INVITATION_NON_REVOCATION_WARNING}</StatusMessage>
      <Button type="submit">Send invitation</Button>
    </form>
  );
}