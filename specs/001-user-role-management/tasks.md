---

description: "Dependency-ordered implementation tasks for user role and account management"
---

# Tasks: User Role and Account Management

**Input**: Design documents from `/specs/001-user-role-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `governance.md`, and `.specify/memory/constitution.md`

**Tests**: Required. Constitution Principle V mandates Red-Green-Refactor, and the specification requires unit, PostgreSQL integration, component, accessibility, performance, security, SMTP-degradation, and recovery evidence.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested as an independently valuable increment. Tests precede the production code they govern.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it targets different files and does not depend on incomplete work in the same phase
- **[Story]**: Maps the task to a user story from `spec.md`
- Every task names the exact file or directory it changes

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Resolve constitutional gates and prepare dependencies, configuration, and isolated test infrastructure.

- [ ] T001 Obtain feature-owner decisions for GOV-003, GOV-004, and GOV-005 and record each Approved or Rejected outcome in specs/001-user-role-management/governance.md before adding or importing its package
- [ ] T002 Update package.json and package-lock.json with approved nodemailer runtime support and only the dependencies approved by T001, including sharp, axe-core, and @types/nodemailer when their governance status is Approved
- [ ] T003 [P] Document and validate the complete feature environment contract in .env.example and lib/config/env.ts, including isolated DATABASE_URL_TEST and private AVATAR_STORAGE_PATH safeguards
- [ ] T004 [P] Add test:integration and test:accessibility commands plus feature test include/exclude rules in package.json and vitest.config.mts
- [ ] T005 [P] Create shared Vitest setup, deterministic clock helpers, and test-only environment builders in tests/setup.ts and tests/helpers/environment.ts
- [ ] T006 Create isolated PostgreSQL lifecycle helpers that refuse inherited, development, or production databases in tests/helpers/database.ts

**Checkpoint**: Dependency decisions are explicit, the approved dependency set is installed, and tests cannot mutate a non-isolated database.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared persistence, validation, credential, authorization, abuse-control, email, and routing boundaries required by every story.

**CRITICAL**: No user story implementation begins until this phase passes its tests.

- [ ] T007 [P] Write failing schema constraint and relation tests for all seven entities, canonical email uniqueness, state enums, and ON DELETE RESTRICT behavior in tests/integration/db/schema.test.ts
- [ ] T008 Define users, sessions, password_reset_tokens, forced_reset_authorizations, rate_limit_events, rate_limit_states, and audit_events with indexes and relations in lib/db/schema/users.ts, lib/db/schema/auth.ts, lib/db/schema/rate-limit.ts, lib/db/schema/audit.ts, and lib/db/schema/index.ts
- [ ] T009 Generate and review the PostgreSQL migration for the complete feature schema in drizzle/ and verify it against DATABASE_URL_TEST
- [ ] T010 [P] Write failing FR-046–FR-049 boundary tests for names, phone numbers, Slack handles, email canonicalization, and password policy in tests/unit/validation/profile.test.ts and tests/unit/validation/credentials.test.ts
- [ ] T011 Implement dependency-free profile, email, and password normalizers and validators in lib/validation/profile.ts and lib/validation/credentials.ts
- [ ] T012 [P] Write failing password-hash tests for encoded scrypt parameters, timing-safe verification, dummy unknown-account work, and upgrade detection in tests/unit/auth/password.test.ts
- [ ] T013 Implement asynchronous versioned scrypt hashing and verification with the approved OWASP parameters in lib/auth/password.ts
- [ ] T014 [P] Write failing credential tests for randomness, purpose binding, AES-256-GCM tamper detection, SHA-256 token hashing, exact expiry, and wrong-purpose rejection in tests/unit/crypto/credentials.test.ts
- [ ] T015 Implement invitation/reset encrypted envelopes and opaque session/restricted-token helpers in lib/crypto/credentials.ts
- [ ] T016 [P] Write failing PostgreSQL integration tests for fixed 2-hour/21-day sessions, current-user joins, per-session/all-session revocation, suspension/forced-reset denial, and requireSession/requireAdmin/requireForcedReset outcomes in tests/integration/auth/sessions.test.ts
- [ ] T017 Implement session creation, lookup, current-data authorization context, and revocation queries in lib/db/queries/sessions.ts and lib/auth/session.ts
- [ ] T018 Implement requireSession, requireAdmin, and requireForcedReset authoritative guards with bounded outcomes in lib/auth/guards.ts
- [ ] T019 [P] Write failing rolling-window boundary tests for every FR-059 scope and one-event-per-limited-state behavior in tests/integration/rate-limit/rate-limiter.test.ts
- [ ] T020 [P] Implement allowlisted, secret-free audit persistence and runtime event projection in lib/audit/events.ts
- [ ] T021 Implement advisory-lock-based rolling limits, HMAC pseudonyms, state transitions, and pruning in lib/rate-limit/rate-limiter.ts and lib/db/queries/rate-limits.ts
- [ ] T022 [P] Write failing SMTP adapter tests for acceptance, rejection, timeout, delayed/duplicate delivery, typed configuration, and recipient/token-free diagnostics in tests/unit/email/smtp.test.ts
- [ ] T023 Implement the approved Nodemailer SMTP adapter, invitation/reset message builders, and capability state in lib/email/smtp.ts and lib/email/messages.ts
- [ ] T024 [P] Define reusable token-only StyleX foundations for forms, status messages, focus states, shell layout, and default avatars in styles/tokens.stylex.ts, components/ui/form-field.tsx, components/ui/status-message.tsx, and components/ui/shell.tsx
- [ ] T025 [P] Write failing Proxy coverage tests for public, flow-cookie, protected page, Server Action host, avatar API, health, and static routes in tests/unit/proxy.test.ts
- [ ] T026 Implement cookie-presence routing only, safe relative return paths, and the complete matcher in proxy.ts
- [ ] T027 Configure the Server Action body limit just above 5 MB and required security/runtime settings in next.config.ts
- [ ] T028 Write failing capability tests in tests/integration/http/health.test.ts, then implement bounded database/email health reporting with no secret disclosure in app/api/health/route.ts

**Checkpoint**: Shared boundaries pass in isolation; story work can start from stable schema, security, and test fixtures.

---

## Phase 3: User Story 1 - Invitation-Based User Registration (Priority: P1) MVP Entry Flow

**Goal**: An Admin can send an accepted stateless invitation, and exactly one invitee can register as a Member through a scrubbed, valid link.

**Independent Test**: Use an Admin fixture to send an invitation, consume the clean-URL registration flow, create one Member/session, and prove invalid, expired, registered-email, tampered, wrong-purpose, resend, and concurrent-use cases create no duplicate account.

### Tests for User Story 1

- [ ] T029 [P] [US1] Write failing invitation action tests for Admin authorization, canonical eligibility, dual rate limits, SMTP acceptance/failure, fresh seven-day links, and the FR-063 warning in tests/integration/actions/invitations.test.ts
- [ ] T030 [P] [US1] Write failing invitation intake Route Handler tests for token scrubbing, no-referrer responses, narrow flow cookies, expiry, tampering, wrong purpose, and post-registration rejection in tests/integration/http/invitation-intake.test.ts
- [ ] T031 [P] [US1] Write failing registration tests for password/name validation, Member assignment, fixed two-hour session creation, cookie clearing, and concurrent canonical-email winners in tests/integration/actions/register.test.ts
- [ ] T032 [P] [US1] Write failing component tests for the invitation and registration normal, error, rate-limited, degraded-email, and success states in tests/unit/components/invitation-registration.test.tsx

### Implementation for User Story 1

- [ ] T033 [US1] Implement requireAdmin-protected stateless invitation delivery and acceptance-only success semantics in app/actions/invitations.ts
- [ ] T034 [US1] Implement invitation credential intake, validation-failure limiting, narrow cookie issuance, and clean redirect in app/auth/invitation/route.ts
- [ ] T035 [US1] Implement canonical-email-locked atomic Member registration with winner-only session creation in app/actions/auth.ts and lib/db/queries/registration.ts
- [ ] T036 [P] [US1] Build the Admin invitation form with capability status and mandatory non-revocation copy in components/auth/invitation-form.tsx and app/(shell)/admin/invitations/page.tsx
- [ ] T037 [P] [US1] Build the accessible single-step registration form and invalid-link state in components/auth/registration-form.tsx and app/(auth)/register/page.tsx
- [ ] T038 [US1] Execute and record Quickstart Scenario 2 evidence for SC-001, SC-002, SC-017, SC-018, and SC-020 in specs/001-user-role-management/evidence/us1-invitation-registration.md

**Checkpoint**: Invitation registration works independently with an Admin fixture and cannot create an account without a valid invitation.

---

## Phase 4: User Story 2 - Initial Admin Account Setup (Priority: P2)

**Goal**: Startup creates exactly one Admin only for an empty database with valid configuration and otherwise safely no-ops or fails before readiness.

**Independent Test**: Start against each Quickstart Scenario 1 database/config state, including concurrent startup, and verify the exact create, preserve, or fail outcome before traffic acceptance.

### Tests for User Story 2

- [ ] T039 [P] [US2] Write failing integration tests for empty-valid, empty-invalid, existing-active-Admin, non-empty-without-active-Admin, changed-config, and concurrent bootstrap states in tests/integration/bootstrap/initial-admin.test.ts
- [ ] T040 [P] [US2] Write failing instrumentation registration tests for Node-only execution and readiness-blocking error propagation in tests/unit/instrumentation.test.ts

### Implementation for User Story 2

- [ ] T041 [US2] Implement transaction-locked idempotent initial Admin creation and invariant validation in lib/bootstrap/initial-admin.ts
- [ ] T042 [US2] Invoke and await bootstrap only in the Node.js runtime before readiness in instrumentation.ts
- [ ] T043 [US2] Execute and record Quickstart Scenario 1 evidence for SC-006 and SC-007 in specs/001-user-role-management/evidence/us2-bootstrap.md

**Checkpoint**: A clean deployment can obtain its first Admin, and repeat or unsafe startup states cannot modify identity data silently.

---

## Phase 5: User Story 3 - Profile Viewing for All Users (Priority: P3)

**Goal**: Any active authenticated user can browse all retained accounts and open full profiles while unauthenticated requests disclose nothing.

**Independent Test**: With seeded Admin, active Member, and suspended Member accounts, log in as a Member and verify directory/detail disclosure, absent optional fields, default avatars, no public caching, and unauthenticated denial.

### Tests for User Story 3

- [ ] T044 [P] [US3] Write failing PostgreSQL query tests for complete directory/detail reads, deterministic ordering, suspended-account retention, absent optional fields, and unknown IDs in tests/integration/users/read-model.test.ts
- [ ] T045 [P] [US3] Write failing page/component tests for current-session protection, exact directory/detail fields, default avatar rendering, and private caching in tests/unit/components/user-profiles.test.tsx

### Implementation for User Story 3

- [ ] T046 [US3] Implement constrained authenticated user directory and profile queries in lib/db/queries/users.ts
- [ ] T047 [P] [US3] Build token-styled user card, directory, profile detail, role/status badge, and default avatar components in components/users/user-card.tsx, components/users/user-directory.tsx, components/users/user-profile.tsx, and components/users/default-avatar.tsx
- [ ] T048 [US3] Implement requireSession-protected directory and not-found-safe profile pages in app/(shell)/users/page.tsx and app/(shell)/users/[id]/page.tsx
- [ ] T049 [US3] Record the US3 privacy and rendered-field portion of Quickstart Scenario 4 in specs/001-user-role-management/evidence/us3-profile-viewing.md

**Checkpoint**: Profile viewing is independently usable and team data remains authenticated-only.

---

## Phase 6: User Story 4 - Self-Profile Editing (Priority: P4)

**Goal**: An authenticated user can atomically update their own normalized text profile while role and other accounts remain immutable.

**Independent Test**: A Member edits names, phone, and Slack handle, sees committed normalized values on the next read, and receives linked field errors or authorization rejection without any partial write.

### Tests for User Story 4

- [ ] T050 [P] [US4] Write failing action tests for self-only authorization, normalized optional fields, immutable role, atomic validation failure, audit data, and next-read freshness in tests/integration/actions/update-profile.test.ts
- [ ] T051 [P] [US4] Write failing component tests for read-only role, linked field errors, live announcements, focus placement, Save/Cancel behavior, and no avatar mutation requirement in tests/unit/components/profile-editor.test.tsx

### Implementation for User Story 4

- [ ] T052 [US4] Implement the text-profile keep-avatar transaction, current-state reauthorization, bounded results, audit event, and cache invalidation in app/actions/users.ts
- [ ] T053 [P] [US4] Build the token-styled accessible profile editor for normalized text fields and read-only role in components/users/profile-editor.tsx
- [ ] T054 [US4] Implement the self-authorized edit page and committed-state redirect in app/(shell)/users/[id]/edit/page.tsx
- [ ] T055 [US4] Record the US4 normalization, authorization, atomicity, and next-read portion of Quickstart Scenario 4 in specs/001-user-role-management/evidence/us4-profile-editing.md

**Checkpoint**: Self-profile editing works without Admin management or avatar processing and never trusts client role or identity.

---

## Phase 7: User Story 5 - Admin Member Account Management (Priority: P5)

**Goal**: An Admin can edit, suspend, reinstate, or force-reset Members with immediate committed enforcement, while Members and Admin targets remain protected and deletion remains unsupported.

**Independent Test**: Suspend a Member with active sessions, verify immediate denial, reinstate while preserving independent state, assign a forced reset through its restricted gate, and prove Member/Admin-target/deletion attempts change nothing.

### Tests for User Story 5

- [ ] T056 [P] [US5] Write failing transaction tests for Member edit, suspend, reinstate, force-reset assignment, session revocation, preserved fields, Admin-target rejection, and conflicting state changes in tests/integration/actions/member-management.test.ts
- [ ] T057 [P] [US5] Write failing login/lockout tests for unknown-account timing path, suspended precedence, threshold/exact unlock boundary, source limits, fixed sessions, Remember Me, and logout revocation in tests/integration/actions/login.test.ts
- [ ] T058 [P] [US5] Write failing restricted forced-reset tests for credential login, 15-minute authorization, route isolation, exact expiry, password change, flag clearing, and fresh-login requirement in tests/integration/actions/forced-reset.test.ts
- [ ] T059 [P] [US5] Write failing UI tests for eligible Admin controls, three-activation flows, explicit suspended/locked states, confirmation focus, conflicts, and absent deletion controls in tests/unit/components/member-management.test.tsx
- [ ] T060 [P] [US5] Write failing crafted-request tests proving there is no deletion action or supported HTTP mutation and no related state changes in tests/integration/security/no-account-deletion.test.ts

### Implementation for User Story 5

- [ ] T061 [US5] Implement account-state advisory locking, target row locking, current Member eligibility, active-Admin invariant checks, and Member state queries in lib/db/queries/member-management.ts
- [ ] T062 [US5] Implement Member edit, suspend, reinstate, and forcePasswordReset actions with transactional audit/session effects in app/actions/users.ts
- [ ] T063 [US5] Complete login, lockout, Remember Me, restricted forced-reset issuance, logout, and safe error semantics in app/actions/auth.ts
- [ ] T064 [US5] Implement restricted password completion with session/authorization revocation and fresh-login redirect in app/actions/password.ts
- [ ] T065 [P] [US5] Build accessible login, Member management controls, confirmations, conflicts, and status messages in components/auth/login-form.tsx and components/users/member-management-controls.tsx
- [ ] T066 [P] [US5] Build the restricted password-change form with no shell/profile surface in components/auth/forced-password-form.tsx and app/(auth)/change-password/page.tsx
- [ ] T067 [US5] Integrate current-state Admin edit and management controls into app/(shell)/users/[id]/page.tsx and app/(shell)/users/[id]/edit/page.tsx
- [ ] T068 [US5] Execute and record Quickstart Scenarios 3, 5, and 7 evidence for US5 outcomes in specs/001-user-role-management/evidence/us5-member-management.md

**Checkpoint**: Admin Member lifecycle and forced reset are usable independently; status/security changes apply on the next boundary and no delete path exists.

---

## Phase 8: User Story 6 - Promote Member to Admin (Priority: P6)

**Goal**: A current Admin can atomically promote an active Member, and the promoted role is visible to existing sessions on their next protected request.

**Independent Test**: Promote an active Member with a valid session, immediately use that session for an Admin action, and prove suspended targets, Members, Admin targets, and concurrent losing transitions are rejected.

### Tests for User Story 6

- [ ] T069 [P] [US6] Write failing promotion integration tests for active eligibility, preserved sessions, next-request authority, Member denial, suspended/Admin targets, and suspend-versus-promote races in tests/integration/actions/promotion.test.ts
- [ ] T070 [P] [US6] Write failing promotion control tests for eligibility, accessible confirmation/focus, committed success, conflict refresh guidance, and three-activation completion in tests/unit/components/promotion-control.test.tsx

### Implementation for User Story 6

- [ ] T071 [US6] Implement atomic one-way Member promotion with current-state authorization, invariant preservation, audit, and cache invalidation in app/actions/users.ts and lib/db/queries/member-management.ts
- [ ] T072 [US6] Add the eligible promotion control and committed-state feedback to components/users/member-management-controls.tsx and app/(shell)/users/[id]/page.tsx
- [ ] T073 [US6] Record the US6 promotion, existing-session, authorization, and concurrency portion of Quickstart Scenario 5 in specs/001-user-role-management/evidence/us6-promotion.md

**Checkpoint**: Promotion is independently testable and current database role, not a session snapshot, controls authorization.

---

## Phase 9: User Story 7 - Self-Service Password Reset (Priority: P7)

**Goal**: Any user receives a non-enumerating reset response, and a valid single-use link can update the password without changing suspension or lockout state.

**Independent Test**: Request and complete a reset for active and suspended fixtures, then prove unknown-user equivalence, exact expiry, supersession, one-time use, clean URLs, rate limits, session revocation, and retained suspension/lockout.

### Tests for User Story 7

- [ ] T074 [P] [US7] Write failing reset-request tests for canonical lookup, generic unknown/suspended responses, dual rolling limits, supersession, SMTP acceptance/failure, and secret-free events in tests/integration/actions/request-password-reset.test.ts
- [ ] T075 [P] [US7] Write failing reset intake/completion tests for clean URLs, narrow cookies, purpose/tamper/nonce checks, exact 60-minute expiry, single use, password policy, revocation, and preserved state in tests/integration/actions/complete-password-reset.test.ts
- [ ] T076 [P] [US7] Write failing component tests for request/completion modes, generic confirmation, invalid-link recovery, linked errors, focus, live announcements, and fresh-login success in tests/unit/components/password-reset.test.tsx

### Implementation for User Story 7

- [ ] T077 [US7] Implement reset issuance, prior-token supersession, generic responses, SMTP failure handling, and completion transaction in app/actions/password.ts and lib/db/queries/password-resets.ts
- [ ] T078 [US7] Implement reset credential intake, token-validation limiting, flow cookie, no-referrer header, and clean redirect in app/auth/password-reset/route.ts
- [ ] T079 [P] [US7] Build accessible reset request/completion forms and safe invalid-link states in components/auth/password-reset-form.tsx and app/(auth)/reset-password/page.tsx
- [ ] T080 [US7] Execute and record Quickstart Scenario 6 evidence for SC-010, SC-017, SC-018, and SC-020 in specs/001-user-role-management/evidence/us7-password-reset.md

**Checkpoint**: Self-service reset works independently, remains non-enumerating, and never grants access to a suspended account.

---

## Phase 10: User Story 8 - Profile Picture Management (Priority: P8)

**Goal**: Authorized users can atomically keep, replace, or remove private avatars while invalid or interrupted changes preserve the complete prior profile.

**Independent Test**: Upload, replace, retrieve, and remove validated fixtures; inject decode/write/commit/cleanup failures; verify private delivery, output constraints, durable volume persistence, reconciliation, backup, and restore behavior.

### Tests for User Story 8

- [ ] T081 [P] [US8] Write failing processor tests for decoded JPEG/PNG validation, MIME mismatch, corruption, animation/active content, 5 MB and 4096-pixel boundaries, metadata removal, aspect ratio, 512-pixel and 1 MB output limits in tests/unit/avatar/processor.test.ts
- [ ] T082 [P] [US8] Write failing filesystem tests for immutable candidate writes, fsync, path confinement, cleanup, and referenced-file-safe reconciliation in tests/integration/avatar/storage.test.ts
- [ ] T083 [P] [US8] Write failing profile/avatar transaction tests for keep/replace/remove, absent remove no-op, self/Admin authorization, candidate/write/commit faults, post-commit cleanup faults, and next-read consistency in tests/integration/actions/profile-avatar.test.ts
- [ ] T084 [P] [US8] Write failing avatar Route Handler tests for authentication, current DB reference lookup, fixed detected content type, nosniff, private/no-store caching, missing-file fallback, and path non-disclosure in tests/integration/http/avatar.test.ts
- [ ] T085 [P] [US8] Write failing avatar control tests for preview, upload guidance, replace/remove intent, specific errors, focus/live regions, and default state in tests/unit/components/avatar-editor.test.tsx
- [ ] T086 [P] [US8] Write failing coordinated snapshot, retention, checksum, isolated restore, mismatch reporting, and default-fallback tests in tests/operations/avatar-backup-restore.test.ts

### Implementation for User Story 8

- [ ] T087 [US8] Implement approved sharp-based decode, validation, orientation normalization, metadata-stripping re-encode, resize, and output bounds in lib/avatar/processor.ts
- [ ] T088 [US8] Implement private immutable candidate storage, fsync, cleanup, lookup confinement, and orphan reconciliation in lib/avatar/storage.ts and lib/avatar/reconcile.ts
- [ ] T089 [US8] Extend updateProfile to commit text fields and avatar reference atomically with pre-commit candidate cleanup and post-commit old-file handling in app/actions/users.ts
- [ ] T090 [US8] Implement authenticated private avatar streaming and default-fallback behavior in app/api/users/[id]/avatar/route.ts
- [ ] T091 [US8] Integrate accessible avatar keep/replace/remove controls into components/users/avatar-editor.tsx and components/users/profile-editor.tsx
- [ ] T092 [US8] Add the durable avatar volume, AVATAR_STORAGE_PATH, internal-only PostgreSQL networking, and application mount ownership to docker-compose.yml and Dockerfile
- [ ] T093 [US8] Implement encrypted coordinated database/avatar snapshot, 30-day retention, isolated restore, and reference verification in ops/backup.sh, ops/restore.sh, and ops/verify-restore.sh
- [ ] T094 [US8] Execute and record Quickstart Scenarios 8 and 12, distinguishing script tests from live volume/restore evidence, in specs/001-user-role-management/evidence/us8-avatar-recovery.md

**Checkpoint**: Avatar management is independently testable and deployment/rollback cannot erase referenced private files.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Prove whole-feature accessibility, performance, degradation, secret hygiene, maintainability, and operational readiness without overstating static evidence.

- [ ] T095 [P] Write axe-core accessibility suites for every in-scope normal, error, limited, degraded, invalid-token, and restricted state in tests/accessibility/account-management.test.tsx
- [ ] T096 Complete the manual WCAG 2.2 AA keyboard, focus, screen-reader, 200% zoom, and error-identification matrix and record environment-specific evidence in specs/001-user-role-management/evidence/accessibility.md
- [ ] T097 [P] Implement and run the production-equivalent 100-navigation profile timing harness with 20 users and 10 concurrent authenticated users in tests/performance/profile-navigation.mjs and record SC-004 evidence in specs/001-user-role-management/evidence/performance.md
- [ ] T098 [P] Run SMTP rejection, timeout, recovery, delayed, and duplicate-delivery exercises across email and non-email journeys and record SC-020 evidence in specs/001-user-role-management/evidence/smtp-degradation.md
- [ ] T099 [P] Add credential/log/referrer/database inspection coverage for all raw-token, profile, recipient, source-address, and image leakage prohibitions in tests/integration/security/secret-hygiene.test.ts
- [ ] T100 Write failing pruning tests in tests/integration/maintenance/prune.test.ts, then implement idempotent pruning for expired/revoked credentials, rate-limit records, and stale unreferenced avatar candidates in lib/maintenance/prune.ts
- [ ] T101 [P] Update deployment prerequisites, migrations, secrets, avatar volume, backups, rollback, quarterly restore, and live-evidence boundaries in DEPLOYMENT.md
- [ ] T102 Execute npm run test:integration, npm run test:accessibility, npm test -- --run, and npm run verify and record exact command results in specs/001-user-role-management/evidence/automated-verification.md
- [ ] T103 Execute the complete specs/001-user-role-management/quickstart.md matrix and update specs/001-user-role-management/checklists/requirements.md with only evidence actually obtained
- [ ] T104 Review all changed application source for forbidden comments, raw StyleX values, any usage, dead code, public avatar paths, stale authorization snapshots, and unsupported delete paths, then record the review in specs/001-user-role-management/evidence/constitution-review.md

**Checkpoint**: Automated checks and each required live/manual/operational category have separate, truthful evidence records.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately; T001 blocks installing or importing each pending package, and T006 depends on T003 and T005
- **Foundational (Phase 2)**: Depends on Setup; schema tests precede schema/migration, and every shared production module follows its failing tests
- **User Stories (Phases 3-10)**: Depend on Foundational; tests within each story precede production code
- **Polish (Phase 11)**: Depends on all stories selected for release; operational exercises require the relevant deployed feature and safe isolated environments

### User Story Dependency Graph

```text
Setup -> Foundational
Foundational -> US1
Foundational -> US2
Foundational -> US3 -> US4 -> US5 -> US6
Foundational -> US7
US3 -> US8
US4 -> US8
US1 + US2 + US3 + US4 + US5 + US6 + US7 + US8 -> Polish
```

### User Story Dependencies

- **US1 (P1)**: Can be implemented after Foundational with an Admin test fixture; production deployment also requires US2 so an Admin can exist
- **US2 (P2)**: Can be implemented and tested after Foundational without another story
- **US3 (P3)**: Can be implemented after Foundational with seeded users
- **US4 (P4)**: Reuses US3 profile reads/pages but its text-only save remains independently testable
- **US5 (P5)**: Reuses US3 profile controls and US4's editor; account-state actions are independently testable against fixtures
- **US6 (P6)**: Reuses US5 account-state locking and management controls, then adds the independent one-way promotion transition
- **US7 (P7)**: Can be implemented after Foundational without other user stories
- **US8 (P8)**: Extends the US3 display and US4 atomic profile-save surface with private file storage

### Within Each User Story

- Write the listed failing tests first and confirm they fail for the intended missing behavior
- Implement persistence/transaction behavior before action/route integration
- Implement actions and routes before page/component integration
- Confirm the independent test and record its evidence before treating the story as complete
- Refactor only after the tests pass, preserving the no-comment and token-only StyleX rules

### Parallel Opportunities

- T003, T004, and T005 can proceed in parallel after the approval state is known
- Foundational test tasks T007, T010, T012, T014, T016, T019, T022, and T025 target independent modules
- Once Foundational completes, US1, US2, US3, and US7 can begin in parallel with their own fixtures
- Within every story, tasks marked [P] target separate test or UI files and can run concurrently until they converge on shared actions/pages
- Cross-cutting accessibility, performance, SMTP, secret-hygiene, and deployment documentation tasks T095-T101 can run in parallel after their required stories exist

---

## Parallel Examples

### User Story 1

```text
Task T029: Invitation action tests in tests/integration/actions/invitations.test.ts
Task T030: Invitation intake tests in tests/integration/http/invitation-intake.test.ts
Task T031: Registration transaction tests in tests/integration/actions/register.test.ts
Task T032: Invitation and registration component tests in tests/unit/components/invitation-registration.test.tsx
```

### User Story 2

```text
Task T039: Bootstrap database-state tests in tests/integration/bootstrap/initial-admin.test.ts
Task T040: Instrumentation lifecycle tests in tests/unit/instrumentation.test.ts
```

### User Story 3

```text
Task T044: User read-model tests in tests/integration/users/read-model.test.ts
Task T045: Directory and profile component tests in tests/unit/components/user-profiles.test.tsx
```

### User Story 4

```text
Task T050: Profile action tests in tests/integration/actions/update-profile.test.ts
Task T051: Profile editor component tests in tests/unit/components/profile-editor.test.tsx
```

### User Story 5

```text
Task T056: Member management transaction tests in tests/integration/actions/member-management.test.ts
Task T057: Login and lockout tests in tests/integration/actions/login.test.ts
Task T058: Forced-reset tests in tests/integration/actions/forced-reset.test.ts
Task T060: No-deletion security tests in tests/integration/security/no-account-deletion.test.ts
```

### User Story 6

```text
Task T069: Promotion integration tests in tests/integration/actions/promotion.test.ts
Task T070: Promotion control tests in tests/unit/components/promotion-control.test.tsx
```

### User Story 7

```text
Task T074: Reset request tests in tests/integration/actions/request-password-reset.test.ts
Task T075: Reset intake/completion tests in tests/integration/actions/complete-password-reset.test.ts
Task T076: Reset component tests in tests/unit/components/password-reset.test.tsx
```

### User Story 8

```text
Task T081: Avatar processor tests in tests/unit/avatar/processor.test.ts
Task T082: Avatar filesystem tests in tests/integration/avatar/storage.test.ts
Task T083: Atomic profile/avatar tests in tests/integration/actions/profile-avatar.test.ts
Task T084: Private avatar delivery tests in tests/integration/http/avatar.test.ts
Task T086: Backup/restore tests in tests/operations/avatar-backup-restore.test.ts
```

---

## Implementation Strategy

### MVP First

The deployable MVP is **Setup + Foundational + US2 + US1**. US1 is the highest-priority user value, but US2 supplies the first Admin needed to use invitations in a real empty deployment.

1. Complete Setup and secure the required dependency approvals
2. Complete Foundational and pass all shared boundary tests
3. Complete US2 so an empty deployment creates exactly one usable Admin
4. Complete US1 so that Admin can invite and register Members
5. Stop and validate Quickstart Scenarios 1 and 2 before expanding scope

### Incremental Delivery

1. Deliver bootstrap plus invitation registration as the account-entry MVP
2. Add US3 directory/profile viewing
3. Add US4 self-profile editing
4. Add US5 Member lifecycle and forced reset
5. Add US6 promotion
6. Add US7 self-service reset
7. Add US8 private avatars and coordinated recovery
8. Complete cross-cutting accessibility, performance, outage, security, and operational evidence

### Parallel Team Strategy

After Foundational is complete, separate implementers can start US1, US2, US3, and US7. US4 follows US3; US5 follows US4; US6 follows US5; US8 begins after the US3 display and US4 save surfaces stabilize. Shared-file tasks in `app/actions/users.ts`, `app/actions/auth.ts`, and profile pages must be serialized or integrated deliberately.

---

## Notes

- Tasks that add or import `sharp`, `axe-core`, or `@types/nodemailer` remain blocked until the matching governance decision is Approved
- Use `DATABASE_URL_TEST` explicitly for destructive integration setup; never inherit `DATABASE_URL`
- `proxy.ts` is routing defense only; every protected component, action, and handler uses current PostgreSQL authorization
- No invitation table, public avatar path, account-deletion action, raw credential storage, or role/status session snapshot may be introduced
- Live SMTP, HTTPS cookies, Docker volume durability, performance, manual accessibility, backup creation, and isolated restore evidence must be reported separately from static or fixture checks
- Commit after each task or coherent Red-Green-Refactor group while preserving unrelated worktree changes
