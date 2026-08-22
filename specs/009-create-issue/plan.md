# Implementation Plan: Create Issue

**Branch**: `009-create-issue` | **Date**: 2026-08-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-create-issue/spec.md`

## Summary

Add a "New issue" page under each project (`/projects/{projectKey}/issues/new`) and a `createIssue` Server Action so any current member of a project (Admin or Member role) can create an issue with a title, optional markdown description, status, priority, zero or more labels (picked or created inline), and at most one assignee. Status and priority are modeled as fixed five-value enums rather than a customizable per-project column set, since board/column customization (formerly `003-issue-kanban-board`) is discontinued and no longer a dependency. One PostgreSQL transaction resolves or creates the requested labels and inserts the issue; membership, assignee-still-a-member, and label-name-collision checks all run against current database state at submission time. Markdown rendering reuses `marked` — already governance-approved for this exact purpose (see [governance.md](governance.md)) — restricted by a custom renderer to FR-004's five elements, so no new dependency approval or notification/activity-feed/live-push infrastructure is introduced beyond that single already-approved package.

## Technical Context

**Language/Version**: TypeScript 5.x in strict mode; Node.js 20; React 19.2.8; Next.js 16.3.1 App Router

**Primary Dependencies**: Existing Next.js, React, `drizzle-orm` 0.45.2, `postgres` 3.4.9, StyleX 0.19, Vitest 4.1, and Testing Library; plus `marked` (`^15.0.0`), reusing the governance approval already granted 2026-08-18 for markdown-to-HTML rendering (see [governance.md](governance.md)) — no new approval required, no `DOMPurify` added

**Storage**: PostgreSQL 18 — new `issues`, `labels`, and `issue_labels` tables; extends existing `projects`, `project_memberships`, and `users` tables

**Testing**: Vitest unit tests (field validation, label-color cycling, markdown renderer); Vitest component tests (form rendering and interaction with a mocked action); real isolated PostgreSQL integration tests (membership authorization, label create-or-reuse under concurrency, assignee-removed-at-submission handling, status/priority defaulting, transaction atomicity); keyboard/focus/announcement accessibility review; manual UX timing checks for SC-001, SC-002, and SC-006

**Target Platform**: Single Linux server running the existing Docker Compose stack (one Next.js container, one PostgreSQL container)

**Project Type**: Full-stack Next.js web application using Server Components and Server Actions; no separate API service or Route Handler

**Performance Goals**: The created issue is visible to any project member on their next read immediately after commit (SC-007); a minimal (title-only) submission completes in under ten seconds of form interaction (SC-002); a fully-specified submission completes in under one minute (SC-001)

**Constraints**: Status and priority are fixed five-value enums, not a per-project customizable column set; labels are scoped per project with case-insensitive uniqueness; no live/push board view is part of this feature; the only third-party dependency added (`marked`) reuses an existing approval; no notification or activity-feed side effect (not required by the spec)

**Scale/Scope**: One workspace, low tens of projects/users, one issue-creation page plus one Server Action; extends three existing shared tables and adds three new ones

**Clarifications**: The 2026-08-20 clarification session (recorded in spec.md) fixed the status set at five values (Backlog, Todo, In Progress, Done, Canceled), fixed label cardinality at zero-or-more per issue, confirmed No Priority as the default, and removed all dependency on `003-issue-kanban-board`, which is being discontinued and removed.

## Constitution Check

*GATE: Evaluated before Phase 0 research and re-evaluated after Phase 1 design.*

| Principle / Gate | Result | Design response |
|------------------|--------|-----------------|
| I. Component-Driven Architecture | PASS | Page, Server Action, domain transaction, queries, and schema each have one focused responsibility; the composer's status/priority/label/assignee pickers stay co-located inside the single feature form, matching the precedent in `create-project-form.tsx` rather than being split into premature sub-components |
| II. Input Validation & Security | PASS | The Server Action re-validates the current session, project membership, title/description bounds, enum membership, label-name shape, and assignee-still-a-member state against current database rows before any write |
| III. Simplicity Over Cleverness | PASS | Status/priority are fixed enums instead of a customizable columns table, since column customization is out of scope; markdown rendering is a small escape-then-transform function instead of a parser dependency |
| IV. Dependency Minimization | PASS | The only package added, `marked`, reuses a governance approval already granted 2026-08-18 for markdown-to-HTML rendering (see governance.md) rather than requesting a new one; no `DOMPurify` or other pair dependency is added; label-color cycling uses the already-defined `label` StyleX token scale |
| V. Test-Driven Development | PASS | Tasks begin with failing unit, component, and isolated-PostgreSQL integration tests mapped to FR and SC identifiers |
| VI. Zero Inline Comments | PASS | Production source uses explicit names and focused modules; rationale stays in these design artifacts |
| VII. Strict Cleanliness | PASS | `npm run verify`, the full test suite, and unused-code checks remain merge gates |
| Technology Stack | PASS | Next.js App Router, strict TypeScript, PostgreSQL, React Compiler, Biome, and StyleX are retained; no Pages Router, no alternate database |
| StyleX token compliance | PASS | All new component styling consumes `colors`, `status`, `priority`, `label`, `space`, `radius`, `type`, and `structure` tokens already defined in `styles/tokens.stylex.ts`; no raw component colors are introduced |
| Specification terminology | PASS | Admin, Member, Project, Issue, Label, Priority, and status names (Backlog/Todo/In Progress/Done/Canceled) match `.specify/GLOSSARY.md` |

**Pre-design gate result**: PASS. No constitutional exception or dependency approval is required.

## Foundation Dependency Gate

This feature depends on artifacts owned by earlier features, all already present in the repository:

- `001-user-role-management`: `users`, `sessions`, current-session verification, Admin/Member roles.
- `002-project-management` / `007-create-project`: `projects` table and project identity (key, name, color).
- `008-add-project-members`: `project_memberships` table and the current-membership read pattern already used by `getProjectAccessByKey`.

Feature 009 extends these shared tables and reuses the existing membership-check pattern rather than duplicating it. `003-issue-kanban-board` is discontinued and is not a dependency of this feature; its previously-referenced customizable board/column concept is replaced here by a fixed status enum.

## Phase 0: Research Outcome

[research.md](research.md) records the following resolved decisions:

- Status and priority modeled as fixed five-value PostgreSQL enums rather than a customizable per-project columns table.
- Labels as a project-scoped table plus an `issue_labels` join table, with case-insensitive uniqueness enforced by a database index and resolved via insert-or-reuse.
- Label color assigned by cycling through the six label color tokens already defined in `styles/tokens.stylex.ts`.
- Assignee validated as a current project member at submission time rather than trusted from form state.
- Basic markdown rendered by the already-approved `marked` dependency, restricted by a custom renderer to exactly bold, italics, links, lists, and headings — reuses an existing governance approval rather than requesting a new one.
- "Visible to all project members within one second" (SC-007) satisfied by synchronous commit plus current-state reads; no live/push layer is introduced in this feature.
- A minimal "New issue" entry point added to the existing project page, which currently has no way to reach issue creation.
- A human-readable Issue Key (e.g., `WEB-1`) is explicitly out of scope for this feature; the technical primary key is a UUID.

No unresolved research markers remain.

## Phase 1: Design Outcome

- [data-model.md](data-model.md) defines the new `issues`, `labels`, and `issue_labels` schemas, their constraints and indexes, the create-issue transaction, and read models for the assignee and label pickers.
- [contracts/server-actions.md](contracts/server-actions.md) defines the `createIssue` action's input, typed outcomes, authorization order, and atomic side effects.
- [contracts/pages.md](contracts/pages.md) defines the New Issue page's route, states, and accessibility contract.
- [quickstart.md](quickstart.md) defines isolated-database setup and end-to-end validation for the primary, alternate, exception, and concurrency scenarios.

### Requirement-to-Design Traceability

| Requirement area | Normative IDs | Primary design artifacts |
|-------------------|---------------|---------------------------|
| Membership authorization | FR-001, FR-002 | Server Action contract; data model transaction step 1; quickstart Scenario 4 |
| Title/description validation and sanitization | FR-003–FR-005 | Data model validation rules; markdown renderer decision in research.md; quickstart Scenario 1 |
| Status selection and default | FR-006–FR-008, FR-017 | Data model `issue_status` enum; Server Action contract; quickstart Scenario 2 |
| Priority selection and default | FR-009, FR-010 | Data model `issue_priority` enum; Server Action contract; quickstart Scenario 2 |
| Labels (select, create inline, dedupe) | FR-011–FR-013 | Data model `labels`/`issue_labels`; create-issue transaction steps 3–4; quickstart Scenario 3 |
| Assignee (pick, assign to me, stale-assignee handling) | FR-014–FR-016 | Data model assignee validation; Server Action contract; quickstart Scenario 5 |
| Persistence and visibility | FR-018 | Create-issue transaction; pages contract; quickstart Scenario 1 |

## Project Structure

### Documentation (this feature)

```text
specs/009-create-issue/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── governance.md
├── checklists/
│   └── requirements.md
└── contracts/
    ├── server-actions.md
    └── pages.md
```

### Source Code (repository root)

```text
app/
├── (shell)/
│   └── projects/
│       └── [projectKey]/
│           ├── page.tsx                  # existing placeholder — adds a "New issue" entry point
│           └── issues/
│               └── new/
│                   └── page.tsx          # New Issue page (Server Component: loads project, members, labels)
└── actions/
    └── issues.ts                          # createIssue Server Action

components/
└── projects/
    └── issues/
        └── create-issue-form.tsx          # client composer: title, description (write/preview), status,
                                            # priority, label picker + inline create, assignee picker

lib/
├── db/
│   ├── queries/
│   │   └── labels.ts                      # list labels for a project (read-only)
│   └── schema/
│       ├── issues.ts                      # issues table + issue_status / issue_priority enums
│       ├── labels.ts                      # labels table
│       └── issue-labels.ts                # issue_labels join table
├── issues/
│   ├── create-issue.ts                    # createIssue transaction (membership check, label
│   │                                       # resolve-or-create, assignee re-check, issue insert)
│   └── validation.ts                      # title/description bounds, enum/label/assignee validation
└── markdown/
    └── render.ts                          # escape-then-transform basic markdown renderer

tests/
├── unit/
│   └── issues/
│       ├── create-issue-validation.test.ts
│       └── markdown-render.test.ts
├── component/
│   └── issues/
│       └── create-issue-form.test.tsx
└── integration/
    └── issues/
        ├── create-issue-action.test.ts
        ├── create-issue-label-concurrency.test.ts
        └── create-issue-authorization.test.ts
```

**Structure Decision**: Keep the mutation entry point in `app/actions`, the transaction and validation in framework-independent `lib/issues` and `lib/db` modules, and the composer UI in one co-located component under `components/projects/issues`, matching the precedent set by `create-project-form.tsx` (status/priority/label/assignee pickers stay inline rather than becoming premature sub-components). Reuses the existing `project_memberships`-based membership check instead of duplicating it. No Route Handler is added because the only mutation consumer is the authenticated web application.

## Post-Design Constitution Re-check

The Phase 1 design retains the required stack and introduces no constitutional exception. Fixed enums replace a customizable-columns table that is no longer needed; a single transaction provides label create-or-reuse and issue insertion atomicity; current database state authorizes the mutation and validates the assignee; expected errors are typed return values; all UI styling consumes existing StyleX tokens; markdown rendering reuses the already-approved `marked` dependency restricted to a safe element subset instead of requesting new approval; and TDD plus `npm run verify` remain explicit gates.

**Post-design gate result**: PASS. The plan is design-complete.

## Complexity Tracking

No constitutional violations require justification. A fixed status/priority enum and a single label-resolving transaction are the minimum mechanisms needed to satisfy the spec without reintroducing the customizable board/column complexity that `003-issue-kanban-board` no longer provides.
