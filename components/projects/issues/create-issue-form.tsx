"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { createIssue } from "@/app/actions/issues";
import IconMarkdown from "@/components/icons/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { renderMarkdown } from "@/lib/markdown/render";
import {
  colors,
  label as labelTokens,
  priority as priorityTokens,
  projectColors,
  radius,
  space,
  status as statusTokens,
  structure,
  type,
} from "@/styles/tokens.stylex";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "canceled", label: "Canceled" },
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No Priority" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_SWATCH_COLORS: Record<string, string> = {
  backlog: statusTokens.backlog,
  todo: statusTokens.todo,
  in_progress: statusTokens.inProgress,
  done: statusTokens.done,
  canceled: statusTokens.canceled,
};

const PRIORITY_SWATCH_COLORS: Record<string, string> = {
  none: priorityTokens.none,
  low: priorityTokens.low,
  medium: priorityTokens.medium,
  high: priorityTokens.high,
  urgent: priorityTokens.urgent,
};

const LABEL_SWATCH_COLORS: Record<string, string> = {
  design: labelTokens.design,
  bug: labelTokens.bug,
  content: labelTokens.content,
  research: labelTokens.research,
  infra: labelTokens.infra,
  a11y: labelTokens.a11y,
};

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  titleInput: {
    flex: 1,
    minWidth: structure.minWidthZero,
    borderWidth: 0,
    backgroundColor: "transparent",
    outlineStyle: "none",
    fontSize: "1.625rem",
    fontWeight: type.weightBold,
    letterSpacing: "-0.025em",
    color: colors.foreground,
    padding: 0,
  },
  error: { color: colors.destructive, fontSize: type.sizeSm, margin: 0 },
  pickerRow: { display: structure.flex, gap: space.s6 },
  pickerField: { display: structure.grid, gap: space.s2 },
  pickerLabel: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  pickerControl: { display: structure.flex, alignItems: structure.alignCenter, gap: space.s3 },
  swatchDot: { width: "10px", height: "10px", borderRadius: radius.full, flexShrink: 0 },
  select: {
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    color: colors.foreground,
    fontSize: type.sizeSm,
    padding: `${space.s3} ${space.s4}`,
    outlineStyle: "none",
    ":focus": {
      borderColor: colors.primary,
    },
  },
  footer: {
    display: structure.flex,
    justifyContent: "flex-end",
    gap: space.s3,
    paddingTop: space.s7,
    borderTopWidth: "1px",
    borderTopStyle: structure.borderSolid,
    borderTopColor: colors.borderSoft,
  },
  cancelBtn: {
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: "0.625rem",
    backgroundColor: colors.card,
    color: colors.textBody,
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    paddingBlock: space.s4,
    paddingInline: space.s6,
    cursor: "pointer",
    ":hover": {
      backgroundColor: colors.accent,
    },
  },
  createBtn: {
    paddingBlock: space.s4,
    paddingInline: space.s6,
  },
  descriptionSection: { display: structure.grid, gap: space.s3 },
  tabList: { display: structure.flex, gap: space.s2 },
  tab: {
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    color: colors.mutedForeground,
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  tabActive: {
    backgroundColor: colors.accent,
    color: colors.foreground,
  },
  textarea: {
    width: structure.widthFull,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    outlineStyle: "none",
    resize: "vertical",
    fontSize: type.sizeBase,
    lineHeight: type.leadingRelaxed,
    color: colors.textBody,
    padding: `${space.s4} ${space.s5}`,
    fontFamily: "inherit",
    ":focus": {
      borderColor: colors.primary,
    },
  },
  previewPanel: {
    minHeight: "6rem",
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    color: colors.textBody,
    fontSize: type.sizeBase,
    lineHeight: type.leadingRelaxed,
    padding: `${space.s4} ${space.s5}`,
  },
  markdownHint: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
  },
  assigneeSection: { display: structure.grid, gap: space.s3 },
  assigneeRow: {
    display: structure.flex,
    gap: space.s3,
    flexWrap: "wrap",
    alignItems: structure.alignCenter,
  },
  assigneeButton: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    color: colors.textBody,
    fontSize: type.sizeSm,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  assigneeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    color: colors.foreground,
  },
  assigneeAvatar: {
    width: "20px",
    height: "20px",
    borderRadius: radius.full,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    fontSize: type.size2xs,
    fontWeight: type.weightBold,
    color: colors.primaryForeground,
  },
  clearButton: {
    borderWidth: 0,
    backgroundColor: "transparent",
    color: colors.mutedForeground,
    fontSize: type.sizeSm,
    cursor: "pointer",
    textDecorationLine: "underline",
  },
  labelSection: { display: structure.grid, gap: space.s3 },
  createLabelBtn: {
    alignSelf: "flex-start",
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.primary,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    color: colors.primary,
    fontSize: type.sizeSm,
    fontWeight: type.weightMedium,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  labelToggleRow: {
    display: structure.flex,
    gap: space.s3,
    flexWrap: "wrap",
    borderWidth: 0,
    margin: 0,
    padding: 0,
    minWidth: structure.minWidthZero,
  },
  labelToggleButton: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    color: colors.textBody,
    fontSize: type.sizeSm,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  labelToggleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    color: colors.foreground,
  },
  labelSwatchDot: { width: "8px", height: "8px", borderRadius: radius.full, flexShrink: 0 },
  visuallyHidden: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});

type AssigneeOption = { userId: string; name: string };
type LabelOption = { id: string; name: string; color: string };

type CreateIssueFormProps = {
  projectKey: string;
  members?: AssigneeOption[];
  labels?: LabelOption[];
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = Object.values(projectColors);

export function CreateIssueForm({ projectKey, members = [], labels = [] }: CreateIssueFormProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createIssue, null);
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;
  const [statusValue, setStatusValue] = useState("backlog");
  const [priorityValue, setPriorityValue] = useState("none");
  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("write");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [assigneeSelection, setAssigneeSelection] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [createdLabelNames, setCreatedLabelNames] = useState<string[]>([]);

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  function createLabel() {
    const trimmed = labelSearch.trim();
    if (!trimmed) return;
    setCreatedLabelNames((prev) => [...prev, trimmed]);
    setLabelSearch("");
  }

  const trimmedSearch = labelSearch.trim();
  const lowerSearch = trimmedSearch.toLowerCase();
  const filteredLabels = labels.filter((label) => label.name.toLowerCase().includes(lowerSearch));
  const exactMatchExists =
    labels.some((label) => label.name.toLowerCase() === lowerSearch) ||
    createdLabelNames.some((name) => name.toLowerCase() === lowerSearch);
  const showCreateAffordance = trimmedSearch.length > 0 && !exactMatchExists;

  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <input
        type="hidden"
        name="projectKey"
        value={projectKey}
      />
      <input
        {...stylex.props(styles.titleInput)}
        id="issue-title"
        name="title"
        type="text"
        placeholder="Issue title"
        aria-label="Issue title"
        aria-describedby={fieldErrors?.title ? "issue-title-error" : undefined}
        aria-invalid={Boolean(fieldErrors?.title)}
      />
      {fieldErrors?.title ? (
        <p
          {...stylex.props(styles.error)}
          id="issue-title-error">
          {fieldErrors.title}
        </p>
      ) : null}

      <div {...stylex.props(styles.pickerRow)}>
        <div {...stylex.props(styles.pickerField)}>
          <label
            {...stylex.props(styles.pickerLabel)}
            htmlFor="issue-status">
            Status
          </label>
          <div {...stylex.props(styles.pickerControl)}>
            <span
              {...stylex.props(styles.swatchDot)}
              style={{ backgroundColor: STATUS_SWATCH_COLORS[statusValue] }}
            />
            <select
              {...stylex.props(styles.select)}
              id="issue-status"
              name="status"
              value={statusValue}
              onChange={(event) => setStatusValue(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div {...stylex.props(styles.pickerField)}>
          <label
            {...stylex.props(styles.pickerLabel)}
            htmlFor="issue-priority">
            Priority
          </label>
          <div {...stylex.props(styles.pickerControl)}>
            <span
              {...stylex.props(styles.swatchDot)}
              style={{ backgroundColor: PRIORITY_SWATCH_COLORS[priorityValue] }}
            />
            <select
              {...stylex.props(styles.select)}
              id="issue-priority"
              name="priority"
              value={priorityValue}
              onChange={(event) => setPriorityValue(event.target.value)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div {...stylex.props(styles.descriptionSection)}>
        <input
          type="hidden"
          name="description"
          value={descriptionValue}
        />
        <div
          role="tablist"
          aria-label="Description"
          {...stylex.props(styles.tabList)}>
          <button
            type="button"
            role="tab"
            id="description-tab-write"
            aria-selected={descriptionTab === "write"}
            aria-controls="description-panel"
            {...stylex.props(styles.tab, descriptionTab === "write" && styles.tabActive)}
            onClick={() => setDescriptionTab("write")}>
            Write
          </button>
          <button
            type="button"
            role="tab"
            id="description-tab-preview"
            aria-selected={descriptionTab === "preview"}
            aria-controls="description-panel"
            {...stylex.props(styles.tab, descriptionTab === "preview" && styles.tabActive)}
            onClick={() => setDescriptionTab("preview")}>
            Preview
          </button>
        </div>
        <div
          id="description-panel"
          role="tabpanel"
          aria-labelledby={descriptionTab === "write" ? "description-tab-write" : "description-tab-preview"}>
          {descriptionTab === "write" ? (
            <textarea
              {...stylex.props(styles.textarea)}
              rows={4}
              placeholder="Describe this issue. **Bold**, _italic_, - lists and [links](url) supported via markdown."
              value={descriptionValue}
              onChange={(event) => setDescriptionValue(event.target.value)}
              aria-describedby={fieldErrors?.description ? "issue-description-error" : undefined}
              aria-invalid={Boolean(fieldErrors?.description)}
            />
          ) : (
            <div
              {...stylex.props(styles.previewPanel)}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(descriptionValue) }}
            />
          )}
        </div>
        {fieldErrors?.description ? (
          <p
            {...stylex.props(styles.error)}
            id="issue-description-error">
            {fieldErrors.description}
          </p>
        ) : null}
        <div {...stylex.props(styles.markdownHint)}>
          <IconMarkdown />
          Markdown supported
        </div>
      </div>

      <div {...stylex.props(styles.assigneeSection)}>
        <input
          type="hidden"
          name="assigneeId"
          value={assigneeSelection}
        />
        <span {...stylex.props(styles.pickerLabel)}>Assignee</span>
        <div {...stylex.props(styles.assigneeRow)}>
          <button
            type="button"
            {...stylex.props(
              styles.assigneeButton,
              assigneeSelection === "me" && styles.assigneeButtonActive,
            )}
            aria-pressed={assigneeSelection === "me"}
            onClick={() => setAssigneeSelection("me")}>
            Assign to me
          </button>
          {members.map((member, index) => (
            <button
              key={member.userId}
              type="button"
              {...stylex.props(
                styles.assigneeButton,
                assigneeSelection === member.userId && styles.assigneeButtonActive,
              )}
              aria-pressed={assigneeSelection === member.userId}
              onClick={() => setAssigneeSelection(member.userId)}>
              <span
                {...stylex.props(styles.assigneeAvatar)}
                style={{ backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
                {initialsOf(member.name)}
              </span>
              {member.name}
            </button>
          ))}
          {assigneeSelection ? (
            <button
              type="button"
              {...stylex.props(styles.clearButton)}
              onClick={() => setAssigneeSelection("")}>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div {...stylex.props(styles.labelSection)}>
        <span {...stylex.props(styles.pickerLabel)}>Labels</span>
        <Input
          value={labelSearch}
          onChange={(event) => setLabelSearch(event.target.value)}
          placeholder="Search or create a label…"
        />
        {showCreateAffordance ? (
          <button
            type="button"
            {...stylex.props(styles.createLabelBtn)}
            onClick={createLabel}>
            Create "{trimmedSearch}"
          </button>
        ) : null}
        <fieldset {...stylex.props(styles.labelToggleRow)}>
          <legend {...stylex.props(styles.visuallyHidden)}>Existing labels</legend>
          {filteredLabels.map((label) => (
            <button
              key={label.id}
              type="button"
              {...stylex.props(
                styles.labelToggleButton,
                selectedLabelIds.includes(label.id) && styles.labelToggleButtonActive,
              )}
              aria-pressed={selectedLabelIds.includes(label.id)}
              onClick={() => toggleLabel(label.id)}>
              <span
                {...stylex.props(styles.labelSwatchDot)}
                style={{ backgroundColor: LABEL_SWATCH_COLORS[label.color] }}
              />
              {label.name}
            </button>
          ))}
        </fieldset>
        <div {...stylex.props(styles.assigneeRow)}>
          {selectedLabelIds.map((labelId) => {
            const label = labels.find((candidate) => candidate.id === labelId);
            if (!label) return null;
            return (
              <span
                key={labelId}
                {...stylex.props(styles.labelToggleButton, styles.labelToggleButtonActive)}>
                <input
                  type="hidden"
                  name="labelIds[]"
                  value={labelId}
                />
                {label.name}
                <button
                  type="button"
                  aria-label={`Remove ${label.name}`}
                  {...stylex.props(styles.clearButton)}
                  onClick={() => toggleLabel(labelId)}>
                  ×
                </button>
              </span>
            );
          })}
          {createdLabelNames.map((name) => (
            <span
              key={name}
              {...stylex.props(styles.labelToggleButton, styles.labelToggleButtonActive)}>
              <input
                type="hidden"
                name="newLabelNames[]"
                value={name}
              />
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                {...stylex.props(styles.clearButton)}
                onClick={() => setCreatedLabelNames((prev) => prev.filter((existing) => existing !== name))}>
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div {...stylex.props(styles.footer)}>
        <button
          type="button"
          {...stylex.props(styles.cancelBtn)}
          onClick={() => router.back()}>
          Cancel
        </button>
        <Button
          type="submit"
          xstyle={styles.createBtn}
          disabled={isPending}>
          Create issue
        </Button>
      </div>
    </form>
  );
}