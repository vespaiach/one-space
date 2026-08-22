"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import SmallPlus from "@/components/icons/small-plus";
import Tag from "@/components/icons/tag";
import Tick from "@/components/icons/tick";
import X from "@/components/icons/x";
import { Input } from "@/components/ui/input";
import {
  colors,
  label as labelTokens,
  layer,
  radius,
  shadow,
  space,
  structure,
  type,
} from "@/styles/tokens.stylex";
import { pickerStyles, useDismissPopover } from "./issue-picker-shared";

export type LabelOption = { id: string; name: string; color: string };

export const LABEL_SWATCH_COLORS: Record<string, string> = {
  design: labelTokens.design,
  bug: labelTokens.bug,
  content: labelTokens.content,
  research: labelTokens.research,
  infra: labelTokens.infra,
  a11y: labelTokens.a11y,
};

const styles = stylex.create({
  labelPopoverPanel: {
    position: "absolute",
    left: 0,
    top: "calc(100% + 6px)",
    zIndex: layer.dropdown,
    width: "260px",
    backgroundColor: colors.card,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.xl,
    boxShadow: shadow.lg,
    overflow: "hidden",
  },
  labelSearchWrap: {
    padding: space.s3,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
  },
  labelListWrap: { maxHeight: "220px", overflowY: "auto", padding: space.s2 },
  createLabelRow: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s4,
    width: structure.widthFull,
    borderWidth: 0,
    borderTopWidth: "1px",
    borderTopStyle: structure.borderSolid,
    borderTopColor: colors.borderSoft,
    marginTop: space.s2,
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    padding: space.s3,
    cursor: "pointer",
    textAlign: "left",
    fontSize: type.sizeSm,
    color: colors.textBody,
    ":hover": {
      backgroundColor: colors.accent,
    },
  },
  createLabelIcon: {
    flexShrink: 0,
    width: "20px",
    height: "20px",
    borderRadius: radius.sm,
    backgroundColor: colors.borderSoft,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    color: colors.mutedForeground,
  },
  popoverEmpty: {
    padding: space.s3,
    fontSize: type.sizeXs,
    color: colors.textFaint,
    textAlign: "center",
    margin: 0,
  },
  labelChip: {
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
    paddingBlock: space.s2,
    paddingLeft: space.s4,
    paddingRight: space.s2,
  },
  labelChipRemove: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "inherit",
    cursor: "pointer",
    opacity: 0.7,
    padding: 0,
    ":hover": {
      opacity: 1,
    },
  },
});

export function LabelChip({ name, color, onRemove }: { name: string; color: string; onRemove: () => void }) {
  return (
    <span {...stylex.props(styles.labelChip)}>
      <span
        {...stylex.props(pickerStyles.swatchDot)}
        style={{ backgroundColor: color }}
      />
      {name}
      <button
        type="button"
        aria-label={`Remove ${name}`}
        {...stylex.props(styles.labelChipRemove)}
        onClick={onRemove}>
        <X
          width={12}
          height={12}
        />
      </button>
    </span>
  );
}

export function LabelPicker({
  labels,
  selectedLabelIds,
  onToggle,
  createdLabelNames,
  onCreate,
}: {
  labels: LabelOption[];
  selectedLabelIds: string[];
  onToggle: (labelId: string) => void;
  createdLabelNames: string[];
  onCreate: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useDismissPopover(open, () => setOpen(false));

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const filteredLabels = labels.filter((option) => option.name.toLowerCase().includes(lowerQuery));
  const exactMatchExists =
    labels.some((option) => option.name.toLowerCase() === lowerQuery) ||
    createdLabelNames.some((name) => name.toLowerCase() === lowerQuery);
  const showCreateAffordance = trimmedQuery.length > 0 && !exactMatchExists;
  const isEmpty = filteredLabels.length === 0 && trimmedQuery.length === 0;

  function handleCreate() {
    if (!trimmedQuery) return;
    onCreate(trimmedQuery);
    setQuery("");
  }

  return (
    <div
      ref={ref}
      {...stylex.props(pickerStyles.popoverAnchor)}>
      <button
        type="button"
        {...stylex.props(pickerStyles.pillButton)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Labels"
        onClick={() => setOpen((current) => !current)}>
        <Tag />
        {selectedLabelIds.length > 0 || createdLabelNames.length > 0 ? "Add label" : "Label"}
      </button>
      {open ? (
        <div {...stylex.props(styles.labelPopoverPanel)}>
          <div {...stylex.props(styles.labelSearchWrap)}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search or create a label…"
            />
          </div>
          <div {...stylex.props(styles.labelListWrap)}>
            {filteredLabels.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selectedLabelIds.includes(option.id)}
                {...stylex.props(pickerStyles.popoverListItem)}
                onClick={() => onToggle(option.id)}>
                <span
                  {...stylex.props(pickerStyles.swatchDot)}
                  style={{ backgroundColor: LABEL_SWATCH_COLORS[option.color] }}
                />
                <span {...stylex.props(pickerStyles.popoverItemLabel)}>{option.name}</span>
                {selectedLabelIds.includes(option.id) ? (
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
            {showCreateAffordance ? (
              <button
                type="button"
                {...stylex.props(styles.createLabelRow)}
                onClick={handleCreate}>
                <span {...stylex.props(styles.createLabelIcon)}>
                  <SmallPlus
                    width={12}
                    height={12}
                  />
                </span>
                Create &ldquo;{trimmedQuery}&rdquo;
              </button>
            ) : null}
            {isEmpty ? (
              <p {...stylex.props(styles.popoverEmpty)}>No labels yet — type to create one.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}