import * as stylex from "@stylexjs/stylex";
import type { InputHTMLAttributes } from "react";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";

export const inputStyles = stylex.create({
  base: {
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
});

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  xstyle?: stylex.StyleXStyles;
};

export function Input({ xstyle, ...rest }: InputProps) {
  return (
    <input
      {...stylex.props(inputStyles.base, xstyle)}
      {...rest}
    />
  );
}