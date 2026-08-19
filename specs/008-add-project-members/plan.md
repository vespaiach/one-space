# Implementation Plan: Add Project Members

**Branch**: `008-add-project-members` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-add-project-members/spec.md`

## Summary

Add an Admin-only Project membership page and Server Action that revalidates the current account, Project, selected user, and current membership state at submission time. One PostgreSQL transaction creates the active Project Membership, unread in-app Notification, and Project activity entry before success is returned. A partial unique index permits membership history while guaranteeing at most one active membership for a user and Project, including under concurrent submissions. Server-rendered Project and notification reads use the committed rows immediately; the feature adds no public API, queue, polling service, or third-party dependency.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode; Node.js 20; React 19.2.8; Next.js 16.3.1 App Router

**Primary Dependencies**: Existing Next.js, React, `drizzle-orm` 0.45.2, `postgres` 3.4.9, StyleX 0.19, Vitest 4.1, and Testing Library; no new dependency

**Storage**: PostgreSQL 18 tables for Project Memberships plus shared Notification and Project activity records; existing `users`, `sessions`, and `projects` tables are prerequisites

**Testing**: Vitest unit and component tests; real isolated PostgreSQL integration tests for authorization, transaction atomicity, partial uniqueness, and concurrency; the explicit SC-006 rejection matrix; 20 synchronized concurrency pairs plus 20 repeat submissions for SC-007; keyboard, status-announcement, zoom, and narrow-width review for SC-008; privacy-safe diagnostic injection for SC-009; 20 usability sessions across at least 5 representative participants for SC-001 and SC-002

**Target Platform**: Single Linux server running the repository Docker Compose stack with one Next.js application container and PostgreSQL

**Project Type**: Full-stack Next.js web application using Server Components and Server Actions; no separate backend service or membership Route Handler

**Performance Goals**: All three records commit before Admin success; the first recipient Project read after success grants current-status access in every successful case; at least 99 of 100 recipient Notification reads started within 5 seconds include the unread record; at least 19 of 20 measured Admin flows finish within 30 seconds from usable controls through committed success

**Constraints**: Fewer than approximately 20 active or suspended Admin/Member accounts; any active account may be assigned, including the acting Admin; one user per submitted add; active and archived Projects supported with access evaluated from current Project status; current database authorization at every mutation; exactly-once side effects per membership period; no email, external notification, bulk add, required search, or real-time push; no new package without approval

**Scale/Scope**: One workspace and team, fewer than approximately 20 users, low mutation volume, one PostgreSQL database, one application instance, one membership-management page and mutation

**Clarifications**: The 2026-08-18 clarification session requires one atomic membership/Notification/activity success unit and permits any active Admin or Member account to be assigned. All remaining review decisions are resolved in the specification and Phase 1 artifacts.

## Constitution Check

*GATE: Evaluated before Phase 0 research and re-evaluated after Phase 1 design.*

| Principle / Gate | Result | Design response |
|------------------|--------|-----------------|
| I. Component-Driven Architecture | PASS | Page composition, form state, membership transaction, queries, and persistence schemas have focused boundaries; feature-only UI stays co-located |
| II. Input Validation & Security | PASS | The Server Action validates all identifiers and rechecks the current database-backed session, Admin role, selected user status, Project existence, and membership state |
| III. Simplicity Over Cleverness | PASS | One Server Action and one database transaction replace an API layer, queue, outbox worker, or client polling system |
| IV. Dependency Minimization | PASS | Native forms, existing packages, PostgreSQL constraints, and built-in framework capabilities are sufficient; no package is added |
| V. Test-Driven Development | PASS | Tasks must begin with failing unit, component, and isolated-PostgreSQL integration tests mapped to FR and SC identifiers |
| VI. Zero Inline Comments | PASS | Production source uses explicit names and focused modules; rationale remains in these design artifacts |
| VII. Strict Cleanliness | PASS | `npm run verify`, the full test suite, unused-code checks, and generated-migration review remain merge gates |
| Technology Stack | PASS | The plan retains Next.js App Router, strict TypeScript, PostgreSQL, React Compiler, Biome, and StyleX |
| StyleX token compliance | PASS | All component styling consumes values from `styles/tokens.stylex.ts`; no raw component colors or dimensions are introduced |
| Specification terminology | PASS | Admin, Member, Project, and Notification use existing glossary/spec meanings; Project Membership names the access association rather than a new system role |

**Pre-design gate result**: PASS. No constitutional exception or dependency approval is required.

## Foundation Dependency Gate

The repository currently contains only placeholder application and schema files. This feature depends on artifacts owned by earlier features:

- `001-user-role-management`: `users`, `sessions`, current-data session verification, and Admin/Member account states.
- `002-project-management` and `007-create-project`: `projects`, Project key/status lookup, private Project authorization, and active-versus-archived access.
- `004-activity-feed`: shared Project activity storage and `member_added` presentation.
- `006-member-home-page`: shared Notification read model and read/unread presentation.

Implementation MUST sequence these foundations first or implement their approved shared schemas through their owning tasks. Feature 008 MUST extend shared tables instead of creating duplicate user, Project, Notification, or activity concepts. This is a delivery dependency, not a constitutional violation or unresolved design clarification.

## Phase 0: Research Outcome

[research.md](research.md) records the following resolved decisions:

- Server Action and Server Component boundaries for the Admin-only form.
- database-backed authorization and boundary validation on every submission.
- an atomic three-record transaction for Project Membership, Notification, and activity.
- a historical membership table with one partial unique index for the active row.
- synchronous in-app Notification persistence with next-request visibility and no queue/polling layer.
- native accessible controls suited to a team of fewer than 20 users.
- current-path refresh behavior and isolated PostgreSQL test strategy.

No unresolved research markers remain.

## Phase 1: Design Outcome

- [data-model.md](data-model.md) defines upstream dependencies, three feature-integrated entities, constraints, transaction ordering, read models, and membership state transitions.
- [contracts/server-actions.md](contracts/server-actions.md) defines the mutation input, typed outcomes, authorization order, atomic side effects, and expected-error handling.
- [contracts/pages.md](contracts/pages.md) defines the membership-management page, Notification destination, visibility, states, and accessibility contract.
- [contracts/events.md](contracts/events.md) defines the persisted Notification and Project activity event payloads and deduplication identities.
- [quickstart.md](quickstart.md) defines isolated-database setup and end-to-end validation for primary, alternate, exception, recovery, concurrency, accessibility, and performance scenarios.

### Requirement-to-Design Traceability

| Requirement area | Normative IDs | Primary design artifacts |
|------------------|---------------|--------------------------|
| Admin authorization, eligibility, privacy, and diagnostics | FR-001–FR-003, FR-015–FR-017, FR-020–FR-021, SC-006, SC-009 | Server Action contract; pages contract; data model validation; quickstart Scenarios 1, 4, 5 |
| Immediate Project Membership and access | FR-004–FR-007 | Membership transaction/state model; Server Action contract; quickstart Scenarios 1 and 2 |
| In-app Notification | FR-008–FR-011 | Notification model; events contract; pages contract; quickstart Scenarios 2 and 6 |
| Project activity history | FR-012 | Activity model; events contract; quickstart Scenarios 1 and 3 |
| Duplicate and concurrency safety | FR-013–FR-016 | Partial unique index; transaction contract; quickstart Scenarios 3 and 4 |
| Accessibility, usability, and measurable outcomes | FR-018–FR-019, SC-001–SC-005, SC-007–SC-008 | Pages contract; quickstart Scenarios 1–8 |

## Project Structure

### Documentation (this feature)

```text
specs/008-add-project-members/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── pages.md
    ├── server-actions.md
    └── events.md
```

### Source Code (repository root)

```text
app/
├── (shell)/
│   └── projects/
│       └── [projectKey]/
│           ├── page.tsx
│           └── settings/
│               └── members/
│                   └── page.tsx
└── actions/
    └── project-members.ts

components/
└── projects/
    └── members/
        ├── add-project-member-form.tsx
        └── project-member-list.tsx

lib/
├── auth/
│   └── authorization.ts
├── db/
│   ├── queries/
│   │   ├── notifications.ts
│   │   └── project-members.ts
│   └── schema/
│       ├── notifications.ts
│       ├── project-activity-entries.ts
│       └── project-memberships.ts
├── notifications/
│   └── project-membership-notification.ts
├── projects/
│   └── add-project-member.ts
└── validation/
    └── identifiers.ts

tests/
├── unit/
│   └── projects/
│       └── add-project-member.test.ts
├── component/
│   └── projects/
│       └── add-project-member-form.test.tsx
└── integration/
    └── projects/
        ├── add-project-member-action.test.ts
        └── add-project-member-concurrency.test.ts
```

**Structure Decision**: Keep the mutation entry point in `app/actions`, the transaction in a framework-independent Project domain module, data reads under `lib/db/queries`, and feature-only form/list components co-located under `components/projects/members`. Shared Notification and activity schemas are extended rather than forked. Route Handlers are unnecessary because the only mutation consumer is the authenticated web application.

## Post-Design Constitution Re-check

The Phase 1 design retains the required stack and creates no constitutional exception. PostgreSQL constraints and a single transaction provide the concurrency guarantee; current database state authorizes the mutation; expected errors are typed return values; UI state uses focused StyleX components; and TDD plus `npm run verify` remain explicit gates.

**Post-design gate result**: PASS. The plan is design-complete. Implementation readiness remains conditional on the Foundation Dependency Gate above.

## Complexity Tracking

No constitutional violations require justification. The partial unique index and three-write transaction are the minimum mechanisms needed to preserve membership history and exact-once side effects under concurrent submissions.
