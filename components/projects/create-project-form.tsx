"use client";

import * as stylex from "@stylexjs/stylex";
import { useActionState, useRef, useState } from "react";
import { createProject } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { generateProjectKey } from "@/lib/projects/key-generator";
import { colors, layout, projectColors, radius, space, structure, type } from "@/styles/tokens.stylex";

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

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  label: { color: colors.foreground, fontSize: type.sizeBase, fontWeight: type.weightSemibold },
  hint: { color: colors.textSecondary, fontSize: type.sizeSm },
  error: { color: colors.destructive, fontSize: type.sizeSm },
  input: {
    width: structure.widthFull,
    borderColor: colors.input,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    backgroundColor: colors.card,
    paddingBlock: space.s4,
    paddingInline: space.s5,
  },
  textarea: {
    width: structure.widthFull,
    borderColor: colors.input,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    backgroundColor: colors.card,
    paddingBlock: space.s4,
    paddingInline: space.s5,
  },
  swatchGrid: { display: structure.flex, gap: space.s3, flexWrap: "wrap" },
  swatch: {
    width: "2rem",
    height: "2rem",
    borderRadius: radius.md,
    cursor: "pointer",
    borderStyle: structure.borderSolid,
    borderWidth: "2px",
  },
  swatchSelected: { borderColor: colors.foreground },
  swatchUnselected: { borderColor: colors.border },
  fieldGroup: { display: structure.grid, gap: space.s2 },
});

type Color = (typeof COLORS)[number];

export function CreateProjectForm() {
  const [state, action, isPending] = useActionState(createProject, null);
  const keyDirty = useRef(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const [selectedColor, setSelectedColor] = useState<Color>("red");

  function handleNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!keyDirty.current && keyRef.current) {
      keyRef.current.value = generateProjectKey(e.target.value);
    }
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    keyDirty.current = true;
    e.target.value = e.target.value.toUpperCase();
  }

  const fieldErrors = state && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <div {...stylex.props(styles.fieldGroup)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-name">
          Project Name
        </label>
        {fieldErrors?.name ? (
          <p
            {...stylex.props(styles.error)}
            id="project-name-error">
            {fieldErrors.name}
          </p>
        ) : null}
        <input
          {...stylex.props(styles.input)}
          id="project-name"
          name="name"
          type="text"
          aria-describedby={fieldErrors?.name ? "project-name-error" : undefined}
          aria-invalid={Boolean(fieldErrors?.name)}
          onBlur={handleNameBlur}
        />
      </div>

      <div {...stylex.props(styles.fieldGroup)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-key">
          Project Key / ID
        </label>
        <p
          {...stylex.props(styles.hint)}
          id="project-key-hint">
          2–6 uppercase letters/digits
        </p>
        {fieldErrors?.key ? (
          <p
            {...stylex.props(styles.error)}
            id="project-key-error">
            {fieldErrors.key}
          </p>
        ) : null}
        <input
          {...stylex.props(styles.input)}
          id="project-key"
          name="key"
          type="text"
          ref={keyRef}
          aria-describedby={["project-key-hint", fieldErrors?.key ? "project-key-error" : undefined]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={Boolean(fieldErrors?.key)}
          onChange={handleKeyChange}
        />
      </div>

      <div {...stylex.props(styles.fieldGroup)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-description">
          Description
        </label>
        <p
          {...stylex.props(styles.hint)}
          id="project-description-hint">
          Supports bold, italic, headings, lists, links, and code
        </p>
        {fieldErrors?.description ? (
          <p
            {...stylex.props(styles.error)}
            id="project-description-error">
            {fieldErrors.description}
          </p>
        ) : null}
        <textarea
          {...stylex.props(styles.textarea)}
          id="project-description"
          name="description"
          aria-describedby={[
            "project-description-hint",
            fieldErrors?.description ? "project-description-error" : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={Boolean(fieldErrors?.description)}
        />
      </div>

      <fieldset {...stylex.props(styles.fieldGroup)}>
        <legend {...stylex.props(styles.label)}>Color</legend>
        {fieldErrors?.color ? (
          <p
            {...stylex.props(styles.error)}
            id="project-color-error">
            {fieldErrors.color}
          </p>
        ) : null}
        <div {...stylex.props(styles.swatchGrid)}>
          {COLORS.map((color) => (
            <label key={color}>
              <input
                type="radio"
                name="color"
                value={color}
                aria-label={color}
                checked={selectedColor === color}
                onChange={() => setSelectedColor(color)}
              />
              <span
                {...stylex.props(
                  styles.swatch,
                  selectedColor === color ? styles.swatchSelected : styles.swatchUnselected,
                )}
                style={{ backgroundColor: projectColors[color] }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div {...stylex.props(styles.fieldGroup)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-start-date">
          Start Date
        </label>
        {fieldErrors?.startDate ? (
          <p
            {...stylex.props(styles.error)}
            id="project-start-date-error">
            {fieldErrors.startDate}
          </p>
        ) : null}
        <input
          {...stylex.props(styles.input)}
          id="project-start-date"
          name="startDate"
          type="date"
          aria-describedby={fieldErrors?.startDate ? "project-start-date-error" : undefined}
          aria-invalid={Boolean(fieldErrors?.startDate)}
        />
      </div>

      <div {...stylex.props(styles.fieldGroup)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-end-date">
          End Date (optional)
        </label>
        {fieldErrors?.endDate ? (
          <p
            {...stylex.props(styles.error)}
            id="project-end-date-error">
            {fieldErrors.endDate}
          </p>
        ) : null}
        <input
          {...stylex.props(styles.input)}
          id="project-end-date"
          name="endDate"
          type="date"
          aria-describedby={fieldErrors?.endDate ? "project-end-date-error" : undefined}
          aria-invalid={Boolean(fieldErrors?.endDate)}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}>
        Create Project
      </Button>
    </form>
  );
}