"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { createIssue } from "@/app/actions/issues";
import IconMarkdown from "@/components/icons/markdown";
import { Button } from "@/components/ui/button";
import { renderMarkdown } from "@/lib/markdown/render";
import { colors, projectColors, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";
import { LABEL_SWATCH_COLORS, LabelChip, type LabelOption, LabelPicker } from "./label-picker";
import { PriorityPicker } from "./priority-picker";
import { StatusPicker } from "./status-picker";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  breadcrumb: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s3,
    marginBottom: space.s3,
  },
  breadcrumbBadge: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    paddingBlock: space.s1,
    paddingInline: space.s4,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    fontSize: type.sizeXs,
    fontWeight: type.weightSemibold,
    color: colors.textBody,
  },
  breadcrumbDot: { width: "8px", height: "8px", borderRadius: radius.xs, flexShrink: 0 },
  breadcrumbSeparator: { color: colors.textFaint },
  breadcrumbCurrent: {
    fontSize: type.sizeSm,
    fontWeight: type.weightSemibold,
    color: colors.mutedForeground,
  },
  titleInput: {
    display: structure.block,
    width: structure.widthFull,
    borderWidth: 0,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
    backgroundColor: "transparent",
    outlineStyle: "none",
    fontSize: type.size3xl,
    fontWeight: type.weightBold,
    letterSpacing: type.trackingTight,
    color: colors.foreground,
    padding: 0,
    paddingBottom: space.s5,
  },
  error: { color: colors.destructive, fontSize: type.sizeSm, margin: 0 },
  section: {
    display: structure.grid,
    gap: space.s3,
    paddingBlock: space.s7,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
  },
  sectionHeader: { display: structure.flex, alignItems: structure.alignCenter, gap: space.s3 },
  sectionLabel: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  tabSwitch: {
    marginLeft: "auto",
    display: structure.flex,
    gap: space.s1,
    padding: space.s1,
    backgroundColor: colors.secondary,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  tab: {
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: "transparent",
    color: colors.mutedForeground,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  tabActive: {
    backgroundColor: colors.card,
    color: colors.foreground,
    boxShadow: shadow.xs,
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
  propertiesRow: {
    display: structure.flex,
    flexWrap: "wrap",
    gap: space.s3,
    paddingBlock: space.s7,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
  },
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
    borderWidth: "1.5px",
    borderStyle: structure.borderSolid,
    borderColor: colors.border,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    color: colors.textBody,
    fontSize: type.sizeSm,
    fontWeight: type.weightSemibold,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    cursor: "pointer",
  },
  assigneeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
    color: colors.primary,
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
  footer: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s3,
    justifyContent: "flex-end",
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
});

type AssigneeOption = { userId: string; name: string };

type CreateIssueFormProps = {
  projectKey: string;
  projectName: string;
  projectColor: string;
  currentUserId?: string;
  members?: AssigneeOption[];
  labels?: LabelOption[];
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const AVATAR_COLORS = Object.values(projectColors);

export function CreateIssueForm({
  projectKey,
  projectName,
  projectColor,
  currentUserId,
  members = [],
  labels = [],
}: CreateIssueFormProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createIssue, null);
  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;
  const [statusValue, setStatusValue] = useState("backlog");
  const [priorityValue, setPriorityValue] = useState("none");
  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("write");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [assigneeSelection, setAssigneeSelection] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [createdLabelNames, setCreatedLabelNames] = useState<string[]>([]);

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }

  function createLabel(name: string) {
    setCreatedLabelNames((prev) => [...prev, name]);
  }

  const currentUserIndex = members.findIndex((member) => member.userId === currentUserId);
  const currentUser = currentUserIndex >= 0 ? members[currentUserIndex] : undefined;
  const currentUserColor =
    currentUserIndex >= 0 ? AVATAR_COLORS[currentUserIndex % AVATAR_COLORS.length] : colors.primary;

  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <input
        type="hidden"
        name="projectKey"
        value={projectKey}
      />

      <div {...stylex.props(styles.breadcrumb)}>
        <span {...stylex.props(styles.breadcrumbBadge)}>
          <span
            {...stylex.props(styles.breadcrumbDot)}
            style={{ backgroundColor: projectColor }}
          />
          {projectName}
        </span>
        <span {...stylex.props(styles.breadcrumbSeparator)}>›</span>
        <span {...stylex.props(styles.breadcrumbCurrent)}>New issue</span>
      </div>

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

      <div {...stylex.props(styles.section)}>
        <input
          type="hidden"
          name="description"
          value={descriptionValue}
        />
        <div {...stylex.props(styles.sectionHeader)}>
          <span {...stylex.props(styles.sectionLabel)}>Description</span>
          <div
            role="tablist"
            aria-label="Description"
            {...stylex.props(styles.tabSwitch)}>
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
        </div>
        <div
          id="description-panel"
          role="tabpanel"
          aria-labelledby={descriptionTab === "write" ? "description-tab-write" : "description-tab-preview"}>
          {descriptionTab === "write" ? (
            <textarea
              {...stylex.props(styles.textarea)}
              rows={7}
              placeholder="Describe the issue. **Bold**, _italic_, `code`, # headings, - lists and [links](url) supported."
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

      <div {...stylex.props(styles.propertiesRow)}>
        <input
          type="hidden"
          name="status"
          value={statusValue}
        />
        <StatusPicker
          value={statusValue}
          onChange={setStatusValue}
        />

        <input
          type="hidden"
          name="priority"
          value={priorityValue}
        />
        <PriorityPicker
          value={priorityValue}
          onChange={setPriorityValue}
        />

        {selectedLabelIds.map((labelId) => {
          const option = labels.find((candidate) => candidate.id === labelId);
          if (!option) return null;
          return (
            <span key={labelId}>
              <input
                type="hidden"
                name="labelIds[]"
                value={labelId}
              />
              <LabelChip
                name={option.name}
                color={LABEL_SWATCH_COLORS[option.color]}
                onRemove={() => toggleLabel(labelId)}
              />
            </span>
          );
        })}
        {createdLabelNames.map((name) => (
          <span key={name}>
            <input
              type="hidden"
              name="newLabelNames[]"
              value={name}
            />
            <LabelChip
              name={name}
              color={colors.mutedForeground}
              onRemove={() => setCreatedLabelNames((prev) => prev.filter((existing) => existing !== name))}
            />
          </span>
        ))}

        <LabelPicker
          labels={labels}
          selectedLabelIds={selectedLabelIds}
          onToggle={toggleLabel}
          createdLabelNames={createdLabelNames}
          onCreate={createLabel}
        />
      </div>

      <div {...stylex.props(styles.section)}>
        <input
          type="hidden"
          name="assigneeId"
          value={assigneeSelection}
        />
        <span {...stylex.props(styles.sectionLabel)}>Assign</span>
        <div {...stylex.props(styles.assigneeRow)}>
          <button
            type="button"
            {...stylex.props(
              styles.assigneeButton,
              assigneeSelection === "me" && styles.assigneeButtonActive,
            )}
            aria-pressed={assigneeSelection === "me"}
            aria-label="Assign to me"
            onClick={() => setAssigneeSelection("me")}>
            <span
              {...stylex.props(styles.assigneeAvatar)}
              style={{ backgroundColor: currentUserColor }}>
              {currentUser ? initialsOf(currentUser.name) : ""}
            </span>
            Me
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