# Foundation Dependency Gate: Add Project Members

**Task**: T002
**Audited**: 2026-08-19
**Commit**: `2adef43`
**Result**: APPROVED TO PROCEED WITH MINIMAL FOUNDATIONS

Feature 008 must extend the authoritative account, Project, Notification, and Project activity foundations. It must not create substitutes for missing owner-feature behavior.

## Audit results

| Foundation | Required capability | Evidence | Result |
|---|---|---|---|
| Feature 001 accounts | Admin/Member roles and active/suspended status | `lib/db/schema/users.ts` defines the required role and status sets | PASS |
| Feature 001 sessions | Current database-backed active session and revocation/expiry checks | `lib/db/schema/auth.ts`, `lib/db/queries/sessions.ts`, and `lib/auth/session.ts` reject revoked, expired, suspended, and forced-reset sessions | PASS |
| Feature 001 authorization | Active Admin guard usable at page and Server Action boundaries | `lib/auth/guards.ts` supplies `requireSession` and `requireAdmin` over the current session context | PASS |
| Features 002/007 Project entity | Stable Project ID, unique current key, name, and privacy owner references | `lib/db/schema/projects.ts` and migration `drizzle/migrations/0001_parched_krista_starr.sql` provide the basic entity | PARTIAL |
| Feature 002 Project lifecycle | Authoritative `active`/`archived` status and current-status access behavior | `lib/db/schema/projects.ts` has no Project status field, archive transition, or status constraint | FAIL |
| Feature 002 Project reads | Private Project list/detail lookup and member-versus-non-member authorization | `lib/db/queries/projects.ts` and `app/(shell)/projects/[projectKey]/page.tsx` are absent; only the create page exists | FAIL |
| Feature 004 Project activity | Shared Project activity table and `member_added` presentation | `lib/db/schema/project-activity-entries.ts` and a Project activity consumer are absent; generic `audit_events` is an operator audit log and is not the Project feed entity | FAIL |
| Feature 006 Notifications | Shared recipient Notification storage, ordering, read/unread behavior, and current destination projection | `lib/db/schema/notifications.ts` and `lib/db/queries/notifications.ts` are absent | FAIL |
| Feature 006 consumer | Authenticated Notifications & Mentions UI capable of registering `project_member_added` | `components/home/notifications-and-mentions.tsx` is absent, and `app/page.tsx` redirects to `/users` | FAIL |

## Existing Project implementation boundary

Feature 007 currently implements Project creation through `app/actions/projects.ts`, `app/(shell)/projects/new/page.tsx`, and `components/projects/create-project-form.tsx`. This is not sufficient for feature 008 because it does not provide the Project status, list/detail route, privacy authorization, archived read-only behavior, or current-key destination consumer required by the approved specification.

## Blocking work owned outside feature 008

1. Complete the feature-002 Project lifecycle and access foundation, including `active`/`archived` state, private Project list/detail queries, Project detail route, and current-status authorization.
2. Complete or approve the feature-004 shared Project activity schema and Project feed projection for `member_added`.
3. Complete or approve the feature-006 shared Notification schema, recipient-scoped query, read/unread behavior, current destination projection, and Notifications & Mentions consumer.
4. Re-run T002 after those owner-feature artifacts exist and confirm their identifiers, foreign-key policy, retention, privacy, and presentation contracts are compatible with `specs/008-add-project-members/data-model.md` and `specs/008-add-project-members/contracts/`.

## Gate decision

T002's audit and evidence are complete, but the Phase 1 checkpoint fails. Per `tasks.md`, implementation stops before T003. Creating Project status, shared Notification, or Project activity substitutes inside feature 008 would duplicate owner-feature concepts and violate the approved plan.

## User-approved scope override

On 2026-08-19, the user explicitly approved all identified foundation work and instructed implementation to continue. Feature 008 may therefore add the minimal authoritative Project lifecycle/read model, shared Notification storage/query/consumer, and Project activity storage required by its approved specification and contracts. This approval does not authorize unrelated feature-002, feature-004, or feature-006 functionality beyond those dependencies.
