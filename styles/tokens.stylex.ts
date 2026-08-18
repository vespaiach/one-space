/**
 * One Space — design tokens (StyleX)
 * ---------------------------------------------------------------------------
 * The single source of truth for the "One Space" system. StyleX compiles
 * each `defineVars` group to real CSS custom properties at build time, so
 * these are usable in any `stylex.create` and are overridable per-scope with
 * `stylex.createTheme` (see themes.stylex.ts for the dark override).
 *
 *   import { colors, type, space, radius, shadow, motion, layer } from "@/styles/tokens.stylex";
 *   const s = stylex.create({ card: { backgroundColor: colors.card, borderRadius: radius.xl } });
 *
 * Values are the exact prototype hexes, colors converted to oklch.
 * ---------------------------------------------------------------------------
 */
import * as stylex from "@stylexjs/stylex";

/* ---- Color roles (mirrors shadcn naming for portability) --------------- */
export const colors = stylex.defineVars({
  background: "oklch(0.9743 0.0143 84.58)", // #FBF6EC page
  foreground: "oklch(0.2807 0.0263 58.99)", // #33261C text-primary

  card: "oklch(0.9945 0.0057 84.57)", // #FFFDF9
  cardForeground: "oklch(0.2807 0.0263 58.99)",
  popover: "oklch(0.9945 0.0057 84.57)",
  popoverForeground: "oklch(0.2807 0.0263 58.99)",

  primary: "oklch(0.5956 0.1154 56.61)", // #B26B32 accent
  primaryForeground: "oklch(0.9671 0.0181 78.24)", // #FBF3E7 on-accent
  primaryTint: "oklch(0.5956 0.1154 56.61 / 0.12)", // active bg wash

  secondary: "oklch(0.9272 0.0259 84.59)", // #EFE6D4 sidebar surface
  secondaryForeground: "oklch(0.4415 0.0332 70.30)", // #5F503F
  muted: "oklch(0.9513 0.0217 83.26)", // #F6EEDF bar surface
  mutedForeground: "oklch(0.6786 0.0384 75.36)", // #A6957E
  accent: "oklch(0.9310 0.0263 82.38)", // #F1E7D5 hover tint
  accentForeground: "oklch(0.2807 0.0263 58.99)",

  destructive: "oklch(0.5656 0.1608 34.09)", // #C2492E
  destructiveForeground: "oklch(0.9671 0.0181 78.24)",
  success: "oklch(0.6050 0.0591 141.65)", // #6E8B6A
  warning: "oklch(0.6722 0.1132 72.89)", // #C08A3E

  border: "oklch(0.8930 0.0327 80.99)", // #E7DAC4
  borderSoft: "oklch(0.9310 0.0263 82.38)", // #F1E7D5 inner dividers
  input: "oklch(0.8930 0.0327 80.99)",
  ring: "oklch(0.5956 0.1154 56.61)", // focus = accent

  // extra text tiers the prototype uses
  textBody: "oklch(0.4415 0.0332 70.30)", // #5F503F
  textSecondary: "oklch(0.6396 0.0366 72.94)", // #9A8974
  textFaint: "oklch(0.7170 0.0402 77.49)", // #B2A188

  // sidebar block
  sidebar: "oklch(0.9272 0.0259 84.59)",
  sidebarBorder: "oklch(0.8714 0.0381 83.02)", // #E1D3B9
});

/* ---- Status / priority / label scales (semantic, theme-stable) --------- */
export const status = stylex.defineVars({
  backlog: "oklch(0.7139 0.0350 74.65)",
  todo: "oklch(0.6299 0.0241 256.77)",
  inProgress: "oklch(0.5259 0.0603 247.43)",
  done: "oklch(0.6050 0.0591 141.65)",
  canceled: "oklch(0.5656 0.1608 34.09)",
});

export const priority = stylex.defineVars({
  none: "oklch(0.7139 0.0350 74.65)",
  low: "oklch(0.6767 0.0505 245.70)",
  medium: "oklch(0.6722 0.1132 72.89)",
  high: "oklch(0.6396 0.1221 54.97)",
  urgent: "oklch(0.5656 0.1608 34.09)", // MUST pair with an icon, not color alone
});

export const label = stylex.defineVars({
  design: "oklch(0.5956 0.1154 56.61)",
  bug: "oklch(0.5607 0.0978 33.48)",
  content: "oklch(0.6050 0.0591 141.65)",
  research: "oklch(0.5432 0.0359 82.61)",
  infra: "oklch(0.5259 0.0603 247.43)",
  a11y: "oklch(0.5880 0.1084 305.31)",
});

/* ---- Typography -------------------------------------------------------- */
export const font = stylex.defineVars({
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace',
});

export const type = stylex.defineVars({
  size2xs: "0.6875rem", // 11  eyebrows / uppercase labels
  sizeXs: "0.7188rem", // 11.5 meta / hints
  sizeSm: "0.8125rem", // 13  secondary body
  sizeBase: "0.875rem", // 14  body / inputs / buttons
  sizeMd: "0.9375rem", // 15  section titles
  sizeLg: "1.0625rem", // 17  card / brand titles
  sizeXl: "1.1875rem", // 19  dialog headings
  size2xl: "1.25rem", // 20  auth / page headings
  size3xl: "1.5rem", // 24  hero numbers

  leadingTight: "1.15",
  leadingSnug: "1.4",
  leadingNormal: "1.55",
  leadingRelaxed: "1.6",

  trackingTight: "-0.02em",
  trackingNormal: "-0.01em",
  trackingWide: "0.05em",
  trackingWider: "0.06em",

  weightNormal: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",
});

/* ---- Spacing (4px grid) ------------------------------------------------ */
export const space = stylex.defineVars({
  s0: "0",
  s1: "0.25rem", // 4
  s2: "0.375rem", // 6
  s3: "0.5rem", // 8
  s4: "0.6875rem", // 11 control padding
  s5: "0.875rem", // 14
  s6: "1.125rem", // 18 card padding
  s7: "1.5rem", // 24
  s8: "1.875rem", // 30
  s9: "2.25rem", // 36 auth card padding
});

/* ---- Radius ------------------------------------------------------------ */
export const radius = stylex.defineVars({
  xs: "0.375rem", // 6
  sm: "0.4375rem", // 7  icon buttons
  md: "0.5625rem", // 9  segmented / pills
  lg: "0.625rem", // 10 inputs / buttons
  xl: "0.875rem", // 14 cards
  xl2: "1.125rem", // 18 auth / modal shells
  full: "9999px",
});

/* ---- Elevation (warm brown-tinted) ------------------------------------- */
export const shadow = stylex.defineVars({
  xs: "0 1px 2px rgba(90, 60, 25, 0.05)",
  sm: "0 1px 2px rgba(80, 45, 15, 0.18)", // raised buttons
  md: "0 6px 18px rgba(60, 38, 15, 0.10)",
  lg: "0 24px 60px rgba(60, 38, 15, 0.16)", // auth card / modals
});

/* ---- Motion ------------------------------------------------------------ */
export const motion = stylex.defineVars({
  easeStandard: "cubic-bezier(0.2, 0, 0, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  fast: "120ms",
  base: "180ms",
  slow: "280ms",
});

/* ---- Layers & layout rails --------------------------------------------- */
export const layer = stylex.defineVars({
  base: "0",
  sticky: "10",
  dropdown: "40",
  overlay: "50",
  modal: "60",
  toast: "80",
});

export const layout = stylex.defineVars({
  sidebarWidth: "262px",
  headerHeight: "56px",
  contentMax: "760px",
  focusRingWidth: "2px",
});

export const structure = stylex.defineVars({
  block: "block",
  flex: "flex",
  grid: "grid",
  none: "none",
  widthFull: "100%",
  minHeightScreen: "100vh",
  auto: "auto",
  borderSolid: "solid",
  alignCenter: "center",
  justifyBetween: "space-between",
  cover: "cover",
});