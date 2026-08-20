import * as stylex from "@stylexjs/stylex";
import type { ButtonHTMLAttributes, LinkHTMLAttributes } from "react";
import { colors, radius, shadow, space, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  primary: {
    borderWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    fontSize: type.sizeBase,
    fontWeight: type.weightSemibold,
    padding: space.s4,
    boxShadow: shadow.sm,
    cursor: "pointer",
    ":hover": {
      filter: "brightness(1.05)",
    },
    ":disabled": {
      cursor: "default",
      opacity: 0.6,
    },
  },

  iconButton: (size: "small" | "large") => ({
    flex: "0 0 auto",
    width: size === "small" ? "24px" : "32px",
    height: size === "small" ? "24px" : "32px",
    border: "none",
    borderRadius: radius.sm,
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "rgb(239, 227, 206)",
    },
  }),
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  xstyle?: stylex.StyleXStyles;
};

type LinkProps = LinkHTMLAttributes<HTMLAnchorElement> & {
  xstyle?: stylex.StyleXStyles;
};

export function Button({ type = "button", xstyle, ...rest }: ButtonProps) {
  return (
    <button
      {...stylex.props(styles.primary, xstyle)}
      type={type}
      {...rest}
    />
  );
}

export function IconButton({ size = "small", xstyle, ...rest }: ButtonProps & { size?: "small" | "large" }) {
  return (
    <button
      {...stylex.props(styles.iconButton(size), xstyle)}
      type="button"
      {...rest}
    />
  );
}

export function IconLink({ size = "small", xstyle, ...rest }: LinkProps & { size?: "small" | "large" }) {
  return (
    <a
      {...stylex.props(styles.iconButton(size), xstyle)}
      type="button"
      {...rest}
    />
  );
}