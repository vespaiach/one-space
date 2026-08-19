"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useState } from "react";
import { login } from "@/app/actions/auth";
import Eye from "@/components/icons/eye";
import EyeOff from "@/components/icons/eye-off";
import { StatusMessage } from "@/components/ui/status-message";
import { colors, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";

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
  input: {
    width: structure.widthFull,
    paddingBlock: space.s4,
    paddingInline: space.s5,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    fontSize: type.sizeBase,
    color: colors.foreground,
    outlineStyle: "none",
    ":focus": {
      borderColor: colors.primary,
    },
  },
  passwordWrap: { position: "relative" },
  passwordInput: { paddingRight: "42px" },
  toggleButton: {
    position: "absolute",
    right: space.s3,
    top: "50%",
    transform: "translateY(-50%)",
    width: "28px",
    height: "28px",
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    color: colors.mutedForeground,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.textBody,
    },
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
    color: colors.primary,
    fontWeight: type.weightMedium,
  },
  submit: {
    width: structure.widthFull,
    paddingBlock: space.s4,
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    fontSize: type.sizeBase,
    fontWeight: type.weightSemibold,
    boxShadow: shadow.sm,
    ":hover": {
      filter: "brightness(1.05)",
    },
  },
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
  const [showPassword, setShowPassword] = useState(false);
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
        <input
          {...stylex.props(styles.input)}
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
        <div {...stylex.props(styles.passwordWrap)}>
          <input
            {...stylex.props(styles.input, styles.passwordInput)}
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button
            {...stylex.props(styles.toggleButton)}
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
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
          {...stylex.props(styles.forgotLink)}
          href="/reset-password">
          Forgot password?
        </Link>
      </div>
      <button
        {...stylex.props(styles.submit)}
        type="submit">
        Login
      </button>
      <p {...stylex.props(styles.hint)}>Need an account? Ask a workspace admin to invite you.</p>
    </form>
  );
}