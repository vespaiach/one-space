import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { colors, layer, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";

export function useDismissPopover(active: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, onDismiss]);
  return ref;
}

export const pickerStyles = stylex.create({
  popoverAnchor: { position: "relative" },
  pillButton: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    color: colors.textBody,
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    paddingBlock: space.s3,
    paddingInline: space.s4,
    cursor: "pointer",
    ":hover": {
      backgroundColor: colors.secondary,
    },
  },
  swatchDot: { width: "9px", height: "9px", borderRadius: radius.xs, flexShrink: 0 },
  popoverPanel: {
    position: "absolute",
    left: 0,
    top: "calc(100% + 6px)",
    zIndex: layer.dropdown,
    width: "190px",
    backgroundColor: colors.card,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.xl,
    boxShadow: shadow.lg,
    overflow: "hidden",
    padding: space.s2,
  },
  popoverListItem: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s4,
    width: structure.widthFull,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    padding: space.s3,
    cursor: "pointer",
    textAlign: "left",
    ":hover": {
      backgroundColor: colors.accent,
    },
  },
  popoverItemLabel: {
    flex: 1,
    minWidth: structure.minWidthZero,
    fontSize: type.sizeSm,
    color: colors.foreground,
  },
  popoverCheck: { flexShrink: 0, color: colors.primary, display: structure.flex },
});