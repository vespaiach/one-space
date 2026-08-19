import * as stylex from "@stylexjs/stylex";
import React from "react";
import { colors, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  field: {
    display: structure.grid,
    gap: space.s2,
  },
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
  error: {
    color: colors.destructive,
    fontSize: type.sizeSm,
  },
});

type FormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactElement<React.InputHTMLAttributes<HTMLInputElement>>;
};

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div {...stylex.props(styles.field)}>
      <label
        {...stylex.props(styles.label)}
        htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p
          {...stylex.props(styles.hint)}
          id={hintId}>
          {hint}
        </p>
      ) : null}
      {React.cloneElement(children, {
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": Boolean(error),
      })}
      {error ? (
        <p
          {...stylex.props(styles.error)}
          id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}