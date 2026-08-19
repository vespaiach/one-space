"use client";

import * as stylex from "@stylexjs/stylex";
import type { InputHTMLAttributes } from "react";
import { useState } from "react";
import Eye from "@/components/icons/eye";
import EyeOff from "@/components/icons/eye-off";
import { Input } from "@/components/ui/input";
import { colors, radius, space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  wrap: { position: "relative" },
  input: { paddingRight: "42px" },
  toggle: {
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
});

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div {...stylex.props(styles.wrap)}>
      <Input
        {...props}
        type={visible ? "text" : "password"}
        xstyle={styles.input}
      />
      <button
        {...stylex.props(styles.toggle)}
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}