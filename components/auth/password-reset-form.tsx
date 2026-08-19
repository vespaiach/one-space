import * as stylex from "@stylexjs/stylex";
import { completePasswordReset, requestPasswordReset } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusMessage } from "@/components/ui/status-message";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  field: { display: structure.grid, gap: space.s2 },
  label: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  submitButton: { width: structure.widthFull },
  footer: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  iconCircle: {
    width: "52px",
    height: "52px",
    borderRadius: radius.full,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    backgroundColor: colors.primaryTint,
    color: colors.primary,
  },
  secondaryLink: {
    display: "block",
    width: structure.widthFull,
    textAlign: "center",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: colors.input,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    color: colors.textBody,
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    padding: space.s4,
    ":hover": {
      backgroundColor: colors.accent,
    },
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

  if (mode === "request" && requested)
    return (
      <div {...stylex.props(styles.form)}>
        <div {...stylex.props(styles.iconCircle)}>
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true">
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2.5"
            />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </svg>
        </div>
        <StatusMessage
          tone="success"
          focusOnMount>
          If an account matches that address, a reset email has been requested. Open it to choose a new
          password.
        </StatusMessage>
        <Link
          href="/login"
          xstyle={styles.secondaryLink}>
          Back to login
        </Link>
        <p {...stylex.props(styles.footer)}>
          Didn't get it? <Link href="/reset-password">Try another email</Link>
        </p>
      </div>
    );

  if (mode === "request")
    return (
      <form
        {...stylex.props(styles.form)}
        action={requestAction}>
        {error ? (
          <StatusMessage tone="error">The request could not be completed. Try again.</StatusMessage>
        ) : null}
        <FormField
          id="reset-email"
          label="Email address">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </FormField>
        <Button
          type="submit"
          xstyle={styles.submitButton}>
          Request password reset
        </Button>
        <p {...stylex.props(styles.footer)}>
          <Link href="/login">Back to login</Link>
        </p>
      </form>
    );

  return (
    <form
      {...stylex.props(styles.form)}
      action={completeAction}>
      {error ? (
        <StatusMessage tone="error">Choose matching passwords that satisfy every rule.</StatusMessage>
      ) : null}
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="reset-password">
          New password
        </label>
        <PasswordInput
          id="reset-password"
          name="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="reset-confirm-password">
          Confirm password
        </label>
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
      </div>
      <Button
        type="submit"
        xstyle={styles.submitButton}>
        Reset password
      </Button>
    </form>
  );
}