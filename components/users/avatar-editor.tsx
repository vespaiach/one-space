"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { colors, radius, space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  fieldset: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    display: structure.grid,
    gap: space.s4,
    padding: space.s5,
  },
  preview: { borderRadius: radius.full, height: space.s9, objectFit: structure.cover, width: space.s9 },
  option: { alignItems: structure.alignCenter, display: structure.flex, gap: space.s3 },
});

export function AvatarEditor({
  hasAvatar,
  userId,
  errorMessage,
}: {
  hasAvatar: boolean;
  userId?: string;
  errorMessage?: string;
}) {
  const [action, setAction] = useState<"keep" | "replace" | "remove">("keep");
  const [preview, setPreview] = useState<string | null>(
    userId && hasAvatar ? `/api/users/${userId}/avatar` : null,
  );
  return (
    <fieldset {...stylex.props(styles.fieldset)}>
      <legend>Profile picture</legend>
      {preview ? (
        <img
          {...stylex.props(styles.preview)}
          src={preview}
          alt="Avatar preview"
        />
      ) : (
        <p>No profile picture selected.</p>
      )}
      <p id="avatar-guidance">
        JPEG or PNG, up to 5 MB and 4096 × 4096 pixels. Images are resized to fit within 512 × 512 pixels.
      </p>
      {errorMessage ? (
        <p
          id="avatar-error"
          aria-live="assertive">
          {errorMessage}
        </p>
      ) : null}
      <label {...stylex.props(styles.option)}>
        <input
          type="radio"
          name="avatarAction"
          value="keep"
          checked={action === "keep"}
          onChange={() => setAction("keep")}
        />
        Keep current picture
      </label>
      <label {...stylex.props(styles.option)}>
        <input
          type="radio"
          name="avatarAction"
          value="replace"
          checked={action === "replace"}
          onChange={() => setAction("replace")}
        />
        Replace picture
      </label>
      <label htmlFor="avatar-file">JPEG or PNG file</label>
      <input
        id="avatar-file"
        name="avatarFile"
        type="file"
        accept="image/jpeg,image/png"
        aria-describedby={errorMessage ? "avatar-guidance avatar-error" : "avatar-guidance"}
        aria-invalid={Boolean(errorMessage)}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          setAction("replace");
          setPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      {hasAvatar ? (
        <label {...stylex.props(styles.option)}>
          <input
            type="radio"
            name="avatarAction"
            value="remove"
            checked={action === "remove"}
            onChange={() => {
              setAction("remove");
              setPreview(null);
            }}
          />
          Remove current picture
        </label>
      ) : null}
      <p aria-live="polite">
        {action === "remove"
          ? "The current picture will be removed when you save."
          : action === "replace"
            ? "The selected picture will be validated when you save."
            : "The current picture will be kept."}
      </p>
    </fieldset>
  );
}