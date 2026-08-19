import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { completePasswordReset, requestPasswordReset } from "@/app/actions/password";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
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

type PasswordResetFormProps = {
  mode: "request" | "complete" | "invalid";
  requested?: boolean;
  error?: string;
  requestAction?: (formData: FormData) => void | Promise<void>;
  completeAction?: (formData: FormData) => void | Promise<void>;
};

export function PasswordResetForm({
  mode,
  requested = false,
  error,
  requestAction = requestPasswordReset,
  completeAction = completePasswordReset,
}: PasswordResetFormProps) {
  if (mode === "invalid")
    return (
      <StatusMessage tone="error">
        This reset link is invalid or expired. <Link href="/reset-password">Request a new reset</Link>.
      </StatusMessage>
    );
  if (mode === "request")
    return (
      <form
        {...stylex.props(styles.form)}
        action={requestAction}>
        {requested ? (
          <StatusMessage tone="success">
            If an account matches that address, a reset email has been requested.
          </StatusMessage>
        ) : null}
        <FormField
          id="reset-email"
          label="Email address">
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </FormField>
        <button
          {...stylex.props(styles.button)}
          type="submit">
          Request password reset
        </button>
      </form>
    );
  return (
    <form
      {...stylex.props(styles.form)}
      action={completeAction}>
      {error ? (
        <StatusMessage tone="error">Choose matching passwords that satisfy every rule.</StatusMessage>
      ) : null}
      <FormField
        id="reset-password"
        label="New password">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        id="reset-confirm-password"
        label="Confirm password">
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <button
        {...stylex.props(styles.button)}
        type="submit">
        Reset password
      </button>
    </form>
  );
}