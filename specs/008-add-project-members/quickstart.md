# Quickstart Validation: Add Project Members

**Feature**: `008-add-project-members` | **Phase**: 1 | **Date**: 2026-08-18

This guide is runnable after the Foundation Dependency Gate in [plan.md](plan.md) is satisfied and feature 008 is implemented. It validates behavior; it does not substitute for TDD during implementation.

## Prerequisites

- Node.js 20 compatible with the lockfile.
- Docker with an unused local port for a disposable PostgreSQL 18 database.
- Feature 001 authentication/account tables and guards implemented.
- Feature 002/007 Project tables, routes, status rules, and private access implemented.
- Shared Notification and Project activity foundations implemented or extended by feature 008.

Install exact dependencies:

```sh
npm ci
```

Before writing or changing production code, read the installed Next.js 16.3 guidance under `node_modules/next/dist/docs/` for forms, Server Actions, authentication/authorization, expected errors, and revalidation, as required by `AGENTS.md`.

## Isolated PostgreSQL

Start a disposable database that does not reuse the inherited `DATABASE_URL`:

```sh
docker run --name one-space-members-test \
  -e POSTGRES_USER=one_space_test \
  -e POSTGRES_PASSWORD=one_space_test \
  -e POSTGRES_DB=one_space_members_test \
  -p 55433:5432 \
  -d postgres:18-alpine

export DATABASE_URL_TEST='postgres://one_space_test:one_space_test@127.0.0.1:55433/one_space_members_test'
DATABASE_URL="$DATABASE_URL_TEST" npm run db:migrate
```

Database-backed tests MUST fail fast when `DATABASE_URL_TEST` is absent, MUST refuse a database name that is not explicitly recognized as disposable/test-only, and MUST refuse to run when it equals `DATABASE_URL`.

## Automated validation

Run focused tests first:

```sh
DATABASE_URL_TEST="$DATABASE_URL_TEST" npx vitest run tests/unit/projects/project-member-identifiers.test.ts
DATABASE_URL_TEST="$DATABASE_URL_TEST" npx vitest run tests/component/projects/add-project-member-form.test.tsx
DATABASE_URL_TEST="$DATABASE_URL_TEST" npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects/add-project-member-action.test.ts
DATABASE_URL_TEST="$DATABASE_URL_TEST" npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects/add-project-member-concurrency.test.ts
```

Then run the full project gates:

```sh
DATABASE_URL_TEST="$DATABASE_URL_TEST" npx vitest run --maxWorkers=1 --no-file-parallelism
env -u DATABASE_URL_TEST DATABASE_URL="$DATABASE_URL_TEST" npm run verify
```

## Required fixtures

Create isolated test fixtures through test factories, not production seed data:

- one active Admin actor with a valid session;
- one active Member not assigned to the Project;
- one second active Admin not assigned to the Project;
- one suspended Member;
- one active Project;
- one archived Project;
- one already assigned user;
- one historical membership whose `removed_at` is set.

## Scenario 1 — Primary add flow (US1, FR-001–FR-007, FR-012, SC-001–SC-003)

1. Sign in as the active Admin and open `/projects/{key}/settings/members`.
2. Require current, eligible, already assigned, and suspended users to be distinguishable.
3. Add the active Member and require one committed active membership before success appears.
4. Require the member list to include the user immediately.
5. In the recipient session, refresh the Project list and open the Project without signing in again or accepting anything.
6. Require one `member_added` Project activity entry identifying actor, subject, Project, and membership period.
7. Add the acting Admin to a Project they manage but do not belong to, then add the second active Admin; require the same membership, Notification, and activity semantics as an active Member.
8. Run 20 first-attempt usability sessions across at least 5 representative participants. Start timing when membership controls are usable, stop at committed success, include all action/network wait, require at least 19 sessions without guidance or recoverable user error, and require at least 19 sessions under 30 seconds.

## Scenario 2 — Notification and archived access (US2, FR-007–FR-011, SC-003–SC-005)

1. Add an active user to the archived Project.
2. For 100 successful add operations, start the recipient's first authenticated Notification read within five seconds of Admin success; require at least 99 reads to include exactly one unread membership Notification.
3. Require one unread `project_member_added` record naming the correct Admin and Project.
4. Follow the derived destination and require the archived Project to open read-only.
5. Repeat with an active Project and require normal member access.
6. Keep a recipient page open during the add; require no push update, then refresh and require the Notification and Project to appear. Membership access must not depend on that refresh.
7. Change the Project status while an add is in progress; require membership success and access based on the status current at each recipient read.

## Scenario 3 — Duplicate and concurrency safety (US3, FR-013–FR-014, SC-006–SC-007)

1. Submit an add for a user who already has an active membership; require `already_member` and unchanged row counts.
2. Run at least 20 pairs of valid Admin submissions synchronized at the transaction barrier.
3. Release each pair and require exactly one success and one `already_member` outcome.
4. For every pair, count active membership, membership-added Notification, and member-added activity rows; require exactly one of each. Repeat a successful submission 20 times and require the same cardinality.
5. Create a historical membership fixture with removal metadata, re-add that user, and require a new membership-period ID with exactly one new Notification and activity entry.

## Scenario 4 — Authorization, validation, and rollback (FR-001–FR-003, FR-015–FR-016, SC-006)

For each required rejection-matrix attempt, snapshot all three relevant tables before and after.

1. Submit without a session; require `unauthenticated` and no Project/user disclosure.
2. Submit as a Member; require `forbidden` and no side effect.
3. Submit malformed Project and user identifiers; require field-specific `invalid_input` results.
4. Submit valid nonexistent identifiers as an Admin; require the appropriate not-found outcome.
5. Inject failure after membership insert and after Notification insert; require the transaction to roll back every insert.
6. Reuse an expired/revoked session; require authorization failure before mutation.
7. Require every rejection to disclose no private Project, roster, candidate, account-status, or Notification detail.
8. For each injected unexpected failure, require exactly one operator-visible diagnostic event containing failure category and time but no session token, email, submitted form body, or private Project content.

## Scenario 5 — Eligibility changes (US3, FR-002–FR-003, FR-015, SC-006)

1. Select an active Member, suspend them through feature 001 before submission, and submit the stale form.
2. Require `user_ineligible`, no membership, no Notification, and no activity entry.
3. Present a suspended user initially and require a disabled option with the text reason "Suspended."
4. Restore eligibility, refresh the page, and require the user to become selectable.
5. Assign all active accounts and require the no-eligible-users empty state while already assigned and suspended reasons remain distinguishable.

## Scenario 6 — Notification consumer isolation (FR-008–FR-011, SC-004–SC-005)

1. Create membership Notifications for two recipients.
2. As each recipient, require only their own Notification records.
3. As an unrelated Member, request the other recipient's record directly and require denial without private Project disclosure.
4. Rename the Project after Notification creation and require the displayed name and destination to resolve from current Project data.
5. Require `read_at` to be null at creation; then exercise the shared read/unread contract without changing membership.

## Scenario 7 — Accessibility and responsive use (FR-018–FR-019, SC-008)

Exercise initial, pending, success, validation-error, duplicate, ineligible, unexpected-error, archived, and no-eligible-user states.

- Complete the flow using keyboard only and require logical focus order and visible focus.
- Require one persistent label and associated help/error text for the select.
- Require pending, success, and error status announcements without color-only meaning.
- Inspect at 200% zoom and narrow mobile width; require no loss of form controls, member identity, eligibility reason, or status message.
- Record browser, viewport, keyboard/screen-reader setup, tester, date, and findings.

## Database inspection

After successful, rejected, duplicate, and concurrent scenarios, inspect:

- the partial unique index predicate on active Project Memberships;
- membership removal metadata consistency;
- unique Notification and activity source constraints;
- foreign keys to actor, subject, Project, and membership period;
- absence of client-authored destination URLs or event text;
- transaction rollback after injected failures.

## Cleanup

After evidence is captured, remove only the named disposable container:

```sh
docker rm -f one-space-members-test
```

## Completion Evidence

Implementation-ready evidence consists of passing focused and full automated tests, generated migration review, `npm run verify`, recorded concurrency counts, accessibility review, and usability/latency measurements. Documentation and schema inspection alone do not prove runtime behavior.
