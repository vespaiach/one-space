# Quickstart: Create Issue

**Feature**: `009-create-issue` | **Phase**: 1

## Prerequisites

- Docker Compose stack running (`docker-compose.yml`) with the PostgreSQL service up, or an isolated test database per this repo's existing integration-test setup (see `tests/integration/projects/create-project.test.ts` for the pattern).
- Migrations applied: `npm run db:migrate` (or the project's equivalent script) after the `issues`, `labels`, and `issue_labels` schemas from [data-model.md](data-model.md) are added and `drizzle-kit generate` has produced the migration.
- At least one active Project (from `007-create-project`) with at least two active members (from `008-add-project-members`): a creator and a second member usable as an assignee.

## Setup

```bash
npm install
npm run db:migrate
npm run dev
```

Sign in as a user who is a current member of the test project.

## Scenario 1 — Minimal issue (User Story 1)

1. Navigate to `/projects/{projectKey}` and follow the "New issue" link.
2. Enter only a title, e.g. "Fix header padding on mobile".
3. Submit.
4. **Expected**: Redirect to the project page; the issue exists with `status = backlog`, `priority = none`, no labels, no assignee (query the `issues` table directly, or via a future list view, to confirm — this feature has no issue list yet).
5. Repeat with a blank title.
6. **Expected**: Submission is rejected with a "title is required" field error; no row is inserted.

## Scenario 2 — Status and priority (User Story 2)

1. Open the New Issue form.
2. Open the status picker; confirm all five options are listed: Backlog, Todo, In Progress, Done, Canceled.
3. Select "In Progress" and priority "High"; fill in a title; submit.
4. **Expected**: The inserted row has `status = in_progress`, `priority = high`.
5. Repeat leaving priority unselected.
6. **Expected**: The inserted row has `priority = none`.

## Scenario 3 — Labels, including inline creation (User Story 5)

1. Open the label picker; confirm it lists the project's existing labels (seed at least one beforehand).
2. Select one existing label.
3. Type a brand-new name (not already used in this project) and choose "Create".
4. **Expected**: A new `labels` row exists for the project with that name (case as typed) and a color from the six `label` token keys; the issue's `issue_labels` rows reference both the existing and the new label.
5. Reopen the New Issue form for the same project.
6. **Expected**: The newly created label now appears in the existing-labels list (SC-005).
7. Concurrency check: from two sessions, submit two new issues in the same project simultaneously, each typing the identical new label name (differing only in case).
8. **Expected**: Exactly one `labels` row exists for that name (case-insensitively) afterward; both issues reference the same label row.

## Scenario 4 — Membership authorization (FR-001, FR-002)

1. Sign in as a user who is not a member of the test project.
2. Navigate directly to `/projects/{projectKey}/issues/new`.
3. **Expected**: `notFound()` (404), matching the existing project page's behavior for non-members — no project data is revealed.
4. Attempt to invoke the `createIssue` action directly (e.g., via a crafted request) for a project the signed-in user doesn't belong to.
5. **Expected**: `{ error: "forbidden" }`; no row inserted.

## Scenario 5 — Assignee, including "Assign to me" and stale assignee (User Story 4, FR-016)

1. Open the label picker's sibling assignee picker; click "Assign to me"; submit.
2. **Expected**: `assignee_id` equals the current user's ID.
3. Open a new form; select a different active member as assignee.
4. **Expected**: `assignee_id` equals that member's ID.
5. Open a new form; select an active member as assignee, then (in another session) remove that member from the project before submitting the first form.
6. **Expected**: The issue is created successfully with `assignee_id = null`, and the post-redirect page shows the inline "assignee was no longer a member" notice; the submission is not rejected.

## Verification checklist

- [ ] Scenario 1 passes (minimal creation + blank-title rejection)
- [ ] Scenario 2 passes (status/priority selection + defaults)
- [ ] Scenario 3 passes (label select, inline create, and concurrency dedupe)
- [ ] Scenario 4 passes (non-member rejection via page and action)
- [ ] Scenario 5 passes (assign to me, explicit assignee, stale-assignee handling)
- [ ] `npm run verify` passes (Biome + full test suite)
- [ ] Manual keyboard-only pass through the composer (status/priority/label/assignee pickers, Write/Preview toggle) with visible focus at every step
