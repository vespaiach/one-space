"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { colors, layout, radius, space, structure, type } from "@/styles/tokens.stylex";

const styles = stylex.create({
  base: {
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    fontSize: type.sizeSm,
    padding: space.s5,
  },
  success: {
    borderColor: colors.success,
    color: colors.foreground,
  },
  error: {
    borderColor: colors.destructive,
    color: colors.destructive,
  },
  warning: {
    borderColor: colors.warning,
    color: colors.foreground,
  },
});

type StatusMessageProps = {
  children: React.ReactNode;
  tone: "success" | "error" | "warning";
  focusOnMount?: boolean;
};

export function StatusMessage({ children, tone, focusOnMount = false }: StatusMessageProps) {
  const statusRef = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (focusOnMount) statusRef.current?.focus();
  }, [focusOnMount]);
  return (
    <output
      {...stylex.props(styles.base, styles[tone])}
      ref={statusRef}
      tabIndex={focusOnMount ? -1 : undefined}
      aria-live={tone === "error" ? "assertive" : "polite"}>
      {children}
    </output>
  );
}