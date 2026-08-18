"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { forcePasswordReset, promoteToAdmin, reinstateUser, suspendUser } from "@/app/actions/users";
import type { UserView } from "@/lib/db/queries/users";
import { colors, layout, radius, space, structure } from "@/styles/tokens.stylex";

const styles = stylex.create({
  controls: { display: structure.grid, gap: space.s4 },
  confirmation: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    display: structure.grid,
    gap: space.s4,
    padding: space.s5,
  },
  actions: { display: structure.flex, gap: space.s4 },
  button: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderStyle: structure.borderSolid,
    borderWidth: layout.focusRingWidth,
    padding: space.s4,
  },
});

type ManagementActions = {
  suspend: (formData: FormData) => void | Promise<void>;
  reinstate: (formData: FormData) => void | Promise<void>;
  forceReset: (formData: FormData) => void | Promise<void>;
  promote: (formData: FormData) => void | Promise<void>;
};

type PendingAction = keyof ManagementActions;

const labels: Record<PendingAction, string> = {
  suspend: "Suspend member",
  reinstate: "Reinstate member",
  forceReset: "Force password reset",
  promote: "Promote member to Admin",
};

const descriptions: Record<PendingAction, string> = {
  suspend: "The member will lose access immediately and all current sessions will be revoked.",
  reinstate: "The member can attempt to log in again, subject to their retained lockout and password state.",
  forceReset: "All current sessions will be revoked and the member must change their password after login.",
  promote: "This one-way change grants current Admin authority on the member's next protected request.",
};

export function MemberManagementControls({
  user,
  actions = {
    suspend: suspendUser,
    reinstate: reinstateUser,
    forceReset: forcePasswordReset,
    promote: promoteToAdmin,
  },
}: {
  user: UserView;
  actions?: ManagementActions;
}) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [restoreFocus, setRestoreFocus] = useState<PendingAction | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Partial<Record<PendingAction, HTMLButtonElement | null>>>({});
  useEffect(() => {
    if (pending) confirmRef.current?.focus();
    else if (restoreFocus) {
      triggerRefs.current[restoreFocus]?.focus();
      setRestoreFocus(null);
    }
  }, [pending, restoreFocus]);
  if (user.role !== "member") return null;
  const eligible: PendingAction[] = [
    user.status === "active" ? "suspend" : "reinstate",
    "forceReset",
    ...(user.status === "active" ? (["promote"] as const) : []),
  ];
  const cancel = () => {
    setRestoreFocus(pending);
    setPending(null);
  };
  return (
    <section
      {...stylex.props(styles.controls)}
      aria-label="Member management">
      {pending ? (
        <form action={actions[pending]}>
          <section
            {...stylex.props(styles.confirmation)}
            aria-labelledby="management-confirmation-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}>
            <h2 id="management-confirmation-title">Confirm {labels[pending].toLowerCase()}</h2>
            <p>{descriptions[pending]}</p>
            <input
              type="hidden"
              name="targetUserId"
              value={user.id}
            />
            <div {...stylex.props(styles.actions)}>
              <button
                {...stylex.props(styles.button)}
                ref={confirmRef}
                type="submit">
                Confirm {labels[pending].toLowerCase()}
              </button>
              <button
                {...stylex.props(styles.button)}
                type="button"
                onClick={cancel}>
                Cancel
              </button>
            </div>
          </section>
        </form>
      ) : (
        eligible.map((action) => (
          <button
            {...stylex.props(styles.button)}
            key={action}
            ref={(element) => {
              triggerRefs.current[action] = element;
            }}
            type="button"
            onClick={() => setPending(action)}>
            {labels[action]}
          </button>
        ))
      )}
    </section>
  );
}