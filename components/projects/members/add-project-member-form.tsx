"use client";

import * as stylex from "@stylexjs/stylex";
import { useActionState, useEffect, useState } from "react";
import { type AddProjectMemberState, addProjectMember } from "@/app/actions/project-members";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import type { ProjectMemberCandidate } from "@/lib/db/queries/project-members";
import { colors, layout, radius, space, structure, type } from "@/styles/tokens.stylex";

const initialState: AddProjectMemberState = { status: "idle" };

const styles = stylex.create({
  form: { display: structure.grid, gap: space.s4 },
  field: { display: structure.grid, gap: space.s2 },
  label: { color: colors.foreground, fontSize: type.sizeBase, fontWeight: type.weightSemibold },
  help: { color: colors.textSecondary, fontSize: type.sizeSm },
  select: {
    backgroundColor: colors.card,
    borderColor: colors.input,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    minWidth: structure.minWidthZero,
    padding: space.s4,
    width: structure.widthFull,
  },
  empty: { color: colors.textSecondary, fontSize: type.sizeSm },
});

type AddProjectMemberFormProps = {
  projectId: string;
  projectName: string;
  candidates: ProjectMemberCandidate[];
};

export function AddProjectMemberForm({ projectId, projectName, candidates }: AddProjectMemberFormProps) {
  const [state, action, isPending] = useActionState(addProjectMember, initialState);
  const [selectedUserId, setSelectedUserId] = useState("");
  const eligibleCandidates = candidates.filter((candidate) => candidate.state === "eligible");
  const userFieldError = state.status === "error" ? state.fieldErrors?.userId?.join(" ") : undefined;
  const describedBy = ["project-member-help", userFieldError ? "project-member-user-error" : null]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (state.status === "success") setSelectedUserId("");
  }, [state]);

  return (
    <form
      {...stylex.props(styles.form)}
      action={action}>
      <input
        name="projectId"
        type="hidden"
        value={projectId}
      />
      <div {...stylex.props(styles.field)}>
        <label
          {...stylex.props(styles.label)}
          htmlFor="project-member-user">
          Choose one active account
        </label>
        <p
          {...stylex.props(styles.help)}
          id="project-member-help">
          Access to {projectName} starts immediately after a successful add.
        </p>
        {userFieldError ? (
          <p
            {...stylex.props(styles.empty)}
            id="project-member-user-error">
            {userFieldError}
          </p>
        ) : null}
        <select
          {...stylex.props(styles.select)}
          id="project-member-user"
          name="userId"
          value={selectedUserId}
          disabled={eligibleCandidates.length === 0 || isPending}
          aria-describedby={describedBy}
          aria-invalid={Boolean(userFieldError)}
          onChange={(event) => setSelectedUserId(event.target.value)}>
          <option value="">Select an account</option>
          {candidates.map((candidate) => (
            <option
              key={candidate.userId}
              value={candidate.userId}
              disabled={candidate.state !== "eligible"}>
              {candidate.name} ({candidate.role})
              {candidate.state === "already_member" ? " — Already a member" : null}
              {candidate.state === "suspended" ? " — Suspended" : null}
            </option>
          ))}
        </select>
      </div>
      {eligibleCandidates.length === 0 ? (
        <p {...stylex.props(styles.empty)}>
          All active accounts are already members. Suspended accounts remain unavailable.
        </p>
      ) : null}
      {isPending ? <StatusMessage tone="warning">Adding the selected account…</StatusMessage> : null}
      {state.status === "success" ? (
        <StatusMessage
          tone="success"
          focusOnMount>
          {state.message}
        </StatusMessage>
      ) : null}
      {state.status === "error" ? <StatusMessage tone="error">{state.message}</StatusMessage> : null}
      <Button
        type="submit"
        disabled={!selectedUserId || isPending}>
        {isPending ? "Adding member…" : "Add member"}
      </Button>
    </form>
  );
}