import * as stylex from "@stylexjs/stylex";
import { completeForcedPasswordReset } from "@/app/actions/password";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import { space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
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
      <FormField
        id="forced-password"
        label="New password"
        hint="Use 8 to 128 characters with uppercase, lowercase, a number, and a special character.">
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField
        id="forced-confirm-password"
        label="Confirm password">
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <Button type="submit">Change password</Button>
    </form>
  );
}