import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { login } from "@/app/actions/auth";
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

export function LoginForm({
  action = login,
  error,
  retryAt,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  error?: string;
  retryAt?: string;
}) {
  const message =
    error === "suspended"
      ? "Your account has been suspended. Contact your administrator."
      : error === "locked"
        ? `Your account is temporarily locked. Try again at ${retryAt ?? "the displayed eligible time"}.`
        : error === "rate-limited"
          ? `Too many login attempts from this source. Try again at ${retryAt ?? "the displayed eligible time"}.`
          : error
            ? "The email or password is incorrect."
            : undefined;
  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      {message ? (
        <StatusMessage
          tone="error"
          focusOnMount>
          {message}
        </StatusMessage>
      ) : null}
      <FormField
        id="login-email"
        label="Email address">
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </FormField>
      <FormField
        id="login-password"
        label="Password">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
      <label>
        <input
          name="rememberMe"
          type="checkbox"
        />{" "}
        Remember me for 21 days
      </label>
      <Link href="/reset-password">Forgot password?</Link>
      <button
        {...stylex.props(styles.button)}
        type="submit">
        Log in
      </button>
    </form>
  );
}