"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { createProject } from "@/app/actions/projects";
import IconMarkdown from "@/components/icons/markdown";
import IconSearch from "@/components/icons/search";
import IconX from "@/components/icons/x";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { generateProjectKey } from "@/lib/projects/key-generator";
import { colors, layer, projectColors, radius, shadow, space, structure, type } from "@/styles/tokens.stylex";

const COLORS = [
  "red",
  "coral",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "purple",
  "pink",
] as const;

const AVATAR_COLORS = Object.values(projectColors);

const styles = stylex.create({
  form: { display: structure.grid },
  titleRow: {
    display: structure.flex,
    gap: space.s5,
    paddingBottom: "22px",
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
  },
  nameInput: {
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
  keyInput: {
    width: "82px",
    flexShrink: 0,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    outlineStyle: "none",
    fontSize: type.sizeSm,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.textBody,
    padding: `0 ${space.s4}`,
    textAlign: "center",
    ":focus": {
      borderColor: colors.primary,
    },
  },
  section: {
    paddingBlock: space.s7,
    borderBottomWidth: "1px",
    borderBottomStyle: structure.borderSolid,
    borderBottomColor: colors.borderSoft,
  },
  sectionNoBorder: {
    paddingBlock: space.s7,
  },
  error: { color: colors.destructive, fontSize: type.sizeSm, margin: 0 },
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
  markdownHint: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s2,
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    marginTop: space.s2,
  },
  dateGrid: {
    display: structure.grid,
    gridTemplateColumns: "1fr 1fr",
    gap: space.s6,
  },
  colorRow: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s6,
  },
  colorLabel: {
    flexShrink: 0,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
  },
  swatchGrid: { display: structure.flex, gap: space.s3, flexWrap: "wrap" },
  swatchLabel: {
    display: structure.block,
    width: "28px",
    height: "28px",
    borderRadius: radius.md,
    cursor: "pointer",
  },
  swatchRadio: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
  membersLabel: {
    display: structure.block,
    fontSize: type.size2xs,
    fontWeight: type.weightSemibold,
    letterSpacing: type.trackingWide,
    textTransform: "uppercase",
    color: colors.mutedForeground,
    marginBottom: space.s3,
  },
  searchWrap: { position: "relative" },
  searchIcon: {
    position: "absolute",
    left: "13px",
    top: "50%",
    transform: "translateY(-50%)",
    color: colors.textFaint,
    pointerEvents: "none",
    display: structure.flex,
  },
  searchInput: { paddingInlineStart: "36px" },
  dropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: layer.dropdown,
    backgroundColor: colors.card,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.xl2,
    boxShadow: shadow.md,
    overflow: "hidden",
    padding: space.s2,
  },
  suggestionItem: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s5,
    padding: `${space.s3} ${space.s4}`,
    borderRadius: radius.sm,
    borderWidth: 0,
    backgroundColor: "transparent",
    width: structure.widthFull,
    textAlign: "left",
    cursor: "pointer",
    ":hover": {
      backgroundColor: colors.accent,
    },
  },
  avatar: {
    flexShrink: 0,
    borderRadius: radius.full,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    fontWeight: type.weightBold,
    color: colors.primaryForeground,
  },
  suggestionAvatar: {
    width: "30px",
    height: "30px",
    fontSize: type.size2xs,
  },
  selectedAvatar: {
    width: "32px",
    height: "32px",
    fontSize: type.sizeXs,
  },
  memberName: {
    display: structure.block,
    fontSize: type.sizeSm,
    fontWeight: type.weightSemibold,
    color: colors.foreground,
  },
  memberEmail: {
    display: structure.block,
    fontSize: type.size2xs,
    color: colors.textSecondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  suggestionInfo: { minWidth: structure.minWidthZero },
  selectedList: {
    display: structure.grid,
    gap: space.s3,
    marginTop: space.s6,
  },
  selectedRow: {
    display: structure.flex,
    alignItems: structure.alignCenter,
    gap: space.s5,
    padding: `${space.s3} ${space.s4}`,
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  selectedInfo: { flex: 1, minWidth: structure.minWidthZero },
  removeBtn: {
    flexShrink: 0,
    width: "30px",
    height: "30px",
    borderWidth: 0,
    borderRadius: radius.md,
    backgroundColor: "transparent",
    color: colors.textFaint,
    display: structure.flex,
    alignItems: structure.alignCenter,
    justifyContent: structure.alignCenter,
    cursor: "pointer",
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.destructive,
    },
  },
  membersHint: {
    fontSize: type.sizeXs,
    color: colors.mutedForeground,
    marginTop: space.s5,
  },
  footer: {
    display: structure.flex,
    justifyContent: "flex-end",
    gap: space.s3,
    paddingTop: space.s7,
    marginTop: space.s1,
    borderTopWidth: "1px",
    borderTopStyle: structure.borderSolid,
    borderTopColor: colors.borderSoft,
  },
  cancelBtn: {
    borderWidth: "1px",
    borderStyle: structure.borderSolid,
    borderColor: colors.input,
    borderRadius: radius.lg,
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

type Color = (typeof COLORS)[number];

type PickerUser = { id: string; name: string; email: string };

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function CreateProjectForm({ availableUsers = [] }: { availableUsers?: PickerUser[] }) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createProject, null);
  const keyDirty = useRef(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState<Color>("red");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<PickerUser[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!keyDirty.current && keyRef.current) {
      keyRef.current.value = generateProjectKey(e.target.value);
    }
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    keyDirty.current = true;
    e.target.value = e.target.value.toUpperCase();
  }

  function handleAddUser(user: PickerUser) {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery("");
  }

  function handleRemoveUser(userId: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  const userColor = (userId: string) => {
    const index = availableUsers.findIndex((u) => u.id === userId);
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  };

  const selectedIds = new Set(selectedUsers.map((u) => u.id));
  const lowerQuery = searchQuery.toLowerCase();
  const filteredUsers = availableUsers.filter(
    (u) =>
      !selectedIds.has(u.id) &&
      (u.name.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery)),
  );
  const showDropdown = searchFocused && filteredUsers.length > 0;

  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <div {...stylex.props(styles.titleRow)}>
        <input
          {...stylex.props(styles.nameInput)}
          id="project-name"
          name="name"
          type="text"
          placeholder="Project name"
          aria-label="Project name"
          aria-describedby={fieldErrors?.name ? "project-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors?.name)}
          onBlur={handleNameBlur}
        />
        <input
          {...stylex.props(styles.keyInput)}
          id="project-key"
          name="key"
          type="text"
          placeholder="KEY"
          maxLength={6}
          aria-label="Project key"
          ref={keyRef}
          aria-describedby={fieldErrors?.key ? "project-key-error" : undefined}
          aria-invalid={Boolean(fieldErrors?.key)}
          onChange={handleKeyChange}
        />
      </div>
      {fieldErrors?.name ? (
        <p
          {...stylex.props(styles.error)}
          id="project-name-error">
          {fieldErrors.name}
        </p>
      ) : null}
      {fieldErrors?.key ? (
        <p
          {...stylex.props(styles.error)}
          id="project-key-error">
          {fieldErrors.key}
        </p>
      ) : null}

      <div {...stylex.props(styles.section)}>
        <FormField
          id="project-description"
          label="Description"
          error={fieldErrors?.description}>
          <textarea
            {...stylex.props(styles.textarea)}
            name="description"
            rows={4}
            placeholder="Describe this project. **Bold**, _italic_, - lists and [links](url) supported."
          />
        </FormField>
        <div {...stylex.props(styles.markdownHint)}>
          <IconMarkdown />
          Markdown supported
        </div>
      </div>

      <div {...stylex.props(styles.section, styles.dateGrid)}>
        <FormField
          id="project-start-date"
          label="Start date"
          error={fieldErrors?.startDate}>
          <Input
            name="startDate"
            type="date"
          />
        </FormField>
        <FormField
          id="project-end-date"
          label="Target end date"
          error={fieldErrors?.endDate}>
          <Input
            name="endDate"
            type="date"
          />
        </FormField>
      </div>

      <div {...stylex.props(styles.section, styles.colorRow)}>
        <span {...stylex.props(styles.colorLabel)}>Color</span>
        {fieldErrors?.color ? <p {...stylex.props(styles.error)}>{fieldErrors.color}</p> : null}
        <div {...stylex.props(styles.swatchGrid)}>
          {COLORS.map((color) => (
            <label
              key={color}
              {...stylex.props(styles.swatchLabel)}
              style={{
                backgroundColor: projectColors[color],
                boxShadow:
                  selectedColor === color
                    ? `0 0 0 2px ${colors.card}, 0 0 0 4px ${projectColors[color]}`
                    : undefined,
              }}>
              <input
                {...stylex.props(styles.swatchRadio)}
                type="radio"
                name="color"
                value={color}
                aria-label={color}
                checked={selectedColor === color}
                onChange={() => setSelectedColor(color)}
              />
            </label>
          ))}
        </div>
      </div>

      <div {...stylex.props(styles.sectionNoBorder)}>
        <span {...stylex.props(styles.membersLabel)}>Members</span>
        <div {...stylex.props(styles.searchWrap)}>
          <span {...stylex.props(styles.searchIcon)}>
            <IconSearch />
          </span>
          <Input
            xstyle={styles.searchInput}
            type="text"
            placeholder="Type a name or email to add…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          {showDropdown ? (
            <div {...stylex.props(styles.dropdown)}>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  {...stylex.props(styles.suggestionItem)}
                  onMouseDown={() => handleAddUser(user)}>
                  <span
                    {...stylex.props(styles.avatar, styles.suggestionAvatar)}
                    style={{ backgroundColor: userColor(user.id) }}>
                    {initialsOf(user.name)}
                  </span>
                  <span {...stylex.props(styles.suggestionInfo)}>
                    <span {...stylex.props(styles.memberName)}>{user.name}</span>
                    <span {...stylex.props(styles.memberEmail)}>{user.email}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {selectedUsers.length > 0 ? (
          <div {...stylex.props(styles.selectedList)}>
            {selectedUsers.map((user) => (
              <div
                key={user.id}
                {...stylex.props(styles.selectedRow)}>
                <input
                  type="hidden"
                  name="memberIds[]"
                  value={user.id}
                />
                <span
                  {...stylex.props(styles.avatar, styles.selectedAvatar)}
                  style={{ backgroundColor: userColor(user.id) }}>
                  {initialsOf(user.name)}
                </span>
                <span {...stylex.props(styles.selectedInfo)}>
                  <span {...stylex.props(styles.memberName)}>{user.name}</span>
                  <span {...stylex.props(styles.memberEmail)}>{user.email}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${user.name}`}
                  {...stylex.props(styles.removeBtn)}
                  onClick={() => handleRemoveUser(user.id)}>
                  <IconX
                    width={15}
                    height={15}
                  />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <p {...stylex.props(styles.membersHint)}>
          Add workspace members to this project. You can change this anytime in project settings.
        </p>
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
          Create project
        </Button>
      </div>
    </form>
  );
}