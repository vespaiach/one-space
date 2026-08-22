"use client";

import * as stylex from "@stylexjs/stylex";
import { colors, priority as priorityTokens, radius, structure } from "@/styles/tokens.stylex";
import { pickerStyles } from "./issue-picker-shared";

export const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No Priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITY_LEVELS: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 };
const PRIORITY_BAR_HEIGHTS = ["7px", "10px", "13px"];

export const PRIORITY_SWATCH_COLORS: Record<string, string> = {
  none: priorityTokens.none,
  low: priorityTokens.low,
  medium: priorityTokens.medium,
  high: priorityTokens.high,
  urgent: priorityTokens.urgent,
};

const styles = stylex.create({
  barGlyph: { display: structure.flex, alignItems: "flex-end", gap: "2px", height: "13px" },
  bar: { width: "3px", borderRadius: "1px", flexShrink: 0 },
  urgentGlyph: {
    width: "15px",
    height: "15px",
    flexShrink: 0,
    borderRadius: radius.xs,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
  },
});

function PriorityGlyph({ priority }: { priority: string }) {
  if (priority === "urgent") {
    return (
      <span
        {...stylex.props(styles.urgentGlyph)}
        style={{ backgroundColor: priorityTokens.urgent }}>
        <svg
          width="9"
          height="9"
          viewBox="0 0 16 16"
          fill="none"
          stroke={colors.primaryForeground}
          strokeWidth={2.2}
          strokeLinecap="round"
          aria-hidden="true">
          <path d="M8 4v4.5M8 11.4v.1" />
        </svg>
      </span>
    );
  }
  const filled = PRIORITY_LEVELS[priority] ?? 0;
  return (
    <span {...stylex.props(styles.barGlyph)}>
      {PRIORITY_BAR_HEIGHTS.map((height, index) => (
        <i
          key={height}
          {...stylex.props(styles.bar)}
          style={{
            height,
            backgroundColor: index < filled ? PRIORITY_SWATCH_COLORS[priority] : colors.border,
          }}
        />
      ))}
    </span>
  );
}

export function PriorityPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = PRIORITY_OPTIONS.find((option) => option.value === value);

  function cycle() {
    const currentIndex = PRIORITY_OPTIONS.findIndex((option) => option.value === value);
    const next = PRIORITY_OPTIONS[(currentIndex + 1) % PRIORITY_OPTIONS.length];
    onChange(next.value);
  }

  return (
    <button
      type="button"
      {...stylex.props(pickerStyles.pillButton)}
      aria-label={`Priority: ${selected?.label ?? ""}`}
      onClick={cycle}>
      <PriorityGlyph priority={value} />
      {selected?.label}
    </button>
  );
}