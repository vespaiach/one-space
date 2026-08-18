# Implementation Plan: User Role and Account Management

**Branch**: `001-user-role-management` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-user-role-management/spec.md`

## Summary

Implement invitation-only account creation, two current-data-authorized roles, fixed opaque sessions, self-service and Admin-forced password changes, authenticated team profiles, suspension/reinstatement, and one-way Member promotion. PostgreSQL is the authority for identity, session revocation, single-use reset credentials, restricted forced-reset authorizations, abuse-control windows, and secret-free audit events. Invitation credentials remain stateless, purpose-bound AES-256-GCM tokens, but registration is serialized by canonical-email uniqueness. Avatar changes are part of the profile save: candidate images are decoded, re-encoded, durably staged outside the web root, and referenced by an atomic database commit before the previous file is removed. Docker Compose adds a durable avatar volume and coordinated database/avatar backup and restore procedures.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode; Node.js 20; React 19.2; Next.js 16.3 App Router

**Primary Dependencies**:

- Existing: Next.js, React, `drizzle-orm`, `postgres`, StyleX, Vitest, Testing Library
- Approved addition: `nodemailer` for SMTP delivery ([GOV-001](governance.md#gov-001--nodemailer-approval))
- Approval required before implementation: direct `sharp` dependency for decoded image validation/re-encoding, `axe-core` for automated accessibility checks, and `@types/nodemailer` for strict typing of the approved SMTP library ([GOV-003](governance.md#gov-003--sharp-approval-request), [GOV-004](governance.md#gov-004--axe-core-approval-request), [GOV-005](governance.md#gov-005--nodemailer-typescript-declarations-approval-request))

**Storage**: PostgreSQL tables for users, sessions, password-reset tokens, forced-reset authorizations, rate-limit events/state, and audit events; stateless invitation tokens; private avatar files on a durable Docker volume outside the application release and web root

**Testing**: Vitest unit/component tests; real isolated PostgreSQL integration tests; automated accessibility scans plus manual WCAG 2.2 AA checks; production-equivalent browser timing for SC-004; backup/restore and email-outage exercises

**Target Platform**: Single Linux server running the repository Docker Compose stack: Traefik, one Next.js application container, PostgreSQL, and a durable avatar volume

**Project Type**: Full-stack Next.js web application using Server Components, Server Actions, Route Handlers, and root `proxy.ts`; no separate API service

**Performance Goals**: SC-001 invitation registration under 3 minutes after recorded delivery; SC-003 account management within 3 control activations; SC-004 at least 95 of 100 complete profile renders within 2 seconds with 20 users and 10 concurrent authenticated users; SC-012 unlock acceptance within 1 second; SC-013 forced-reset completion and fresh login within 2 minutes

**Constraints**: Exactly two roles; no account deletion; no invitation table or individual invitation revocation; fixed 2-hour/21-day sessions; current account state checked on every protected boundary; email failure must not block non-email journeys; token URLs must be scrubbed after intake; authenticated private avatar delivery; single application instance; no Redis or object storage; no new dependency without governance approval

**Scale/Scope**: One organization, approximately 20 users, low request volume, one PostgreSQL database and one application instance

**Clarifications**: None. The specification resolves behavioral and operational choices through FR-001–FR-063. The remaining blockers are explicit dependency approvals, not design unknowns.

## Constitution Check

*GATE: Evaluated before Phase 0 and re-evaluated after Phase 1.*

| Principle / Gate | Pre-design | Design response |
|------------------|------------|-----------------|
| I. Component-Driven Architecture | PASS | Authentication, authorization, normalization, email, abuse control, avatar storage, persistence, and UI concerns remain focused and co-located until reused |
| II. Input Validation & Security | PASS | Every Server Action and Route Handler re-authenticates, authorizes current DB state, normalizes inputs, applies rate limits, and returns constrained results |
| III. Simplicity Over Cleverness | PASS | PostgreSQL replaces extra cache/queue infrastructure; opaque credentials and explicit transactions are used instead of JWT/session snapshots |
| IV. Dependency Minimization | **BLOCKED** | Nodemailer is approved. `sharp`, `axe-core`, and Nodemailer's declaration package remain pending under GOV-003–GOV-005 |
| V. Test-Driven Development | PASS | Tasks must begin with failing unit, integration, accessibility, and recovery tests mapped to FR/SC identifiers |
| VI. Zero Inline Comments | PASS | Production source uses intention-revealing modules and names; explanatory material stays in feature documents |
| VII. Strict Cleanliness | PASS | `npm run verify` and all tests remain required; no deletion endpoint, public avatar path, stale role snapshot, or unused compatibility path is retained |
| Technology Stack | PASS | Next.js App Router, strict TypeScript, PostgreSQL, React Compiler, Biome, and token-only StyleX remain mandatory |
| StyleX token compliance | PASS | All new components use `@stylexjs/stylex` and values from `@/styles/tokens.stylex`; no raw component CSS values |

### Dependency Gate

| Package | Purpose | Built-in alternative | Status |
|---------|---------|----------------------|--------|
| `nodemailer` | Submit invitation and reset messages through existing SMTP | Node.js has no SMTP client | Approved by GOV-001 |
| `sharp` | Decode image bytes, reject animation/invalid content, remove metadata, resize, and re-encode | Node.js has no image decoder or encoder; Next.js's transitive dependency is not an application dependency contract | **Pending GOV-003** |
| `axe-core` | Produce automated WCAG findings with impact severity for SC-016 | Testing Library and jsdom do not provide a WCAG rule engine | **Pending GOV-004** |
| `@types/nodemailer` | Strict compile-time declarations for approved Nodemailer API | Nodemailer does not bundle declarations; handwritten ambient types would duplicate/drift from its API | **Pending GOV-005** |

**Pre-design gate result**: The design workflow may document the required solution, but implementation MUST NOT add or import pending dependencies until GOV-003–GOV-005 are approved.

## Phase 0: Research Outcome

[research.md](research.md) resolves the implementation choices for:

- Next.js 16 Proxy, Server Action, Route Handler, cookie, and startup-instrumentation boundaries
- opaque sessions, link-token intake, current-data authorization, and restricted forced-reset authorization
- canonical identity/profile normalization and concurrency-safe PostgreSQL transactions
- rolling abuse limits, pseudonymous keys, and secret-free operator events
- SMTP failure semantics and degraded health
- private durable avatar processing, commit ordering, backup, restore, and reconciliation
- automated and manual accessibility validation

No `NEEDS CLARIFICATION` markers remain.

## Phase 1: Design Outcome

- [data-model.md](data-model.md) defines seven PostgreSQL entities, file storage, relationships, validation, transactions, retention, and state transitions.
- [contracts/pages.md](contracts/pages.md) defines public, restricted, protected, and Admin page behavior plus accessibility requirements.
- [contracts/server-actions.md](contracts/server-actions.md) defines every mutation boundary, including atomic profile/avatar saves and restricted forced resets.
- [contracts/http-routes.md](contracts/http-routes.md) defines token-intake redirects, authenticated avatar delivery, and health behavior.
- [contracts/proxy.md](contracts/proxy.md) defines cookie-presence routing only; authoritative access remains in server-side guards.
- [quickstart.md](quickstart.md) defines runnable validation scenarios for all user stories and SC-001–SC-020.

### Requirement-to-Design Traceability

| Requirement area | Normative IDs | Primary design artifacts |
|------------------|---------------|--------------------------|
| Roles and bootstrap | FR-001, FR-002, FR-017, FR-042, FR-043, FR-044 | data model transaction rules; research startup bootstrap; quickstart Scenario 1 |
| Invitation and registration | FR-003, FR-004, FR-004a, FR-004b, FR-005, FR-006, FR-007, FR-051, FR-052, FR-053, FR-055, FR-057, FR-058, FR-059, FR-063 | invitation action, intake HTTP route, register page/action, quickstart Scenario 2 |
| Authentication, sessions, and password recovery | FR-015, FR-018, FR-019–FR-029, FR-037–FR-040, FR-045, FR-049, FR-052–FR-054, FR-057–FR-059 | session/reset/forced-reset entities and actions; Proxy guards; quickstart Scenarios 3, 6, 7, 11 |
| Profile disclosure and editing | FR-009–FR-012, FR-017, FR-030–FR-034, FR-045–FR-050, FR-056, FR-060 | page/profile action contracts, normalizers, current-state authorization, quickstart Scenario 4 |
| Member lifecycle and promotion | FR-013–FR-018, FR-036, FR-040, FR-041, FR-045, FR-050 | account-state transactions/actions; no-deletion contract; quickstart Scenario 5 |
| Avatar security and recovery | FR-030, FR-033–FR-035, FR-045, FR-056, FR-060–FR-062 | private file model, atomic profile action, avatar HTTP route, quickstart Scenarios 8 and 12 |
| Accessibility, privacy, abuse, and operations | FR-052, FR-053, FR-056–FR-063 | audit/rate-limit entities, shared page contract, health/backup/restore design, quickstart Scenarios 9–12 |
| Retired identifiers | FR-008, FR-041 | no invitation table and no account-deletion path; identifiers remain reserved without implementation tasks |

## Project Structure

### Documentation

```text
specs/001-user-role-management/
├── spec.md
├── governance.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── pages.md
    ├── server-actions.md
    ├── http-routes.md
    └── proxy.md
```

### Source Code

```text
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── reset-password/page.tsx
│   └── change-password/page.tsx
├── (shell)/
│   ├── users/page.tsx
│   ├── users/[id]/page.tsx
│   ├── users/[id]/edit/page.tsx
│   └── admin/invitations/page.tsx
├── actions/
│   ├── auth.ts
│   ├── invitations.ts
│   ├── password.ts
│   └── users.ts
├── auth/
│   ├── invitation/route.ts
│   └── password-reset/route.ts
└── api/
    ├── health/route.ts
    └── users/[id]/avatar/route.ts

components/
├── auth/
└── users/

lib/
├── audit/
├── auth/
├── avatar/
├── bootstrap/
├── crypto/
├── db/
│   ├── schema/
│   └── queries/
├── email/
├── rate-limit/
└── validation/

ops/
├── backup.sh
├── restore.sh
└── verify-restore.sh

instrumentation.ts
proxy.ts
styles/tokens.stylex.ts
tests/
├── unit/
├── integration/
├── accessibility/
├── performance/
└── operations/
```

**Structure Decision**: Server Actions handle form mutations and use Next.js's origin checks; `serverActions.bodySizeLimit` is set just above the 5 MB avatar limit so one profile action can atomically validate profile fields and avatar intent. Route Handlers are limited to one-time token intake, authenticated avatar reads, and health. `proxy.ts` performs fast cookie-presence routing only. `instrumentation.ts` executes the idempotent Admin bootstrap before the server becomes ready. Avatar bytes never enter `public/`; profile pages receive an authenticated Route Handler URL.

## Operational Design

- Compose mounts a named avatar volume at `AVATAR_STORAGE_PATH` and does not publish PostgreSQL to the public network in production.
- Startup validates secrets/configuration and runs the idempotent Admin bootstrap; migrations remain an explicit pre-deploy step.
- Daily encrypted backup captures `pg_dump` plus the avatar volume under one manifest/snapshot identifier and retains 30 days.
- Restore loads both artifacts, verifies DB/file references, reports missing files, and allows the application to render the default avatar for mismatches.
- A production-like restore exercise is recorded at least quarterly; static scripts alone do not satisfy this gate.

## Post-Design Constitution Re-check

The design uses the required framework, database, TypeScript, Biome, React Compiler, StyleX, and TDD boundaries. It introduces no cache, queue, hosted email SDK, object store, auth framework, or schema-validation package. Nodemailer remains approved and scoped to SMTP.

**Post-design gate result: BLOCKED pending GOV-003–GOV-005.** The plan and Phase 0/1 artifacts are synchronized, but implementation cannot begin under Constitution Principle IV until the feature owner explicitly approves direct `sharp`, test-only `axe-core`, and development-only `@types/nodemailer` dependencies (or amends the requirements/design to remove the capabilities that require them).

## Complexity Tracking

| Required complexity | Why it exists | Containment |
|---------------------|---------------|-------------|
| Seven PostgreSQL tables | Revocable credentials, exact rolling limits, concurrency, and operator-visible events cannot be represented safely in the user row alone | Tables are narrowly scoped; no generic repository or event framework |
| Filesystem + DB commit protocol | FR-061 requires profile and avatar failure atomicity without object storage | Immutable candidate files, DB row lock/transaction, post-commit old-file cleanup, and reconciliation |
| Advisory transaction locks | FR-050 and FR-055 require deterministic concurrent account/email outcomes | Locks are limited to canonical email or target account mutation keys |
| Three pending dependencies | Secure image reconstruction, severity-based accessibility scanning, and strict Nodemailer declarations are not built into Node.js/jsdom/Nodemailer | Direct, pinned dependencies behind focused runtime/test/type boundaries; no provider SDK |
