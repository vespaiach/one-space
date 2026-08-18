import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { updateProfile } from "@/app/actions/users";
import { FormField } from "@/components/ui/form-field";
import { StatusMessage } from "@/components/ui/status-message";
import type { UserView } from "@/lib/db/queries/users";
import { colors, radius, space, structure, type } from "@/styles/tokens.stylex";
import { AvatarEditor } from "./avatar-editor";

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s6 },
  actions: { display: structure.flex, gap: space.s5 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    color: colors.primaryForeground,
    fontWeight: type.weightSemibold,
    padding: space.s5,
  },
});

export function ProfileEditor({
  user,
  error,
  field,
  action = updateProfile,
}: {
  user: UserView;
  error?: string;
  field?: string;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const errorMessage =
    error === "input-too-large"
      ? "The picture exceeds the 5 MB input limit."
      : error === "type-mismatch" || error === "invalid-content" || error === "animated"
        ? "Choose a non-animated JPEG or PNG whose content matches its file type."
        : error === "dimensions-too-large"
          ? "The picture exceeds the 4096 × 4096 pixel input limit."
          : error
            ? "The profile could not be saved. Review the fields and picture, then try again."
            : undefined;
  const fieldError = error === "invalid" ? "Enter a valid value for this field." : undefined;
  const avatarErrorMessage =
    error === "input-too-large" ||
    error === "type-mismatch" ||
    error === "invalid-content" ||
    error === "animated" ||
    error === "dimensions-too-large" ||
    error === "output-too-large" ||
    error === "invalid-avatar"
      ? errorMessage
      : undefined;
  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      {errorMessage ? (
        <StatusMessage
          tone="error"
          focusOnMount>
          {errorMessage}
        </StatusMessage>
      ) : null}
      <input
        type="hidden"
        name="targetUserId"
        value={user.id}
      />
      <AvatarEditor
        hasAvatar={Boolean(user.avatarKey)}
        userId={user.id}
        errorMessage={avatarErrorMessage}
      />
      <FormField
        id="edit-first-name"
        label="First name"
        error={field === "firstName" ? fieldError : undefined}>
        <input
          name="firstName"
          defaultValue={user.firstName}
          required
        />
      </FormField>
      <FormField
        id="edit-last-name"
        label="Last name"
        error={field === "lastName" ? fieldError : undefined}>
        <input
          name="lastName"
          defaultValue={user.lastName}
          required
        />
      </FormField>
      <FormField
        id="edit-phone"
        label="Phone number"
        error={field === "phoneNumber" ? fieldError : undefined}>
        <input
          name="phoneNumber"
          defaultValue={user.phoneNumber ?? ""}
        />
      </FormField>
      <FormField
        id="edit-slack"
        label="Slack handle"
        error={field === "slackHandle" ? fieldError : undefined}>
        <input
          name="slackHandle"
          defaultValue={user.slackHandle ?? ""}
        />
      </FormField>
      <FormField
        id="edit-role"
        label="Role">
        <input
          value={user.role === "admin" ? "Admin" : "Member"}
          readOnly
        />
      </FormField>
      <div {...stylex.props(styles.actions)}>
        <button
          {...stylex.props(styles.button)}
          type="submit">
          Save
        </button>
        <Link href={`/users/${user.id}`}>Cancel</Link>
      </div>
    </form>
  );
}