---

description: "Dependency-ordered implementation tasks for adding Project members"
---

# Tasks: Add Project Members

**Input**: Design documents from `/specs/008-add-project-members/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and `.specify/memory/constitution.md`

**Tests**: Required. Constitution Principle V mandates Red-Green-Refactor, and the specification requires unit, component, isolated-PostgreSQL integration, concurrency, accessibility, privacy, diagnostic, usability, and latency evidence.

**Organization**: Tasks are grouped by user story so each story remains an independently testable increment. Every production task follows its governing failing test task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and has no dependency on unfinished work at that point
- **[Story]**: Maps the task to a user story from `spec.md`
- Every task names the exact file or directory it changes

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify version-specific framework guidance and prove that feature-owned prerequisites exist before implementation begins.

- [ ] T001 Run `npm ci`, read the installed Next.js 16.3 guides for forms, Server Actions, authentication/authorization, expected errors, and revalidation under `node_modules/next/dist/docs/`, and record the applicable constraints in specs/008-add-project-members/evidence/nextjs-guidance.md
- [ ] T002 Audit the Foundation Dependency Gate against lib/db/schema/users.ts, lib/db/schema/auth.ts, lib/auth/guards.ts, lib/db/schema/projects.ts, lib/db/queries/projects.ts, lib/db/schema/notifications.ts, lib/db/queries/notifications.ts, lib/db/schema/project-activity-entries.ts, and app/(shell)/projects/[projectKey]/page.tsx; record exact compatibility or blocking gaps in specs/008-add-project-members/evidence/foundation-gate.md and stop before Phase 2 if any owning feature is unavailable

**Checkpoint**: Installed framework rules are recorded, and features 001, 002/007, 004, and 006 provide compatible shared foundations rather than placeholders or missing modules.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the tested persistence, validation, relations, migrations, and isolated fixtures shared by every user story.

**CRITICAL**: Phase 2 begins only after T002 passes. No user story work begins until this phase passes its tests.

- [ ] T003 [P] Write failing PostgreSQL tests for Project Membership history, one-active-membership partial uniqueness, removal metadata pairing, Notification/activity source uniqueness, foreign keys, indexes, and restrictive deletion in tests/integration/projects/project-membership-schema.test.ts
- [ ] T004 [P] Write failing unit tests for required canonical Project and user UUID validation without accepting actor, role, names, Notification text, or destination input in tests/unit/projects/project-member-identifiers.test.ts
- [ ] T005 Extend the shared schemas with historical Project Memberships and the `project_member_added` Notification and `member_added` activity references and constraints in lib/db/schema/project-memberships.ts, lib/db/schema/notifications.ts, and lib/db/schema/project-activity-entries.ts
- [ ] T006 Export the feature schemas and define User, Project, membership, Notification, and activity relations in lib/db/schema/index.ts and lib/db/schema/relations.ts
- [ ] T007 Generate and review the PostgreSQL migration, including the `removed_at IS NULL` partial unique index and unique side-effect source identities, in drizzle/migrations/
- [ ] T008 Implement dependency-free canonical UUID parsing and add-member input validation in lib/validation/identifiers.ts
- [ ] T009 Extend isolated database cleanup and add deterministic Admin, Member, suspended-user, active/archived-Project, current-membership, and historical-membership factories in tests/helpers/database.ts and tests/helpers/project-members.ts

**Checkpoint**: Real PostgreSQL tests prove the shared model, and later tests can create isolated membership scenarios without touching inherited data.

---

## Phase 3: User Story 1 - Admin Adds a Member to a Project (Priority: P1) MVP

**Goal**: An active system-wide Admin can add any active Admin or Member to an active or archived Project, with committed access and one atomic membership/Notification/activity success unit.

**Independent Test**: Add an active account to an active Project as an Admin, then prove exactly one committed membership appears in the roster and grants Project access on the recipient's first authenticated read; repeat for archived, self-add, another-Admin, and removed-then-readded fixtures.

### Tests for User Story 1

> Write these tests first and confirm they fail for the intended missing behavior.

- [ ] T010 [P] [US1] Write failing transaction tests for active Member, active Admin, acting-Admin self-add, active/archived Project, atomic three-record commit, rollback after each injected write failure, and removed-then-readded membership periods in tests/integration/projects/add-project-member-action.test.ts
- [ ] T011 [P] [US1] Write failing access/read-model tests for immediate roster and Project-list discovery, active-Project member permissions, archived-Project read-only permissions, current-status changes during add, and non-member privacy in tests/integration/projects/project-membership-access.test.ts
- [ ] T012 [P] [US1] Write failing Server Action tests for current-session Admin authorization, direct invocation, malformed/missing identifiers, server-resolved success data, post-commit revalidation, and no revalidation on failure in tests/integration/projects/add-project-member-server-action.test.ts
- [ ] T013 [P] [US1] Write failing page/component tests for the Admin-only route, non-member Admin access, Project context, basic eligible-user selection, pending submission, committed success, roster refresh, and Project Members navigation in tests/component/projects/add-project-member-form.test.tsx

### Implementation for User Story 1

- [ ] T014 [US1] Implement minimal-data current-member and eligible-active-account reads with deterministic ordering and Admin-only access in lib/db/queries/project-members.ts
- [ ] T015 [US1] Implement the framework-independent add-member transaction with current actor/target/Project revalidation and atomic membership, unread Notification, and Project activity creation in lib/projects/add-project-member.ts
- [ ] T016 [US1] Implement typed `addProjectMember` Server Action outcomes, current-data authorization, safe server-resolved messages, and post-commit path revalidation in app/actions/project-members.ts
- [ ] T017 [P] [US1] Build the token-only StyleX current-member list with names and system roles in components/projects/members/project-member-list.tsx
- [ ] T018 [P] [US1] Build the labeled one-user add form with pending and committed-success behavior in components/projects/members/add-project-member-form.tsx
- [ ] T019 [US1] Implement the active/archived Admin membership-management page and compose its form and roster in app/(shell)/projects/[projectKey]/settings/members/page.tsx
- [ ] T020 [US1] Wire active Project Membership into recipient Project-list discovery and current-status Project authorization in lib/db/queries/projects.ts and app/(shell)/projects/[projectKey]/page.tsx
- [ ] T021 [US1] Expose the Admin-only Members destination from Project settings without treating navigation visibility as authorization in components/projects/project-settings-navigation.tsx
- [ ] T022 [US1] Execute Quickstart Scenarios 1 and 2 for primary, self-add, other-Admin, active/archived, status-race, rollback, and re-add behavior and record only obtained evidence in specs/008-add-project-members/evidence/us1-project-membership.md

**Checkpoint**: The Admin add flow works independently, membership access is current-status aware, and no success can exist without its Notification and activity rows.

---

## Phase 4: User Story 2 - Added Member Receives a Notification (Priority: P1)

**Goal**: The added user sees exactly one unread in-app Notification on the next authenticated read and can follow its current-key destination to the Project with current-status access.

**Independent Test**: Add a user, perform the recipient's next authenticated Notification read, and prove one unread Notification identifies the actor and Project, remains recipient-private, follows Project renames, and opens active or archived Projects correctly.

### Tests for User Story 2

> Write these tests first and confirm they fail for the intended missing behavior.

- [ ] T023 [P] [US2] Write failing Notification projection/component tests for actor and Project labels, unread state, active/archived destinations, Project rename resolution, and no client-authored destination in tests/component/projects/project-membership-notification.test.tsx
- [ ] T024 [P] [US2] Write failing isolated-PostgreSQL tests for next-request Notification visibility, recipient isolation, unread ordering, one record per membership period, and current-key destination lookup in tests/integration/projects/project-membership-notification.test.ts

### Implementation for User Story 2

- [ ] T025 [US2] Implement the `project_member_added` display projection from referenced actor, Project, recipient, and membership rows in lib/notifications/project-membership-notification.ts
- [ ] T026 [US2] Extend the shared recipient Notification query with the new kind, unread/current-name projection, stable ordering, ownership filtering, and current Project key in lib/db/queries/notifications.ts
- [ ] T027 [US2] Register the membership Notification projection and direct Project link in the feature-006 Notifications & Mentions consumer in components/home/notifications-and-mentions.tsx
- [ ] T028 [US2] Verify an already-open recipient page requires refresh/navigation rather than push while the next server read is fresh, and record active, archived, renamed, isolation, and read/unread results in specs/008-add-project-members/evidence/us2-membership-notification.md

**Checkpoint**: Durable Notification creation is distinguishable from UI refresh, and every recipient read and destination preserves privacy and current Project state.

---

## Phase 5: User Story 3 - Admin Sees Safe, Actionable Add-Member Results (Priority: P2)

**Goal**: Admins can distinguish eligible, already assigned, suspended, empty, duplicate, conflict, and unexpected-failure states while concurrency and retries preserve exact cardinality and private data.

**Independent Test**: Exercise the complete rejection matrix, 20 synchronized duplicate pairs, 20 post-success repeats, a stale eligibility change, an injected transaction failure, and every required form state; prove no unintended side effects or private disclosure.

### Tests for User Story 3

> Write these tests first and confirm they fail for the intended missing behavior.

- [ ] T029 [P] [US3] Write failing rejection-matrix tests for no session, expired/revoked session, Member actor, malformed IDs, unknown Project/user, suspended target, existing membership, stale eligibility, and injected transaction failure in tests/integration/projects/add-project-member-rejections.test.ts
- [ ] T030 [P] [US3] Write failing PostgreSQL tests for 20 synchronized add pairs, 20 post-success repeats, winner/loser outcomes, exact three-record cardinality, and one new side-effect set after removal/re-add in tests/integration/projects/add-project-member-concurrency.test.ts
- [ ] T031 [P] [US3] Write failing diagnostic tests requiring exactly one operator-visible allowlisted failure event without tokens, email, form bodies, or private Project content in tests/integration/projects/add-project-member-diagnostics.test.ts
- [ ] T032 [P] [US3] Write failing candidate-query tests for eligible active accounts, disabled already-member and suspended accounts, acting-Admin eligibility, deterministic reasons, minimal fields, and no-eligible-user results in tests/integration/projects/project-member-candidates.test.ts
- [ ] T033 [P] [US3] Write failing component tests for initial, pending, success, validation, duplicate, suspended, conflict, unexpected, archived, and no-eligible states with keyboard use, labels, focus, live announcements, non-color reasons, 200% zoom, and narrow widths in tests/component/projects/add-project-member-form-states.test.tsx

### Implementation for User Story 3

- [ ] T034 [US3] Extend membership queries with `eligible`, `already_member`, and `suspended` candidate states, minimal Admin-only fields, and the explanatory empty state in lib/db/queries/project-members.ts
- [ ] T035 [P] [US3] Map unique-index races, stale target/actor state, duplicates, and retryable conflicts to stable outcomes without creating a second membership period in lib/projects/add-project-member.ts
- [ ] T036 [US3] Add complete expected-error mapping and exactly-one privacy-safe unexpected-failure audit event to app/actions/project-members.ts and lib/audit/events.ts
- [ ] T037 [P] [US3] Implement disabled text reasons, linked field errors, conflict/retry guidance, live pending/success/error status, focus preservation, 200% zoom, and narrow-width token styles in components/projects/members/add-project-member-form.tsx
- [ ] T038 [US3] Render unavailable candidate reasons, archived context, and the no-eligible-user state without roster or account-status disclosure outside the protected page in app/(shell)/projects/[projectKey]/settings/members/page.tsx
- [ ] T039 [US3] Execute Quickstart Scenarios 3 through 5 and record rejection, rollback, stale eligibility, duplicate, concurrency, retry, privacy, diagnostic, and empty-state evidence in specs/008-add-project-members/evidence/us3-safe-results.md

**Checkpoint**: Every expected and unexpected outcome is actionable, concurrency-safe, privacy-preserving, and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Prove whole-feature accessibility, measurable freshness, usability, privacy, maintainability, and truthful completion evidence.

- [ ] T040 [P] Add automated accessibility coverage for every SC-008 state, including axe checks and structural keyboard/focus/status assertions, in tests/accessibility/add-project-members.test.tsx
- [ ] T041 [P] Add crafted-request and output-inspection coverage for Project, roster, candidate, account-status, Notification, log, form-body, and session-token disclosure prohibitions in tests/integration/security/project-membership-privacy.test.ts
- [ ] T042 [P] Implement the isolated 100-operation Notification-read and first-Project-read timing harness for SC-003 and SC-004 in tests/performance/add-project-member.mjs
- [ ] T043 [P] Complete the manual keyboard, focus, status-announcement, 200%-zoom, and narrow-width matrix and record browser, viewport, assistive technology, tester, date, and findings in specs/008-add-project-members/evidence/accessibility.md
- [ ] T044 [P] Conduct 20 first-attempt sessions across at least 5 representative Admin participants and record guidance, recoverable errors, usable-controls start, committed-success end, and total time in specs/008-add-project-members/evidence/usability-and-latency.md
- [ ] T045 Run all focused unit, component, integration, concurrency, accessibility, performance, full-suite, and `npm run verify` commands and record exact pass/fail output boundaries in specs/008-add-project-members/evidence/automated-verification.md
- [ ] T046 Execute the complete specs/008-add-project-members/quickstart.md matrix without changing reviewer-owned checklist markers and record exact obtained, failed, and unavailable results in specs/008-add-project-members/evidence/quickstart-validation.md
- [ ] T047 Review all changed application source for forbidden comments, `any`, dead code, raw StyleX values, stale authorization snapshots, duplicate shared entities, unsupported push/polling/external delivery, and unapproved dependencies, then record the review in specs/008-add-project-members/evidence/constitution-review.md

**Checkpoint**: Automated, manual, performance, usability, and review evidence remain distinct; documentation does not overstate runtime or production proof.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; T002 is a hard gate and must not be marked complete while any owning feature foundation is missing or incompatible
- **Foundational (Phase 2)**: Depends on a passing T002; T003 precedes T005-T007, T004 precedes T008, and T009 follows the shared schema
- **User Story 1 (Phase 3)**: Depends on Foundational; all four failing-test tasks precede production work
- **User Story 2 (Phase 4)**: Depends on US1's atomic producer; T023-T024 precede the Notification projection and consumer work
- **User Story 3 (Phase 5)**: Depends on US1's base flow but can proceed in parallel with US2; T029-T033 precede all US3 production changes
- **Polish (Phase 6)**: Depends on every story selected for release; manual and timing evidence requires an implemented, runnable environment

### User Story Dependency Graph

```text
Setup -> Foundation Gate -> Foundational -> US1
US1 -> US2
US1 -> US3
US2 + US3 -> Polish
```

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and produces the atomic membership/Notification/activity transaction required by all later stories
- **US2 (P1)**: Reuses US1's committed Notification record and adds recipient projection, isolation, and current-key navigation
- **US3 (P2)**: Reuses US1's mutation and form, then adds complete eligibility, error, retry, concurrency, diagnostic, privacy, and accessibility behavior; it can be implemented in parallel with US2 after US1

### Within Each User Story

- Write every listed test first and confirm it fails for the intended missing behavior
- Implement schemas before queries, queries before domain transactions, transactions before Server Actions, and Server Actions before page integration
- Keep current database state authoritative at both page and mutation boundaries
- Refactor only after tests pass, preserving strict typing, no comments, token-only StyleX, and no new dependency
- Complete the independent test and evidence task before treating a story as done

### Parallel Opportunities

- T003 and T004 target independent schema and validation test files
- US1 test tasks T010-T013 can be written in parallel after Foundational
- T017 and T018 can proceed in parallel after the query/action contracts stabilize
- US2 tests T023-T024 can proceed in parallel, and US2 can run alongside US3 after US1
- US3 test tasks T029-T033 target separate behavioral boundaries and can be written in parallel
- T035 and T037 target separate domain and UI files after their tests fail
- Cross-cutting tasks T040-T044 target separate test/evidence files and can proceed in parallel after implementation

---

## Parallel Examples

### User Story 1

```text
Task T010: Transaction and atomic-side-effect tests in tests/integration/projects/add-project-member-action.test.ts
Task T011: Project access and read-model tests in tests/integration/projects/project-membership-access.test.ts
Task T012: Server Action boundary tests in tests/integration/projects/add-project-member-server-action.test.ts
Task T013: Admin page and basic form tests in tests/component/projects/add-project-member-form.test.tsx
```

### User Story 2

```text
Task T023: Notification projection/component tests in tests/component/projects/project-membership-notification.test.tsx
Task T024: Notification persistence, freshness, and isolation tests in tests/integration/projects/project-membership-notification.test.ts
```

### User Story 3

```text
Task T029: Complete rejection-matrix tests in tests/integration/projects/add-project-member-rejections.test.ts
Task T030: Synchronized concurrency and repeat tests in tests/integration/projects/add-project-member-concurrency.test.ts
Task T031: Privacy-safe diagnostic tests in tests/integration/projects/add-project-member-diagnostics.test.ts
Task T032: Candidate-state query tests in tests/integration/projects/project-member-candidates.test.ts
Task T033: Complete accessible form-state tests in tests/component/projects/add-project-member-form-states.test.tsx
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and stop if the Foundation Dependency Gate is not satisfied
2. Complete Phase 2 using Red-Green-Refactor
3. Complete Phase 3 for User Story 1
4. Stop and validate immediate Project Membership independently
5. Treat Phases 3 and 4 together as the minimum deployable P1 scope because the product promise includes both immediate membership and recipient Notification

### Incremental Delivery

1. Setup + passing foundation gate + Foundational establish safe shared infrastructure
2. US1 delivers immediate atomic membership and Project access
3. US2 exposes the committed Notification through the shared recipient consumer
4. US3 completes safe eligibility, failure, retry, concurrency, privacy, and accessibility behavior
5. Polish records whole-feature evidence without converting documentation checks into runtime claims

### Parallel Team Strategy

1. Complete Setup and Foundational together
2. Implement US1 as the shared atomic producer
3. After US1, implement US2 and US3 in parallel against separate recipient and Admin surfaces
4. Run cross-cutting verification only after both P1 stories and the selected P2 scope are integrated

---

## Notes

- `[P]` tasks target different files and have no dependency on unfinished work at that point
- `[US1]`, `[US2]`, and `[US3]` map directly to the three specification stories
- Foundation-owned Project, Notification, and activity concepts must be extended, never duplicated
- Tests must fail before their corresponding production work begins
- Manual usability, accessibility, and performance evidence cannot be inferred from automated or static checks
- Commit after each task or cohesive Red-Green-Refactor group
