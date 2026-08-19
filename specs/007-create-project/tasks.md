# Tasks: Create Project

**Input**: Design documents from `/specs/007-create-project/`

**Constitution note**: TDD is mandatory (Principle V). Every production code task is preceded by a failing-test task. Tests must fail before the implementation task begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependency)
- **[Story]**: Maps to a user story from spec.md (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Token extension and database schema — required before any story work.

- [X] T001 Add `projectColors` `defineVars` group to `styles/tokens.stylex.ts` with 12 tokens (see exact oklch values in `data-model.md`): `red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink`
- [X] T002 Create `lib/db/schema/projects.ts` defining `pgTable('projects', ...)` with columns: `id` UUID pk defaultRandom, `key` varchar(6) notNull unique, `name` varchar(255) notNull, `description` text notNull, `color` varchar(20) notNull, `start_date` date notNull, `end_date` date nullable, `created_by` UUID FK→users.id onDelete:'restrict' notNull, `created_at` and `updated_at` timestamptz notNull defaultNow
- [X] T003 Add `export * from './projects'` to `lib/db/schema/index.ts`

**Checkpoint**: Schema defined — run `npm run db:generate` to verify no Drizzle type errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration, key-generator utility, and validation helpers — must complete before user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Run `npm run db:generate` to generate the Drizzle migration for the projects table; commit the output file under `drizzle/migrations/`
- [X] T005 [P] Write failing unit tests in `tests/unit/projects/key-generator.test.ts` covering `generateProjectKey`: (a) multi-word → first letters ("Marketing Campaign" → "MC"); (b) single-word → pad from first word ("Marketing" → "MA"); (c) truncation at 6 chars ("Alpha Beta Gamma Delta Epsilon Zeta" → "ABGDEZ"); (d) strip non-alphanumeric ("Hello-World" → "HW"); (e) symbols-only fallback ("!!!" → "PROJ"); (f) single letter word pads from first word ("A B" → "AB")
- [X] T006 [P] Write failing unit tests in `tests/unit/projects/create-project-validation.test.ts` covering server-side validation rules: (a) key regex `/^[A-Z0-9]{2,6}$/` accepts "PROJ", rejects "proj", "P", "TOOLONG7", "P!"; (b) color allowlist accepts all 12 keys, rejects "gray", "black", ""; (c) date comparison rejects `endDate === startDate` and `endDate < startDate`; (d) blank/trim-to-empty name rejected; (e) description over 10 000 chars rejected
- [X] T007 Implement `generateProjectKey(name: string): string` in `lib/projects/key-generator.ts` — make all T005 tests pass (Red → Green → Refactor)

**Checkpoint**: `npm test tests/unit/projects/` passes. Foundation ready.

---

## Phase 3: User Story 3 — Non-Admin Access Control (Priority: P1)

**Goal**: All non-admin users are unconditionally blocked from the project creation page and action.

**Independent Test**: Log in as a Member; navigate to `/projects/new` — access is denied. Craft a direct call to `createProject` with a Member session — rejected result returned, no DB row created.

- [X] T008 [US3] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) Member session GET `/projects/new` → receives a 403 or redirect (not 200); (b) Member session calls `createProject` action with valid field data → returns `{ error: 'forbidden' }` and no `projects` row is inserted

> **⚠️ Write tests first. They must fail. Then implement T009–T010.**

- [X] T009 [P] [US3] Create `app/(shell)/projects/new/page.tsx` as a Server Component: call `requireAdmin()` at the top; if denied, Next.js 404/redirect; render a placeholder `<div>` (not the full form yet) — make the T008 page test pass
- [X] T010 [P] [US3] Create `app/actions/projects.ts` exporting `createProject(prevState, formData: FormData)` that calls `requireAdmin()` first and returns `{ error: 'forbidden' }` if rejected — make the T008 action test pass

**Checkpoint**: T008 integration tests pass. Non-admin access is blocked end-to-end.

---

## Phase 4: User Story 1 — Admin Creates a Project with Required Fields (Priority: P1) 🎯 MVP

**Goal**: An admin fills the five required fields, submits, and the project appears in the list within 2 seconds.

**Independent Test**: Log in as admin; navigate to `/projects/new`; fill name, key, description, color, start date; submit; verify the new project row exists in the DB and the page redirects to `/projects`.

- [X] T011 [P] [US1] Write failing component tests in `tests/unit/projects/create-project-form.test.tsx`: (a) on name blur "Marketing" → key field value is "MA"; (b) on name blur "Marketing Campaign" → key field is "MC"; (c) after admin types "MKTG" in key field, changing name to "Mobile" does NOT overwrite the key; (d) clicking amber swatch sets the color hidden input to "amber"; (e) Submit button is disabled while pending
- [X] T012 [P] [US1] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) admin submits valid required fields → `projects` row inserted with correct key/name/description/color/startDate, redirects to `/projects`; (b) missing name → `{ fieldErrors: { name: '...' } }` returned; (c) key "mc!" (invalid format) → `{ fieldErrors: { key: '...' } }`; (d) key already in DB → `{ fieldErrors: { key: 'This key is already in use...' } }`; (e) description stored as raw markdown string (not HTML)

> **⚠️ Write tests first. They must fail. Then implement T013–T015.**

- [X] T013 [US1] Create `components/projects/create-project-form.tsx` as a `'use client'` component using `useActionState(createProject, null)`: name `<input>` with `onBlur` that calls `generateProjectKey(name)` and sets key field if not dirty; key `<input>` that sets a `keyDirty` ref on any keystroke, enforces uppercase via `onChange`; description `<textarea>` with hint listing supported markdown; 12-color swatch grid using `projectColors` tokens via `stylex.create`; start date `<input type="date">`; per-field error `<span>` linked to each input via `aria-describedby`; submit button disabled during pending state — make T011 tests pass
- [X] T014 [US1] Complete `createProject(prevState, formData)` in `app/actions/projects.ts`: (1) `requireAdmin()`; (2) extract and trim all FormData fields; (3) validate key format, color allowlist, blank checks per `contracts/server-actions.md`; (4) query DB for key uniqueness (`SELECT 1 FROM projects WHERE key = ?`), return field error if found; (5) `db.insert(projects).values({...})`; (6) `revalidatePath('/projects')`; (7) `redirect('/projects')` — make T012 tests pass
- [X] T015 [US1] Complete `app/(shell)/projects/new/page.tsx`: after `requireAdmin()`, render `<CreateProjectForm />` (no server data props needed — key uniqueness is checked server-side on submit); add page title and form wrapper with correct heading and accessibility landmark

**Checkpoint**: T011 and T012 tests pass. Admin can create a project with required fields end-to-end.

---

## Phase 5: User Story 2 — Admin Creates a Project with an End Date (Priority: P2)

**Goal**: An admin optionally adds an end date; the system rejects an end date that is not strictly after the start date.

**Independent Test**: Create a project with end date `2026-12-31` (start `2026-09-01`) → both dates stored. Create with end date `2026-09-01` (same as start) → field error, no row inserted.

- [X] T016 [US2] Write failing integration tests in `tests/integration/projects/create-project.test.ts`: (a) valid end date after start date → `end_date` stored correctly; (b) end date equal to start date → `{ fieldErrors: { endDate: 'End date must be after the start date' } }`, no row inserted; (c) end date before start date → same field error; (d) no end date → `end_date` is null in DB

> **⚠️ Write tests first. They must fail. Then implement T017–T018.**

- [X] T017 [US2] Add end date `<input type="date">` labeled "End Date (optional)" to `components/projects/create-project-form.tsx`; wire its error display the same way as other fields
- [X] T018 [US2] Add end date validation to `createProject` in `app/actions/projects.ts`: when `endDate` is non-empty, parse both date strings and reject if `endDate <= startDate`; return `{ fieldErrors: { endDate: 'End date must be after the start date' } }` — make T016 tests pass

**Checkpoint**: T016 tests pass. End date validation works independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Database readiness, full test suite green, and code quality gate.

- [X] T019 Apply migration to test database: `DATABASE_URL=$DATABASE_URL_TEST npm run db:migrate`
- [X] T020 Run full test suite: `npm test` — all tests in `tests/unit/projects/` and `tests/integration/projects/` must pass with 0 failures
- [X] T021 Run `npm run verify` — `biome check` must exit 0 and the Next.js build must succeed with no TypeScript errors or lint violations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 — BLOCKS Phase 3, 4, 5
- **Phase 3 (US3)**: Requires Phase 2 — provides the page scaffold and action stub that Phase 4 builds on
- **Phase 4 (US1)**: Requires Phase 3 — builds the full form on top of the existing page and action
- **Phase 5 (US2)**: Requires Phase 4 — extends form and action
- **Phase 6 (Polish)**: Requires Phase 5

### Within Each Phase

- Tasks marked **[P]** share no file dependencies and can run in parallel
- Test tasks (T005, T006, T008, T011, T012, T016) MUST run and FAIL before their paired implementation tasks
- T007 depends on T005; T009–T010 depend on T008; T013–T015 depend on T011–T012; T017–T018 depend on T016

### Parallel Opportunities Per Phase

```
Phase 2:  T005 ‖ T006          (different test files, both write-only)
Phase 3:  T009 ‖ T010          (page stub vs. action stub — different files)
Phase 4:  T011 ‖ T012          (different test files, both write-only)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup → `npm run db:generate` passes
2. Complete Phase 2: Foundational → unit tests pass
3. Complete Phase 3: US3 → access control locked
4. Complete Phase 4: US1 → admin can create a project
5. **STOP and VALIDATE**: Run Scenario 1, 2, 3 from `quickstart.md` manually

### Incremental Delivery

1. Phase 1–3 → foundation + security
2. Phase 4 → MVP (admin creates project with required fields)
3. Phase 5 → end date support
4. Phase 6 → quality gate, ship

---

## Notes

- The key generator runs client-side on name blur with **no DB uniqueness check**; the server action is the authoritative uniqueness gate and returns a field error if the key is taken
- `createProject` uses `useActionState` (React 19 API) — not the deprecated `useFormState`
- All component styles must use `stylex.create` with tokens from `@/styles/tokens.stylex`; no raw color literals or inline styles
- `requireAdmin()` is defined in `lib/auth/` (001-user-role-management); do not reimplement it
- Run `npm run verify` after every phase to catch lint/format regressions early
- `marked` was approved 2026-08-18; markdown rendering of the description field is unblocked. Add a task in Phase 6 or Phase 4 to install `marked` and render description HTML server-side in the project detail view when that view is built
