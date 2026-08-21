# Contract: Pages

**Feature**: `009-create-issue` | **Phase**: 1

## New Issue page

**Route**: `/projects/{projectKey}/issues/new`

**File**: `app/(shell)/projects/[projectKey]/issues/new/page.tsx` (Server Component)

### Responsibilities

- Resolve the project by `projectKey` using the same access check `getProjectAccessByKey` performs for the existing project page; call `notFound()` if the requester is not a current member or the project doesn't exist (FR-002), matching the existing project page's behavior exactly.
- Load assignee options (active project members) and label options (project labels) server-side and pass them as props to the client composer.
- Render `<CreateIssueForm project={...} members={...} labels={...} />` (`components/projects/issues/create-issue-form.tsx`).

### States

| State | Behavior |
|-------|----------|
| Not authenticated | Redirect to sign-in, consistent with `requireSession()` elsewhere |
| Not a project member / project not found | `notFound()` — same 404 the project page already returns for non-members |
| Loaded | Composer form: title input, description write/preview toggle, status picker, priority picker, label picker (select + inline create), assignee picker with "Assign to me" and "Clear", Cancel/Create issue footer |
| Submitting | Submit control disabled via `isPending` from `useActionState`, matching `CreateProjectForm`'s existing pattern |
| Field errors | Inline error text under the offending field, using the existing `FormField` component's `error` prop |
| Assignee cleared on submit | Non-blocking inline notice on the destination page after redirect (FR-016) — success is not blocked |
| Success | Redirect to `/projects/{projectKey}` (no issue-detail page exists in this feature's scope) |

### Entry point

`app/(shell)/projects/[projectKey]/page.tsx` (currently a placeholder) gets one link/button to this route, labeled "New issue" — the minimum change needed to make the page reachable (see research.md).

### Accessibility contract

- Title input has an accessible label (visually hidden or via `aria-label`, matching `CreateProjectForm`'s `nameInput`).
- Status, priority, label, and assignee pickers are operable by keyboard alone (tab to open, arrow/enter to choose, escape to close), with visible focus states using the existing `:focus` token-driven styles.
- The Write/Preview description toggle is a proper tab pattern (`role="tab"`/`aria-selected`) or an equivalent native control — not a div-only toggle with no semantics.
- Field errors are associated via `aria-describedby`/`aria-invalid`, matching `FormField`'s existing behavior.
- Removing a selected label or clearing the assignee announces the change to assistive technology (e.g., via a live region or by moving focus predictably), consistent with the constitution's accessibility expectations carried over from prior features.

No other page in the application is modified by this feature beyond the one-link addition to the existing project page.
