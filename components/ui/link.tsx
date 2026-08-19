import * as stylex from "@stylexjs/stylex";
import NextLink from "next/link";
import type { ComponentProps } from "react";
import { colors } from "@/styles/tokens.stylex";

const styles = stylex.create({
  base: {
    color: colors.primary,
    textDecorationLine: "none",
    ":hover": {
      textDecorationLine: "underline",
    },
  },
});

type LinkProps = ComponentProps<typeof NextLink> & {
  xstyle?: stylex.StyleXStyles;
};

export function Link({ xstyle, ...rest }: LinkProps) {
  return (
    <NextLink
      {...stylex.props(styles.base, xstyle)}
      {...rest}
    />
  );
}