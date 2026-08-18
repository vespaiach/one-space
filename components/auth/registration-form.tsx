import * as stylex from "@stylexjs/stylex";
import { register } from "@/app/actions/auth";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import { INVITATION_NON_REVOCATION_WARNING } from "@/lib/invitations/service";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    color: colors.primaryForeground,
    fontWeight: type.weightSemibold,
    padding: space.s5,
  },
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
        <input
          value={email}
          readOnly
        />
      </FormField>
      <FormField
        id="first-name"
        label="First name">
        <input
          name="firstName"
          autoComplete="given-name"
          required
        />
      </FormField>
      <FormField
        id="last-name"
        label="Last name">
        <input
          name="lastName"
          autoComplete="family-name"
          required
        />
      </FormField>
      <FormField
        id="password"
        label="Password"
        hint="Use 8 to 128 characters with uppercase, lowercase, a number, and a special character.">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        id="confirm-password"
        label="Confirm password">
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <StatusMessage tone="warning">{INVITATION_NON_REVOCATION_WARNING}</StatusMessage>
      <button
        {...stylex.props(styles.button)}
        type="submit">
        Create account
      </button>
    </form>
  );
}