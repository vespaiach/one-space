"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import Tick from "@/components/icons/tick";
import { status as statusTokens } from "@/styles/tokens.stylex";
import { pickerStyles, useDismissPopover } from "./issue-picker-shared";

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

export const STATUS_SWATCH_COLORS: Record<string, string> = {
  backlog: statusTokens.backlog,
  todo: statusTokens.todo,
  in_progress: statusTokens.inProgress,
  done: statusTokens.done,
  canceled: statusTokens.canceled,
};

export function StatusPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useDismissPopover(open, () => setOpen(false));
  const selected = STATUS_OPTIONS.find((option) => option.value === value);

  return (
    <div
      ref={ref}
      {...stylex.props(pickerStyles.popoverAnchor)}>
      <button
        type="button"
        {...stylex.props(pickerStyles.pillButton)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${selected?.label ?? ""}`}
        onClick={() => setOpen((current) => !current)}>
        <span
          {...stylex.props(pickerStyles.swatchDot)}
          style={{ backgroundColor: STATUS_SWATCH_COLORS[value] }}
        />
        {selected?.label}
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Status"
          {...stylex.props(pickerStyles.popoverPanel)}>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              {...stylex.props(pickerStyles.popoverListItem)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}>
              <span
                {...stylex.props(pickerStyles.swatchDot)}
                style={{ backgroundColor: STATUS_SWATCH_COLORS[option.value] }}
              />
              <span {...stylex.props(pickerStyles.popoverItemLabel)}>{option.label}</span>
              {option.value === value ? (
                <span {...stylex.props(pickerStyles.popoverCheck)}>
                  <Tick
                    width={15}
                    height={15}
                    title=""
                  />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}