import * as stylex from "@stylexjs/stylex";
import { completeForcedPasswordReset } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusMessage } from "@/components/ui/status-message";
import { colors, space, structure, type } from "@/styles/tokens.stylex";

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
  hint: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    lineHeight: type.leadingNormal,
  },
  submitButton: { width: structure.widthFull },
});

export function ForcedPasswordForm({
  action = completeForcedPasswordReset,
  error,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  error?: string;
}) {
  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <StatusMessage tone="warning">
        Access is restricted to changing your password. A fresh login is required afterward.
      </StatusMessage>
      {error ? (
        <StatusMessage tone="error">Choose matching passwords that satisfy every rule.</StatusMessage>
      ) : null}
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="forced-password">
          New password
        </label>
        <PasswordInput
          id="forced-password"
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
          htmlFor="forced-confirm-password">
          Confirm password
        </label>
        <PasswordInput
          id="forced-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
        />
      </div>
      <Button
        type="submit"
        xstyle={styles.submitButton}>
        Change password
      </Button>
    </form>
  );
}