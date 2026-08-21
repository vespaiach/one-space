---

description: "Dependency-ordered implementation tasks for creating issues"
---

# Tasks: Create Issue

**Input**: Design documents from `/specs/009-create-issue/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `governance.md`, and `.specify/memory/constitution.md`

**Constitution note**: TDD is mandatory (Principle V). Every production-code task is preceded by a failing-test task; tests must fail before their paired implementation task begins.

**Organization**: Tasks are grouped by user story (US1–US5, matching `spec.md`'s priorities P1–P5) so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other `[P]` tasks in the same phase (different files, no dependency on unfinished work at that point)
- **[Story]**: Maps the task to a user story from `spec.md`
- Every task names the exact file it changes

**A note on parallelism across stories**: Unlike some earlier features in this repo, US1–US5 here all extend the same three shared files (`lib/issues/create-issue.ts`, `app/actions/issues.ts`, `components/projects/issues/create-issue-form.tsx`) — one composer, built up incrementally. Each story is independently *testable* per its Independent Test criteria in `spec.md`, but implementing US2–US5 truly in parallel (by different people) would conflict on those shared files. The recommended path is sequential, in priority order; parallelism applies within a phase (e.g., writing two test files at once), not across story phases.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm prerequisites, add the one governance-reused dependency, and record framework guidance before any schema or story work begins.

- [X] T001 Read the Next.js 16.3 guides for Server Actions, forms, `useActionState`, and revalidation under `node_modules/next/dist/docs/` relevant to this feature, per `AGENTS.md`
- [X] T002 Add `marked` (`^15.0.0`) to `package.json` and run `npm install`, exercising the governance approval recorded in `specs/009-create-issue/governance.md` (no new approval needed)
- [X] T003 Audit the Foundation Dependency Gate: confirm `lib/db/schema/users.ts`, `lib/db/schema/projects.ts`, `lib/db/schema/project-memberships.ts`, `lib/auth/guards.ts` (`requireSession`), `lib/db/queries/projects.ts` (`getProjectAccessByKey`), and `app/(shell)/projects/[projectKey]/page.tsx` provide the membership/access primitives this feature builds on; stop before Phase 2 if any is missing or incompatible

**Checkpoint**: `marked` is installed, framework guidance is read, and the shared foundations this feature extends are confirmed present.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the tested schema, validation, and markdown-rendering modules shared by every user story.

**CRITICAL**: No user story work begins until this phase's tests pass.

- [X] T004 [P] Write failing PostgreSQL integration tests for the `issues`, `labels`, and `issue_labels` schemas — enum membership, foreign keys, `onDelete` behavior, the `(project_id, lower(name))` unique index on `labels`, and the composite primary key on `issue_labels` — in `tests/integration/issues/issue-schema.test.ts`
- [X] T005 [P] Write failing unit tests for field validation — title required/trimmed/≤255 chars, description ≤10,000 chars, status/priority enum membership, label name trimmed/1–50 chars — in `tests/unit/issues/create-issue-validation.test.ts`
- [X] T006 [P] Write failing unit tests for the markdown renderer — bold, italics, links (with scheme allowlist), bulleted/numbered lists, and headings render correctly; images, fenced code, blockquotes, tables, and raw HTML/script render as plain escaped text instead of their tags; disallowed link schemes (e.g., `javascript:`) render as plain text — in `tests/unit/issues/markdown-render.test.ts`
- [X] T007 Implement the `issue_status` and `issue_priority` PostgreSQL enums and the `issues` table (per `data-model.md`) in `lib/db/schema/issues.ts` — make the `issues`-table portion of T004 pass
- [X] T008 [P] Implement the `labels` table, including the case-insensitive unique index, in `lib/db/schema/labels.ts` — make the `labels`-table portion of T004 pass
- [X] T009 [P] Implement the `issue_labels` join table (composite primary key, foreign keys) in `lib/db/schema/issue-labels.ts` — make the `issue_labels`-table portion of T004 pass
- [X] T010 Export the new schemas and define `issues`/`labels`/`issue_labels` relations to `users`, `projects`, and each other in `lib/db/schema/index.ts` and `lib/db/schema/relations.ts`
- [X] T011 Generate and review the Drizzle migration for `issues`, `labels`, and `issue_labels` in `drizzle/migrations/`; apply it to the dev and test databases
- [X] T012 [P] Implement the field validation module in `lib/issues/validation.ts` — make T005 pass
- [X] T013 [P] Implement the markdown renderer using `marked` with a custom `Renderer` restricted to FR-004's five elements and a link-scheme allowlist, in `lib/markdown/render.ts` — make T006 pass
- [X] T014 Add deterministic issue/label test factories (a project with two active members, an existing label fixture) to `tests/helpers/issues.ts`, following the pattern in `tests/helpers/project-members.ts`

**Checkpoint**: Schema, validation, and markdown-rendering tests pass against a migrated database; user story implementation can begin.

---

## Phase 3: User Story 1 - Create a New Issue with Minimum Details (Priority: P1) 🎯 MVP

**Goal**: A project member creates an issue with only a title; it saves with status = Backlog, priority = No Priority, no labels, and no assignee. Non-members are rejected.

**Independent Test**: Submit a title-only issue as a project member and verify it is saved with the stated defaults; attempt the same as a non-member and verify rejection with no row created.

### Tests for User Story 1

> Write these tests first and confirm they fail for the intended missing behavior.

- [X] T015 [P] [US1] Write failing integration tests for the minimal create-issue path — title-only issue defaults to `backlog`/`none`/no labels/unassigned; blank-title rejection; member-vs-non-member authorization (non-member and unknown-project both reject as `forbidden` without distinguishing) — in `tests/integration/issues/create-issue-authorization.test.ts` and `tests/integration/issues/create-issue-action.test.ts`
- [X] T016 [P] [US1] Write failing component tests for the New Issue form's title field, Cancel/Create footer, pending-disabled submit, and blank-title inline error in `tests/component/issues/create-issue-form.test.tsx`

### Implementation for User Story 1

- [X] T017 [US1] Implement the create-issue transaction (re-check session and active project membership, validate title, default `status`/`priority`, insert the issue with `created_by`) in `lib/issues/create-issue.ts` — make T015's minimal-path assertions pass
- [X] T018 [US1] Implement the `createIssue` Server Action (authorization order per `contracts/server-actions.md`, `FormData` extraction, calls the transaction, redirects to the project page on success) in `app/actions/issues.ts`
- [X] T019 [P] [US1] Implement `CreateIssueForm` with the title input and Cancel/Create footer (status/priority/description/labels/assignee added in later phases) in `components/projects/issues/create-issue-form.tsx` — make T016 pass
- [X] T020 [US1] Implement the New Issue page — membership-gated the same way the existing project page is (`notFound()` for non-members/unknown project), renders `<CreateIssueForm>` — in `app/(shell)/projects/[projectKey]/issues/new/page.tsx`
- [X] T021 [US1] Add a "New issue" entry-point link to the existing placeholder project page in `app/(shell)/projects/[projectKey]/page.tsx`

**Checkpoint**: Minimal issue creation works end-to-end and is membership-gated — this is the deployable MVP.

---

## Phase 4: User Story 2 - Choose Status and Priority at Creation (Priority: P2)

**Goal**: The creator can pick any of the five status columns and any of the five priority levels; omitted fields keep their defaults.

**Independent Test**: Create an issue selecting a non-default column and a specific priority, then verify both are persisted; create another leaving priority unselected and verify it defaults to No Priority.

### Tests for User Story 2

> Write these tests first and confirm they fail for the intended missing behavior.

- [X] T022 [P] [US2] Extend `tests/integration/issues/create-issue-action.test.ts` with failing tests: each of the five status values and five priority values is accepted and persisted; an invalid status/priority value returns a field error; omitting priority still defaults to `none`
- [X] T023 [P] [US2] Extend `tests/component/issues/create-issue-form.test.tsx` with failing tests: the status picker lists all five options with correct display labels, the priority picker lists all five options, and selecting each updates the submitted form value

### Implementation for User Story 2

- [X] T024 [US2] Extend the create-issue transaction to accept and validate explicit `status`/`priority` inputs in `lib/issues/create-issue.ts`
- [X] T025 [US2] Extend `createIssue` to pass through `status`/`priority` fields in `app/actions/issues.ts`
- [X] T026 [US2] Add the status picker (five options, `status` token colors) and priority picker (five options, `priority` token colors) to `components/projects/issues/create-issue-form.tsx` — make T022–T023 pass

**Checkpoint**: Status and priority selection work on top of the MVP.

---

## Phase 5: User Story 3 - Add a Formatted Description (Priority: P3)

**Goal**: The creator writes a markdown description (bold, list, link, heading) and can preview it rendered before submitting; raw HTML/script never executes.

**Independent Test**: Create an issue with a description containing each supported element, preview it, and confirm each renders as formatted rather than as raw markdown syntax or executable markup.

### Tests for User Story 3

> Write these tests first and confirm they fail for the intended missing behavior.

- [X] T027 [P] [US3] Extend `tests/integration/issues/create-issue-action.test.ts` with failing tests: description is stored as raw markdown text (not HTML); an over-length description is rejected; an empty description is allowed
- [X] T028 [P] [US3] Extend `tests/component/issues/create-issue-form.test.tsx` with failing tests: Write/Preview tab toggle switches panels; Preview renders bold/italic/list/heading/link via `lib/markdown/render.ts`; raw HTML/script typed into the description renders as inert text in Preview

### Implementation for User Story 3

- [X] T029 [US3] Enforce the description length bound in `lib/issues/create-issue.ts` and `lib/issues/validation.ts`
- [X] T030 [US3] Add the description textarea with Write/Preview tabs (Preview uses `lib/markdown/render.ts`) and the "Markdown supported" hint, matching `create-project-form.tsx`'s existing pattern, to `components/projects/issues/create-issue-form.tsx` — make T027–T028 pass

**Checkpoint**: Description with live markdown preview works on top of prior stories.

---

## Phase 6: User Story 4 - Assign the Issue (Priority: P4)

**Goal**: The creator assigns the issue to a project member or to themselves via "Assign to me"; a stale assignee at submission time results in an unassigned issue, not a rejected submission.

**Independent Test**: Create one issue assigned via the member picker and another via "Assign to me"; verify each issue's assignee. Select an assignee, remove them from the project before submitting, and verify the issue is created unassigned with a notice rather than rejected.

### Tests for User Story 4

> Write these tests first and confirm they fail for the intended missing behavior.

- [X] T031 [P] [US4] Extend `tests/integration/issues/create-issue-action.test.ts` with failing tests: assignee stored when a valid active member is selected; "assign to me" resolves to the current session user; omitted assignee leaves the issue unassigned; an assignee no longer an active project member at submission time results in an unassigned issue (not a rejection) with an `assigneeCleared` flag on the result
- [X] T032 [P] [US4] Extend `tests/component/issues/create-issue-form.test.tsx` with failing tests: assignee picker renders project members with avatars, "Assign to me" selects the current user, selecting a member highlights them, and "Clear" appears once assigned and clears the selection

### Implementation for User Story 4

- [X] T033 [US4] Extend the create-issue transaction to re-validate the assignee's active project membership at submission time and clear it (with `assigneeCleared: true`) rather than fail when stale, in `lib/issues/create-issue.ts`
- [X] T034 [US4] Extend `createIssue` to pass through `assigneeId` (including the `"me"` shorthand) and carry the `assigneeCleared` flag through the post-redirect notice, in `app/actions/issues.ts`
- [X] T035 [US4] Add the assignee picker ("Assign to me", member avatars, "Clear") to `components/projects/issues/create-issue-form.tsx`, and render the inline "assignee was no longer a member" notice on `app/(shell)/projects/[projectKey]/page.tsx` when the redirect flag is present — make T031–T032 pass

**Checkpoint**: Assignment, including the stale-assignee edge case, works on top of prior stories.

---

## Phase 7: User Story 5 - Apply or Create Labels Inline (Priority: P5)

**Goal**: The creator selects one or more existing labels and/or types a new name to create and apply a label inline, with each applied label independently removable; identical concurrent label names never create duplicates.

**Independent Test**: Create one issue applying two existing labels, and another by typing a new label name and confirming it is created, applied, and available on the next issue's label list. Submit two concurrent creations with the identical new label name (case-insensitive) and confirm exactly one label row results.

### Tests for User Story 5

> Write these tests first and confirm they fail for the intended missing behavior.

- [X] T036 [P] [US5] Write failing tests for existing-label application, multi-label application (each stored independently via `issue_labels`), inline label creation and attachment, and case-insensitive reuse of an existing name, in `tests/integration/issues/create-issue-action.test.ts`
- [X] T037 [P] [US5] Write failing concurrency tests — two simultaneous issue creations in the same project requesting the identical new label name (differing only in case) result in exactly one `labels` row, with both issues referencing it — in `tests/integration/issues/create-issue-label-concurrency.test.ts`
- [X] T038 [P] [US5] Extend `tests/component/issues/create-issue-form.test.tsx` with failing tests: label picker lists existing project labels as toggle rows, selected labels render as independently removable chips, typing a new name shows a "Create '...'" affordance, and multiple labels can be selected/created together

### Implementation for User Story 5

- [X] T039 [US5] Implement `listLabelsForProject` in `lib/db/queries/labels.ts`
- [X] T040 [US5] Extend the create-issue transaction with the label insert-or-reuse step (`ON CONFLICT (project_id, lower(name)) DO NOTHING` plus a case-insensitive re-select fallback) and `issue_labels` inserts, in `lib/issues/create-issue.ts` — make T036–T037 pass
- [X] T041 [US5] Extend `createIssue` to pass through `labelIds[]`/`newLabelNames[]`, and extend the New Issue page to load label options, in `app/actions/issues.ts` and `app/(shell)/projects/[projectKey]/issues/new/page.tsx`
- [X] T042 [US5] Add the label picker (search/select existing, inline "Create '...'", `label` token color swatches, removable chips) to `components/projects/issues/create-issue-form.tsx` — make T038 pass

**Checkpoint**: All five user stories are complete; the composer matches the "Team Works" design mockup's New Issue screen in full.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Whole-feature accessibility, lint/test verification, and end-to-end validation.

- [X] T043 [P] Manually verify keyboard-only operation of the full composer (status/priority/label/assignee pickers, Write/Preview toggle) with visible focus at every step, per `contracts/pages.md`'s accessibility contract
- [X] T044 [P] Run `npm run verify` (Biome + full test suite) across all changed files and fix any violations
- [X] T045 Execute `specs/009-create-issue/quickstart.md` Scenarios 1–5 against the running app and confirm all expected outcomes
- [X] T046 [P] Review all changed source for constitution compliance — no inline comments, no `any`, no raw color/dimension literals outside `styles/tokens.stylex.ts`, no dead code, and no dependency beyond the governance-reused `marked`

**Checkpoint**: Feature is complete, verified, and constitution-compliant.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T003 is a gate — do not proceed to Phase 2 if any foundation is missing or incompatible
- **Foundational (Phase 2)**: Depends on Phase 1; T007–T009 depend on T004 (schema tests); T010–T011 depend on T007–T009; T012 depends on T005; T013 depends on T006
- **User Story 1 (Phase 3)**: Depends on Foundational; T015–T016 (tests) precede T017–T021 (implementation)
- **User Story 2 (Phase 4)**: Depends on US1 (extends its files); T022–T023 precede T024–T026
- **User Story 3 (Phase 5)**: Depends on US1 (extends its files); can be sequenced before or after US2 in principle, but both edit the same shared files, so implement in priority order; T027–T028 precede T029–T030
- **User Story 4 (Phase 6)**: Depends on US1 (extends its files); T031–T032 precede T033–T035
- **User Story 5 (Phase 7)**: Depends on US1 (extends its files) and on Foundational's label schema; T036–T038 precede T039–T042
- **Polish (Phase 8)**: Depends on every story selected for release

### User Story Dependency Graph

```text
Setup -> Foundation Gate -> Foundational -> US1 (MVP)
US1 -> US2
US1 -> US3
US1 -> US4
US1 -> US5
US2, US3, US4, US5 -> Polish
```

### Within Each User Story

- Write every listed test first and confirm it fails for the intended missing behavior
- Schema before validation/rendering, validation/rendering before the transaction, the transaction before the Server Action, the Server Action before page/form integration
- Implement in priority order (US1 → US2 → US3 → US4 → US5) since all stories after US1 share the same three files

### Parallel Opportunities

- T004, T005, T006 target independent test files and can be written in parallel
- T008 and T009 target independent schema files and can proceed in parallel once T007 establishes the enums
- T012 and T013 target independent implementation files and can proceed in parallel
- Within each user story phase, the listed test tasks (marked `[P]`) target independent test files and can be written in parallel before their paired implementation tasks begin

---

## Parallel Examples

### Foundational

```text
Task T004: Schema constraint tests in tests/integration/issues/issue-schema.test.ts
Task T005: Field validation tests in tests/unit/issues/create-issue-validation.test.ts
Task T006: Markdown renderer tests in tests/unit/issues/markdown-render.test.ts
```

### User Story 1

```text
Task T015: Minimal-path and authorization tests in tests/integration/issues/create-issue-authorization.test.ts and tests/integration/issues/create-issue-action.test.ts
Task T016: Title field and footer component tests in tests/component/issues/create-issue-form.test.tsx
```

### User Story 5

```text
Task T036: Label application and inline-creation tests in tests/integration/issues/create-issue-action.test.ts
Task T037: Label-name concurrency tests in tests/integration/issues/create-issue-label-concurrency.test.ts
Task T038: Label picker component tests in tests/component/issues/create-issue-form.test.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and stop if the Foundation Dependency Gate is not satisfied
2. Complete Phase 2 using Red-Green-Refactor
3. Complete Phase 3 (US1)
4. **STOP and VALIDATE**: run Quickstart Scenario 1 and Scenario 4 manually
5. Deploy/demo if ready — a project member can create a minimally-specified issue

### Incremental Delivery

1. Setup + Foundational establish the schema, validation, and markdown renderer
2. US1 delivers the MVP: minimal issue creation, membership-gated
3. US2 adds status/priority selection
4. US3 adds the formatted description with live preview
5. US4 adds assignment, including the stale-assignee edge case
6. US5 adds labels, including inline creation and the concurrency guard
7. Polish verifies accessibility, lint/tests, and the full quickstart matrix

### Sequential Team Strategy

Because US2–US5 all extend the same three shared files, this feature is best implemented by one person or pair working through the phases in order, rather than split across parallel workstreams per story (contrast with features where stories touch disjoint files).

---

## Notes

- `[P]` tasks target different files and have no dependency on unfinished work at that point
- `[US1]`–`[US5]` map directly to the five specification stories
- Tests must fail before their corresponding production work begins
- Status and priority are fixed enums — there is no column-management story in this feature, unlike the discontinued `003-issue-kanban-board`
- `marked` is the only new dependency; it reuses the 2026-08-18 governance approval recorded in `governance.md` — do not add `DOMPurify` or any other markdown/sanitization package
- Commit after each task or cohesive Red-Green-Refactor group
