import * as stylex from "@stylexjs/stylex";
import { register } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusMessage } from "@/components/ui/status-message";
import { INVITATION_NON_REVOCATION_WARNING } from "@/lib/invitations/service";
import { colors, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  row: { display: structure.flex, gap: space.s5 },
  field: { display: structure.grid, gap: space.s2 },
  label: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  hint: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    lineHeight: type.leadingNormal,
  },
  submitButton: { width: structure.widthFull },
});

type RegistrationFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  email?: string;
  invalid?: boolean;
  error?: string;
};

export function RegistrationForm({
  action = register,
  email = "",
  invalid = false,
  error,
}: RegistrationFormProps) {
  if (invalid) {
    return (
      <StatusMessage tone="error">
        This invitation link is invalid or expired. Ask an Admin for a new invitation.
      </StatusMessage>
    );
  }
  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      {error ? (
        <StatusMessage tone="error">
          Registration could not be completed. Review every field and try again.
        </StatusMessage>
      ) : null}
      <FormField
        id="registration-email"
        label="Invited email">
        <Input
          value={email}
          readOnly
        />
      </FormField>
      <div {...stylex.props(styles.row)}>
        <FormField
          id="first-name"
          label="First name">
          <Input
            name="firstName"
            autoComplete="given-name"
            required
          />
        </FormField>
        <FormField
          id="last-name"
          label="Last name">
          <Input
            name="lastName"
            autoComplete="family-name"
            required
          />
        </FormField>
      </div>
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="password">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
        <p {...stylex.props(styles.hint)}>
          Use 8 to 128 characters with uppercase, lowercase, a number, and a special character.
        </p>
      </div>
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="confirm-password">
          Confirm password
        </label>
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
      </div>
      <StatusMessage tone="warning">{INVITATION_NON_REVOCATION_WARNING}</StatusMessage>
      <Button
        type="submit"
        xstyle={styles.submitButton}>
        Create account
      </Button>
    </form>
  );
}