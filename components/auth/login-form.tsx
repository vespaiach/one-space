"use client";

import * as stylex from "@stylexjs/stylex";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import { PasswordInput } from "@/components/ui/password-input";
import { StatusMessage } from "@/components/ui/status-message";
import { colors, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  form: { display: structure.block },
  field: { marginBottom: space.s6 },
  label: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: space.s3,
  },
  row: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.justifyBetween,
    marginBottom: space.s6,
  },
  remember: {
    display: "inline-flex",
    alignItems: structure.alignCenter,
    gap: space.s3,
    fontSize: type.sizeSm,
    color: colors.textBody,
  },
  checkbox: {
    width: "15px",
    height: "15px",
    accentColor: colors.primary,
  },
  forgotLink: {
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
  },
  submitButton: { width: structure.widthFull },
  hint: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: space.s6,
  },
  statusSpacing: { marginBottom: space.s6 },
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
        <div {...stylex.props(styles.statusSpacing)}>
          <StatusMessage
            tone="error"
            focusOnMount>
            {message}
          </StatusMessage>
        </div>
      ) : null}
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="login-email">
          Email
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="login-password">
          Password
        </label>
        <PasswordInput
          id="login-password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </div>
      <div {...stylex.props(styles.row)}>
        <label {...stylex.props(styles.remember)}>
          <input
            {...stylex.props(styles.checkbox)}
            name="rememberMe"
            type="checkbox"
          />
          Remember me
        </label>
        <Link
          xstyle={styles.forgotLink}
          href="/reset-password">
          Forgot password?
        </Link>
      </div>
      <Button
        type="submit"
        xstyle={styles.submitButton}>
        Login
      </Button>
      <p {...stylex.props(styles.hint)}>Need an account? Ask an administrator to invite you.</p>
    </form>
  );
}