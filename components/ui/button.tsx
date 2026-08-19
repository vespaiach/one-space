import * as stylex from "@stylexjs/stylex";
import type { ButtonHTMLAttributes } from "react";
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
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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