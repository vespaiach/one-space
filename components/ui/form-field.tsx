import * as stylex from "@stylexjs/stylex";
import React from "react";
import { colors, layout, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  field: {
    display: structure.grid,
    gap: space.s2,
  },
  label: {
    color: colors.foreground,
    fontSize: type.sizeBase,
    fontWeight: type.weightSemibold,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: type.sizeSm,
  },
  error: {
    color: colors.destructive,
    fontSize: type.sizeSm,
  },
  input: {
    width: structure.widthFull,
    borderColor: colors.input,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    backgroundColor: colors.card,
    paddingBlock: space.s4,
    paddingInline: space.s5,
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
        ...stylex.props(styles.input),
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