# Research: Add Project Members

**Feature**: `008-add-project-members` | **Phase**: 0 | **Date**: 2026-08-18

## Decision 1: Treat earlier domain features as explicit prerequisites

**Decision**: Reuse the account/session authority from feature 001, Project lifecycle and access rules from features 002/007, Project activity storage from feature 004, and Notification read behavior from feature 006. Feature 008 owns only the add-membership mutation, its UI, and the exact integration records it emits.

**Rationale**: The current repository schema is empty, while the feature specification assumes these concepts already exist. Duplicating foundation tables would create conflicting sources of truth and violate the project's simplicity and terminology rules.

**Alternatives considered**:

- Implement complete account, Project, activity, and Notification subsystems here: rejected because it expands scope and duplicates earlier features.
- Leave integration behavior abstract: rejected because concurrency, foreign keys, and exact-once behavior require precise shared contracts.

## Decision 2: Use one Server Action for the web mutation

**Decision**: Submit a native form to an exported `addProjectMember` Server Action and return typed expected-error states through `useActionState`. The action authenticates and authorizes before invoking the domain transaction. No public Route Handler is added.

**Rationale**: Next.js documents Server Actions as the App Router mutation boundary for forms, requires authentication and authorization inside every Server Function, and recommends modeled return values for expected errors. The repository is a single web application with no external membership client.

**Alternatives considered**:

- Add a REST endpoint plus client fetch: rejected because it duplicates validation and response plumbing for no external consumer.
- Mutate directly inside the component: rejected because the mutation needs a focused, testable server boundary and typed outcomes.

**Sources**:

- [Next.js authentication and authorization guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js forms guide](https://nextjs.org/docs/app/guides/forms)
- [Next.js error handling guide](https://nextjs.org/docs/app/getting-started/error-handling)

## Decision 3: Commit membership, Notification, and activity atomically

**Decision**: Create the active Project Membership first, then the unread Notification and `member_added` Project activity entry inside the same PostgreSQL transaction. Return success only after commit.

**Rationale**: The feature promises immediate membership and exactly one of each side effect. A single transaction prevents partial success and makes the membership row the deduplication source for both emitted records. Drizzle's transaction API commits all writes as one logical unit or rolls them all back.

**Alternatives considered**:

- Create membership and send side effects after commit: rejected because a crash could permanently omit the Notification or activity entry.
- Introduce an outbox and worker: rejected because the Notification is itself a local database record, the app is single-instance and low-volume, and no external delivery needs asynchronous retry.
- Roll back membership when an already-open recipient UI has stale data: rejected because UI cache freshness is not Notification persistence failure.

**Source**: [Drizzle ORM transactions](https://orm.drizzle.team/docs/transactions)

## Decision 4: Preserve history while enforcing one active membership

**Decision**: Store each membership period as a row with nullable removal metadata. Enforce one row per Project/user where `removed_at IS NULL` using a partial unique index. Notification and activity records reference the membership-period ID and each have a unique source identity.

**Rationale**: A plain composite primary key would prevent future remove-and-readd history. Application-only duplicate checks race under concurrent Admin submissions. PostgreSQL partial unique indexes enforce uniqueness only for the active subset, and Drizzle supports indexed predicates.

**Alternatives considered**:

- Composite primary key on Project and user: rejected because it loses distinct re-add periods or forces destructive history updates.
- Check then insert without a database constraint: rejected because concurrent transactions can both pass the check.
- Make duplicate add silently successful: rejected because FR-014 requires an explicit already-member result.

**Sources**:

- [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [Drizzle indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints)

## Decision 5: Define Notification delivery as durable in-app availability

**Decision**: Persist the unread Notification synchronously in the add transaction. It is available to the recipient's next server read immediately. An already-open recipient page is not pushed or polled; existing feature 006 refresh/navigation behavior remains authoritative.

**Rationale**: The specification explicitly excludes email and external channels, and the member-home specification excludes real-time push. Synchronous persistence exceeds the five-second target without creating queue or client-polling infrastructure. A database failure yields no successful membership, so there is no unrecoverable membership-without-Notification state.

**Alternatives considered**:

- Poll every five seconds: rejected because it creates ongoing client and database work for a small team and conflicts with the established manual-refresh boundary.
- WebSocket push: rejected because it expands this feature into real-time infrastructure.
- External email: rejected by feature scope.

## Decision 6: Revalidate only mutation-relevant paths

**Decision**: After a successful commit, refresh the current membership settings view and invalidate the specific Project page plus shared Project-list/home paths used by current consumers. Recipient reads query current Notification and membership data; they do not rely on the Admin's client cache.

**Rationale**: Next.js supports `revalidatePath` from Server Functions and applies revalidation on the affected or next visit. Specific invalidation avoids a broad cache purge while ensuring subsequent navigation reads committed data.

**Alternatives considered**:

- Invalidate the root layout for every membership change: rejected as broader than necessary.
- Trust an optimistic client-only member list: rejected because Admin confirmation must reflect the committed database result.

**Source**: [Next.js `revalidatePath`](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)

## Decision 7: Use current-data authorization and boundary validation

**Decision**: Validate Project and user identifiers without a new schema library, resolve the current session from the database, require an active Admin, and recheck target eligibility and active membership inside the transaction. Any active Admin or Member account, including the acting Admin, is eligible; suspended accounts are not. Expected business failures return stable codes; unexpected database failures are logged without exposing private Project or user data.

**Rationale**: Server Actions are callable mutation boundaries, including through crafted requests. Hidden fields and rendered options are not authority. The feature requires eligibility to be current at submission time and forbids side effects for unauthorized or invalid attempts.

**Alternatives considered**:

- Trust the role stored in a client payload: rejected because it is attacker-controlled and may be stale.
- Authorize only at the page boundary: rejected because direct action invocation would bypass it.
- Add a validation dependency: rejected because two identifiers and one enum-like action do not justify a package.

**Source**: [Next.js `use server` security guidance](https://nextjs.org/docs/app/api-reference/directives/use-server)

## Decision 8: Use native small-team controls

**Decision**: Render the current members separately and use a labeled native `<select>` for the add form. Active non-members are enabled; already assigned and suspended users are visible as disabled options with text reasons; an explicit empty state covers no eligible users. Pending, success, and error messages use accessible status semantics and preserve keyboard focus.

**Rationale**: The product targets fewer than approximately 20 users. A native control is simple, keyboard-accessible, and avoids a custom combobox or dependency while satisfying the requirement to distinguish eligibility states.

**Alternatives considered**:

- Searchable custom combobox: rejected until team size or measured usability requires it.
- Show only eligible users: rejected because FR-017 asks the controls to distinguish already assigned and ineligible users.
- Bulk multi-select: rejected because the specification limits one user per submitted action.

## Decision 9: Test with an isolated PostgreSQL database

**Decision**: Unit-test validation and result mapping, component-test every normative accessible form state, and integration-test real constraints and transaction behavior against an explicit disposable `DATABASE_URL_TEST`. Validation includes the SC-006 rejection matrix, 20 synchronized concurrency pairs, 20 repeated submissions, and 100 timed Notification reads.

**Rationale**: In-memory mocks cannot prove PostgreSQL partial uniqueness, rollback, or concurrent transaction behavior. The inherited development or production database must never be mutated by tests.

**Alternatives considered**:

- Mock all database calls: rejected for concurrency and atomicity acceptance criteria.
- Reuse `DATABASE_URL` implicitly: rejected because it risks modifying developer or shared data.
- Add a container-testing package: rejected because a disposable PostgreSQL container and existing test runner are sufficient.

## Decision 10: Defer local Next.js guide verification to implementation setup

**Decision**: Before production code is written, run `npm ci` and read the relevant installed guides under `node_modules/next/dist/docs/` for forms, Server Actions, authorization, error handling, and revalidation. This planning pass used the current official Next.js documentation because `node_modules` is absent.

**Rationale**: `AGENTS.md` requires the repository-installed Next.js guides to be treated as authoritative for this version. Planning does not install dependencies or write production code, but implementation must verify the exact packaged guidance before starting TDD.

**Alternatives considered**:

- Rely only on model knowledge: rejected by repository instructions and version drift risk.
- Install dependencies solely to write planning documents: rejected because current first-party sources and the lockfile are sufficient for design, while implementation will require `npm ci` anyway.

## Research Completion

All Technical Context unknowns are resolved, and no new dependency approval is required.
