# Tasks: Create Project

**Input**: Design documents from `/specs/007-create-project/`

**Constitution note**: TDD is mandatory (Principle V). Every production code task is preceded by a failing-test task. Tests must fail before the implementation task begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependency)
- **[Story]**: Maps to a user story from spec.md (US1, US2, US3, US5)
- `[X]` = completed; `[ ]` = pending

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Token extension and database schema — required before any story work.

- [X] T001 Add `projectColors` `defineVars` group to `styles/tokens.stylex.ts` with 12 tokens (see exact oklch values in `data-model.md`): `red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink`
- [X] T002 Create `lib/db/schema/projects.ts` defining `pgTable('projects', ...)` with columns: `id` UUID pk defaultRandom, `key` varchar(6) notNull unique, `name` varchar(255) notNull, `description` text notNull, `color` varchar(20) notNull, `start_date` date notNull, `end_date` date nullable, `created_by` UUID FK→users.id onDelete:'restrict' notNull, `created_at` and `updated_at` timestamptz notNull defaultNow
- [X] T003 Add `export * from './projects'` to `lib/db/schema/index.ts`
- [X] T004 Create `lib/db/schema/project-members.ts` defining `pgTable('project_members', ...)` with columns: `project_id` UUID FK→projects.id onDelete:'cascade' notNull, `user_id` UUID FK→users.id onDelete:'restrict' notNull, `created_at` timestamptz notNull defaultNow; composite primary key on `(project_id, user_id)`; index on `user_id`
- [X] T005 Add `export * from './project-members'` to `lib/db/schema/index.ts`

**Checkpoint**: Both schemas defined — run `npm run db:generate` to verify no Drizzle type errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration, key-generator utility, and validation helpers — must complete before user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Run `npm run db:generate` to generate the Drizzle migration for the projects table; commit the output file under `drizzle/migrations/`
- [X] T007 [P] Write failing unit tests in `tests/unit/projects/key-generator.test.ts` covering `generateProjectKey`: (a) multi-word → first letters ("Marketing Campaign" → "MC"); (b) single-word → pad from first word ("Marketing" → "MA"); (c) truncation at 6 chars ("Alpha Beta Gamma Delta Epsilon Zeta" → "ABGDEZ"); (d) strip non-alphanumeric ("Hello-World" → "HW"); (e) symbols-only fallback ("!!!" → "PROJ"); (f) single letter word pads from first word ("A B" → "AB")
- [X] T008 [P] Write failing unit tests in `tests/unit/projects/create-project-validation.test.ts` covering server-side validation rules: (a) key regex `/^[A-Z0-9]{2,6}$/` accepts "PROJ", rejects "proj", "P", "TOOLONG7", "P!"; (b) color allowlist accepts all 12 keys, rejects "gray", "black", ""; (c) date comparison rejects `endDate === startDate` and `endDate < startDate`; (d) blank/trim-to-empty name rejected; (e) description over 10 000 chars rejected
- [X] T009 Implement `generateProjectKey(name: string): string` in `lib/projects/key-generator.ts` — make all T007 tests pass (Red → Green → Refactor)
- [X] T010 Run `npm run db:generate` to generate a new Drizzle migration for the `project_members` table (depends on T004–T005); commit the output migration file under `drizzle/migrations/`
- [X] T011 Apply migration to dev and test databases: `npm run db:migrate` and `DATABASE_URL=$DATABASE_URL_TEST npm run db:migrate`

**Checkpoint**: `npm test tests/unit/projects/` passes. Both tables exist in dev and test DBs. Foundation ready.

---

## Phase 3: User Story 5 — Non-Admin Access Control (Priority: P1)

**Goal**: All non-admin users are unconditionally blocked from the project creation page and action.

**Independent Test**: Log in as a Member; navigate to `/projects/new` — access is denied. Craft a direct call to `createProject` with a Member session — rejected result returned, no DB row created.

- [X] T012 [US5] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) Member session GET `/projects/new` → receives a 403 or redirect (not 200); (b) Member session calls `createProject` action with valid field data → returns `{ error: 'forbidden' }` and no `projects` row is inserted

> **⚠️ Write tests first. They must fail. Then implement T013–T014.**

- [X] T013 [P] [US5] Create `app/(shell)/projects/new/page.tsx` as a Server Component: call `requireAdmin()` at the top; if denied, Next.js 404/redirect; render a placeholder `<div>` (not the full form yet) — make the T012 page test pass
- [X] T014 [P] [US5] Create `app/actions/projects.ts` exporting `createProject(prevState, formData: FormData)` that calls `requireAdmin()` first and returns `{ error: 'forbidden' }` if rejected — make the T012 action test pass

**Checkpoint**: T012 integration tests pass. Non-admin access is blocked end-to-end.

---

## Phase 4: User Story 1 — Admin Creates a Project with Required Fields (Priority: P1) 🎯 MVP

**Goal**: An admin fills the five required fields, submits, and the project appears in the list within 2 seconds.

**Independent Test**: Log in as admin; navigate to `/projects/new`; fill name, key, description, color, start date; submit; verify the new project row exists in the DB and the page redirects to `/projects`.

- [X] T015 [P] [US1] Write failing component tests in `tests/unit/projects/create-project-form.test.tsx`: (a) on name blur "Marketing" → key field value is "MA"; (b) on name blur "Marketing Campaign" → key field is "MC"; (c) after admin types "MKTG" in key field, changing name to "Mobile" does NOT overwrite the key; (d) clicking amber swatch sets the color hidden input to "amber"; (e) Submit button is disabled while pending
- [X] T016 [P] [US1] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) admin submits valid required fields → `projects` row inserted with correct key/name/description/color/startDate, redirects to `/projects`; (b) missing name → `{ fieldErrors: { name: '...' } }` returned; (c) key "mc!" (invalid format) → `{ fieldErrors: { key: '...' } }`; (d) key already in DB → `{ fieldErrors: { key: 'This key is already in use...' } }`; (e) description stored as raw markdown string (not HTML)

> **⚠️ Write tests first. They must fail. Then implement T017–T019.**

- [X] T017 [US1] Create `components/projects/create-project-form.tsx` as a `'use client'` component using `useActionState(createProject, null)`: name `<input>` with `onBlur` that calls `generateProjectKey(name)` and sets key field if not dirty; key `<input>` that sets a `keyDirty` ref on any keystroke, enforces uppercase via `onChange`; description `<textarea>` with hint listing supported markdown; 12-color swatch grid using `projectColors` tokens via `stylex.create`; start date `<input type="date">`; per-field error `<span>` linked to each input via `aria-describedby`; submit button disabled during pending state — make T015 tests pass
- [X] T018 [US1] Complete `createProject(prevState, formData)` in `app/actions/projects.ts`: (1) `requireAdmin()`; (2) extract and trim all FormData fields; (3) validate key format, color allowlist, blank checks per `contracts/server-actions.md`; (4) query DB for key uniqueness (`SELECT 1 FROM projects WHERE key = ?`), return field error if found; (5) `db.insert(projects).values({...})`; (6) `revalidatePath('/projects')`; (7) `redirect('/projects')` — make T016 tests pass
- [X] T019 [US1] Complete `app/(shell)/projects/new/page.tsx`: after `requireAdmin()`, render `<CreateProjectForm />` (no server data props needed yet); add page title and form wrapper with correct heading and accessibility landmark

**Checkpoint**: T015 and T016 tests pass. Admin can create a project with required fields end-to-end.

---

## Phase 5: User Story 2 — Admin Creates a Project with an End Date (Priority: P2)

**Goal**: An admin optionally adds an end date; the system rejects an end date that is not strictly after the start date.

**Independent Test**: Create a project with end date `2026-12-31` (start `2026-09-01`) → both dates stored. Create with end date `2026-09-01` (same as start) → field error, no row inserted.

- [X] T020 [US2] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) valid end date after start date → `end_date` stored correctly; (b) end date equal to start date → `{ fieldErrors: { endDate: 'End date must be after the start date' } }`, no row inserted; (c) end date before start date → same field error; (d) no end date → `end_date` is null in DB

> **⚠️ Write tests first. They must fail. Then implement T021–T022.**

- [X] T021 [US2] Add end date `<input type="date">` labeled "End Date (optional)" to `components/projects/create-project-form.tsx`; wire its error display the same way as other fields
- [X] T022 [US2] Add end date validation to `createProject` in `app/actions/projects.ts`: when `endDate` is non-empty, parse both date strings and reject if `endDate <= startDate`; return `{ fieldErrors: { endDate: 'End date must be after the start date' } }` — make T020 tests pass

**Checkpoint**: T020 tests pass. End date validation works independently.

---

## Phase 6: User Story 3 — Admin Adds Members During Project Creation (Priority: P2)

**Goal**: Admin can select zero or more users (all registered users except themselves) to add atomically with the project. Selected users appear in `project_members` after creation.

**Independent Test**: Create a project with 2 members selected → both rows in `project_members`; the creating admin's own ID is not in the picker; creating with no members → empty member list; `project_members` inserts roll back if the transaction fails.

- [X] T023 [P] [US3] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) admin submits with `memberIds` containing two valid user UUIDs → two rows inserted in `project_members` with correct `project_id`; (b) admin submits with no `memberIds` → `project_members` has zero rows for that project; (c) `memberIds` containing the creating admin's own UUID → that UUID is silently dropped, no self-membership row; (d) `memberIds` containing a non-existent UUID → that UUID is silently dropped, remaining valid UUIDs are inserted; (e) DB failure during `project_members` insert → `projects` row is also rolled back (no orphan project)
- [X] T024 [P] [US3] Write failing component test in `tests/unit/projects/create-project-form.test.tsx`: (a) member picker renders a list of `availableUsers` prop; (b) typing "ali" filters the list to users whose name or email contains "ali" (case-insensitive); (c) clicking a user adds a chip and removes that user from the dropdown; (d) clicking the dismiss icon on a chip removes it and returns the user to the dropdown; (e) selected user IDs appear as `memberIds[]` hidden inputs in the submitted form data

> **⚠️ Write tests first. They must fail. Then implement T025–T027.**

- [X] T025 [US3] Extend `createProject` in `app/actions/projects.ts`: (1) extract `memberIds[]` array from FormData; (2) parse as UUIDs, filter out the creating admin's own `userId` and any UUID not found in the `users` table; (3) wrap the `projects` insert and all `project_members` inserts in a single `db.transaction(...)` call; (4) on commit, proceed to `revalidatePath`/`redirect` as before — make T023 tests pass
- [X] T026 [US3] Extend `app/(shell)/projects/new/page.tsx`: after `requireAdmin()`, query all users where `id ≠ adminUserId` ordered by name; pass as `availableUsers: { id: string; name: string; email: string }[]` prop to `<CreateProjectForm>` — make T024 picker-render test pass
- [X] T027 [US3] Implement member picker in `components/projects/create-project-form.tsx`: add `availableUsers` prop; render a search `<input>` that filters `availableUsers` in-memory by name and email (case-insensitive substring match); render filtered results as a clickable list; on click, move user to a `selectedUsers` state array and render as a dismissible chip (`name` visible, `id` as `<input type="hidden" name="memberIds[]">`); on chip dismiss, move user back to the filtered list; show "No users found" when filter matches zero users — make T024 tests pass

**Checkpoint**: T023 and T024 tests pass. Admin can add members atomically during project creation.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Code quality gate, accessibility verification, and full end-to-end validation.

- [X] T028 [P] Verify keyboard focus order in `components/projects/create-project-form.tsx` matches the contract: Project Name → Project Key → Description → Color picker (arrow-key navigation within swatch group) → Start Date → End Date → Member Picker search input → Submit; add `tabIndex` adjustments or roving tabindex to the swatch group and member picker if needed
- [X] T029 [P] Run `npm run verify` — `biome check` must exit 0 across all modified files (`lib/db/schema/project-members.ts`, `app/actions/projects.ts`, `app/(shell)/projects/new/page.tsx`, `components/projects/create-project-form.tsx`); fix any lint or format violations
- [X] T030 Run full test suite: `npm test` — all tests in `tests/unit/projects/` and `tests/integration/projects/` must pass with 0 failures
- [X] T031 Run Quickstart Scenarios 1–8 from `specs/007-create-project/quickstart.md` manually; confirm all expected outcomes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start T004–T005 immediately
- **Phase 2 (Foundational)**: T010–T011 require T004–T005 from Phase 1; T006–T009 were previously complete
- **Phase 3 (US5)**: Requires Phase 2 — BLOCKS Phases 4, 5, 6 ✅ (already complete)
- **Phase 4 (US1)**: Requires Phase 3 ✅ (already complete)
- **Phase 5 (US2)**: Requires Phase 4 ✅ (already complete)
- **Phase 6 (US3)**: Requires Phase 5 and Phase 2 (T011 migration must be applied before integration tests)
- **Phase 7 (Polish)**: Requires Phase 6

### Within Each Phase

- Tasks marked **[P]** share no file dependencies and can run in parallel
- Test tasks (T023, T024) MUST run and FAIL before their paired implementation tasks (T025–T027)
- T025 depends on T023; T026–T027 depend on T024

### Parallel Opportunities Per Phase

```
Phase 1:  T004 ‖ T005          (different schema files)
Phase 2:  T007 ‖ T008          (different test files — already done; new: T010 sequential after T004–T005)
Phase 6:  T023 ‖ T024          (integration tests vs. component tests — different files)
Phase 7:  T028 ‖ T029          (different concerns, no shared file)
```

---

## Implementation Strategy

### Remaining MVP (User Story 3 Only)

Since US1, US2, and US5 are complete, proceed directly:

1. Complete Phase 1 additions: T004–T005 (project-members schema)
2. Complete Phase 2 additions: T010–T011 (migration + apply)
3. Complete Phase 6: US3 (member picker, T023–T027)
4. **STOP and VALIDATE**: Run Quickstart Scenario 8 manually
5. Complete Phase 7: Polish (T028–T031)

### Incremental Delivery Within US3

1. T023–T025: Server Action + transaction (backend-only, testable via integration tests)
2. T026: Page query (preload users, no UI yet)
3. T024 + T027: Client Component member picker (UI layer)
4. T028–T031: Polish

---

## Notes

- The key generator runs client-side on name blur with **no DB uniqueness check**; the server action is the authoritative uniqueness gate
- `createProject` uses `useActionState` (React 19 API) — not the deprecated `useFormState`
- All component styles must use `stylex.create` with tokens from `@/styles/tokens.stylex`; no raw color literals or inline styles
- `requireAdmin()` is defined in `lib/auth/` (001-user-role-management); do not reimplement it
- Member picker search is in-memory (client-side filter over ~20 users passed as a prop); no server round-trip needed
- `db.transaction(...)` in Drizzle wraps both the `projects` insert and all `project_members` inserts — if any fails, both roll back
- Run `npm run verify` after every phase to catch lint/format regressions early
- `marked` was approved 2026-08-18; markdown rendering of the description field is unblocked but belongs to the project detail view (a separate feature)
