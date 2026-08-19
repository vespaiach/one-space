# Server Action Contract: Add Project Members

**Feature**: `008-add-project-members` | **Date**: 2026-08-18

## `addProjectMember`

**Boundary**: Authenticated same-origin Server Action used by the Project membership settings form.

**Purpose**: Add one active existing user to one Project and atomically create the in-app Notification and Project activity entry.

### Input

The form submits:

| Field | Type | Validation |
|-------|------|------------|
| `projectId` | string | Required canonical UUID; Project must exist |
| `userId` | string | Required canonical UUID; user must be an active Admin or Member account; the acting Admin's ID is allowed |

The actor identity, role, and status MUST come from the current database-backed session. The action MUST ignore any submitted actor, role, status, Project name, user name, Notification text, or destination field.

### Return type

```text
AddProjectMemberState =
  | { status: "idle" }
  | { status: "success"; membershipId: string; message: string }
  | {
      status: "error";
      code:
        | "invalid_input"
        | "unauthenticated"
        | "forbidden"
        | "project_not_found"
        | "user_not_found"
        | "user_ineligible"
        | "already_member"
        | "conflict"
        | "unexpected";
      message: string;
      fieldErrors?: { projectId?: string[]; userId?: string[] };
    }
```

Expected validation, authorization, eligibility, and duplicate outcomes are returned as values. Unexpected infrastructure/programming errors are recorded through the application's safe error boundary and returned as a generic `unexpected` state without database or private Project details.

### Authorization and validation order

1. Parse the current session; if absent or expired, return `unauthenticated` before reading submitted Project data.
2. Resolve the current actor row; if not an active Admin, return `forbidden` before revealing Project or selected-user state.
3. Validate both submitted identifiers; return `invalid_input` with field errors when malformed.
4. Enter the domain transaction and recheck actor state, selected-user state, Project existence, and active membership state.
5. Return the most specific Admin-safe expected outcome.

The page-level Admin guard improves UX but does not replace action-level authorization.

### Success semantics

Before returning `success`, one committed transaction MUST contain:

- one active Project Membership for the selected user and Project;
- one unread `project_member_added` Notification referencing that membership;
- one `member_added` Project activity entry referencing that membership.

The returned `membershipId` identifies the committed membership period. The success message names the selected user and Project using server-resolved values. It does not claim external message delivery.

### Expected errors and side effects

| Code | Condition | Required side effects |
|------|-----------|-----------------------|
| `invalid_input` | Either identifier is missing or malformed | None |
| `unauthenticated` | No valid current session | None |
| `forbidden` | Actor is not an active Admin | None and no private Project disclosure |
| `project_not_found` | Valid identifier has no Project | None |
| `user_not_found` | Valid identifier has no user | None |
| `user_ineligible` | User is currently suspended | None |
| `already_member` | Active membership already exists or unique index wins a concurrency race | Existing records unchanged; no additional Notification/activity |
| `conflict` | Current actor session/role or target account status changed during submission and a safe retry may succeed | None from this attempt; prompt Admin to refresh |
| `unexpected` | Database or application failure | Entire transaction rolled back; safe generic message |

### Concurrency and idempotency

- The partial unique index on active Project Membership is the final concurrency authority.
- Two concurrent valid submissions may not both return success.
- The losing duplicate maps to `already_member`; it MUST NOT retry as a new membership period.
- Unique source constraints on Notification and activity records provide defense in depth.
- Re-submitting after a successful response returns `already_member`, not a second success.
- A Project status change during submission is not a conflict; membership succeeds and later access uses current Project status.
- A re-add after removal creates a new membership-period identity and may return success once for that new period.

### Cache and UI refresh

After commit, the action refreshes the current membership-management route and invalidates the specific Project route plus established Project-list/home consumer paths. Revalidation occurs only after commit. Error outcomes do not invalidate paths.

### Security properties

- Treat the Server Action as a public-facing mutation boundary.
- Same-origin framework protection remains enabled; no extra allowed origin is added for this feature.
- Validate identifiers even when rendered as hidden/select values.
- Authorize from current database state, never a client role or stale page snapshot.
- Return no selected-user status detail to a non-Admin.
- An unexpected failure records exactly one operator-visible diagnostic event with failure category and time.
- Log no session token, email, submitted form body, or private Project content.
