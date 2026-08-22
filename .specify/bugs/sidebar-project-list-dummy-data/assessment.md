# Bug Assessment: Sidebar project list uses hardcoded dummy data instead of the database

- **Slug**: sidebar-project-list-dummy-data
- **Created**: 2026-08-21
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> replace dummy project list on side bar navigation with the real data from database, remember to check project member before loading the list

## Symptom

The sidebar's "Projects" section (rendered by `Shell` in `components/ui/shell.tsx`) always shows the same five hardcoded projects (WEB, MOB, BRD, SEO, OPS) for every logged-in user, instead of the projects that user actually belongs to. Expected: the sidebar should show only the projects the current user is an active member of, matching the behavior already implemented on the `/projects` page.

## Reproduction

1. Log in as any user.
2. Load any page under the `(shell)` route group (e.g. the dashboard).
3. Observe the sidebar "Projects" list shows the same 5 fake projects regardless of account.
4. Compare with `/projects` (`app/(shell)/projects/page.tsx`), which correctly shows only the logged-in user's real, membership-scoped projects — confirming the sidebar is the outlier.

## Suspected Code Paths

- `app/(shell)/layout.tsx:7-13,31-39` — hardcoded `PROJECTS` (and `MEMBERS`) constants passed straight into `<Shell projects={PROJECTS} .../>`, never derived from `session` or the database.
- `components/ui/shell.tsx:365-382,440-456` — `Shell`'s `projects` prop and its rendering; expects each item shaped as `{ key, name, color, issueCount }`.
- `lib/db/queries/projects.ts:20-34` — `listProjectsForUser(database, userId)` already implements exactly the membership check the report asks for: inner-joins `projectMemberships` on `userId` and filters `isNull(removedAt)`. It is already used correctly by `app/(shell)/projects/page.tsx:6-8`. Its return shape (`id, key, name, description, status, access, canEdit`) does not include `color` or `issueCount`, so it cannot be passed to `Shell` unmodified.
- `lib/db/schema/projects.ts:11` — `projects.color` column already exists and can supply the sidebar's dot color.
- `lib/db/schema/issues.ts:8-14` — `issues.projectId` is the join key needed to compute a live `issueCount` per project.
- `tests/integration/projects/project-membership-access.test.ts` — existing coverage proving `listProjectsForUser` correctly scopes by active membership and excludes historical/removed members; the fix should extend this same pattern rather than inventing a new one.

## Root Cause Hypothesis

High confidence. The sidebar was scaffolded with static placeholder data (`PROJECTS`/`MEMBERS` in `app/(shell)/layout.tsx`) during UI-first development and was never wired up to the database, even though a correctly membership-scoped query (`listProjectsForUser`) already exists, is tested, and is used by the sibling `/projects` page. This is a leftover integration gap, not a design ambiguity.

## Proposed Remediation

**Preferred**: In `app/(shell)/layout.tsx`, remove the hardcoded `PROJECTS` constant and load the sidebar's project list from the database using the same membership-checked pattern as `listProjectsForUser`, then pass the result to `<Shell projects={...}>` alongside the existing `notifications`/`members` fetch (extend the current `Promise.all`, not a separate sequential call).

Because `listProjectsForUser`'s existing shape and test suite serve the `/projects` page and shouldn't be disturbed for an unrelated caller, add a small dedicated query (e.g. `listSidebarProjectsForUser(db, userId)` in `lib/db/queries/projects.ts`) that reuses the same `projectMemberships` join/`isNull(removedAt)` filter, and additionally selects `projects.color` and a `count(issues.id)` (left-joined/grouped on `issues.projectId`) to produce exactly `{ key, name, color, issueCount }`.

**Alternatives** (optional):
- Extend `AccessibleProject`/`listProjectsForUser` itself to also carry `color` and `issueCount`. Simpler (one query to maintain) but changes a shape three other call sites and tests already depend on, and mixes an issue-count aggregate into a query whose current job is pure access-checking — more churn than the ask requires.

**Files likely to change**:
- `lib/db/queries/projects.ts` (new sidebar-scoped query function)
- `app/(shell)/layout.tsx` (remove `PROJECTS` constant, call new query, wire into `Shell`)
- `tests/integration/projects/*` (new or extended test file for the sidebar query)

**Tests to add or update**:
- A member of Project A (not B) sees only A from the new query — mirrors `project-membership-access.test.ts:29-46`.
- A historical/removed member (`removedAt` set) does not see the project — reuse the `createTestHistoricalMembership` helper (`tests/helpers/project-members.ts`), mirrors `project-membership-access.test.ts:73-90`.
- `issueCount` reflects the real number of issues for that project (0 with none, N after inserting N).
- `color` passes through from the `projects.color` column.

## Risks & Considerations

- The membership filter (`isNull(projectMemberships.removedAt)`) is security-sensitive: dropping it would leak every project's name/key/issue-count to every logged-in user regardless of membership, which is the exact failure mode the report calls out. Reuse the existing, tested join pattern rather than re-deriving it.
- **Adjacent latent bug found during investigation, out of this report's literal scope**: `createProject` (`app/actions/projects.ts:74-78`) writes members selected at creation time into the `project_members` table (`lib/db/schema/project-members.ts`), but every read path — `listProjectsForUser`, `listCurrentProjectMembers`, issue-creation authorization in `lib/issues/create-issue.ts`, and the `addProjectMember` action — reads/writes `project_memberships` (`lib/db/schema/project-memberships.ts`) instead. These are two different tables that never intersect. Practically, a member picked while creating a project is not recognized as a member anywhere, including today's `/projects` page. Wiring the sidebar to the membership-checked query will inherit this same gap. Recommend filing this as its own bug rather than folding a fix into this change.
- Project creators are not auto-granted membership either (confirmed intentional by the existing test suite), so a project's own creator won't see it in the sidebar unless separately added as a member — this matches current `/projects` behavior, so it is not a regression introduced by this fix, just a UX surprise worth knowing about going in.
- Per the project constitution: no `any`, dead code (the removed `PROJECTS` constant) must be fully deleted rather than commented out, and any new query must stay a small, single-responsibility function rather than growing `listProjectsForUser` beyond its current job.

## Open Questions

- [NEEDS CLARIFICATION: Should archived projects (`status: "archived"`) still appear in the sidebar, and if so, how should that be indicated? The current dummy data has no notion of archived state.]
- [NEEDS CLARIFICATION: Is the `project_members` vs `project_memberships` split (see Risks) a known, intentional separation of concerns, or a bug from the "allow add members while creating project" change? Worth confirming before treating it as a separate bug report.]
