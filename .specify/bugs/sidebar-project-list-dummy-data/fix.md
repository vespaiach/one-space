# Bug Fix: Sidebar project list uses hardcoded dummy data instead of the database

- **Slug**: sidebar-project-list-dummy-data
- **Fixed**: 2026-08-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Replaced the hardcoded `PROJECTS` constant in the shell layout with a real, membership-checked database query, so the sidebar now shows only the projects the logged-in user is an active member of, with live issue counts.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `lib/db/queries/projects.ts` | added | New `listSidebarProjectsForUser(db, userId)` — reuses the same `projectMemberships` join + `isNull(removedAt)` filter as `listProjectsForUser`, adds `projects.color` and a `count(issues.id)` left-join aggregate, returning `{ key, name, color, issueCount }` exactly matching `Shell`'s `projects` prop. |
| `app/(shell)/layout.tsx` | modified | Removed the hardcoded `PROJECTS` constant; added `listSidebarProjectsForUser(db, session.userId)` to the existing `Promise.all` alongside notifications/members, and passed the result to `<Shell projects={projects}>`. The unrelated `MEMBERS` (top-bar avatars) constant was left untouched — out of scope per the assessment. |
| `tests/integration/projects/sidebar-project-list.test.ts` | added | Three integration tests covering membership scoping, issue-count aggregation, and exclusion of historical/non-members. |

## Diff Highlights

```ts
// lib/db/queries/projects.ts
export async function listSidebarProjectsForUser(
  database: Database,
  userId: string,
): Promise<SidebarProject[]> {
  const rows = await database
    .select({
      key: projects.key,
      name: projects.name,
      color: projects.color,
      issueCount: count(issues.id),
    })
    .from(projectMemberships)
    .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
    .leftJoin(issues, eq(issues.projectId, projects.id))
    .where(and(eq(projectMemberships.userId, userId), isNull(projectMemberships.removedAt)))
    .groupBy(projects.id, projects.key, projects.name, projects.color)
    .orderBy(asc(projects.name), asc(projects.id));
  return rows.map((row) => ({ ...row, issueCount: Number(row.issueCount) }));
}
```

```ts
// app/(shell)/layout.tsx
const [notifications, members, projects] = await Promise.all([
  listNotificationsForRecipient(db, session.userId),
  isAdmin ? listUsers(db) : Promise.resolve([]),
  listSidebarProjectsForUser(db, session.userId),
]);
```

## Tests Added or Updated

- `tests/integration/projects/sidebar-project-list.test.ts::shows only the current user's projects, with color and live issue count` — pins membership scoping plus correct `color`/`issueCount` passthrough.
- `tests/integration/projects/sidebar-project-list.test.ts::returns zero issue count for a project with no issues` — pins the left-join aggregate doesn't drop projects with zero issues.
- `tests/integration/projects/sidebar-project-list.test.ts::excludes projects the user has no active membership for` — pins that historical (removed) members and non-members get an empty list, the exact security property the bug report asked for.

## Local Verification

- Commands run:
  - `npx biome check lib/db/queries/projects.ts "app/(shell)/layout.tsx" tests/integration/projects/sidebar-project-list.test.ts` → pass (one formatting fix applied, then clean).
  - `npx tsc --noEmit` → pass, no type errors.
  - `DATABASE_URL_TEST=... npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects/sidebar-project-list.test.ts tests/integration/projects/project-membership-access.test.ts` → 2 files, 6 tests, all passed.
  - `DATABASE_URL_TEST=... npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects` → 11 files, 58 tests, all passed (no regression in the broader projects suite).
- Note: `DATABASE_URL_TEST` is not set in the checked-in `.env`; the commands above supplied it inline for this session only, pointing at an existing local test database (`one_space_feature_test`) that already had the current schema migrated. No project files were modified to run these checks.
- Manual checks: none (no running dev server / browser check performed in this session).

## Deviations from Assessment

None. Implemented the assessment's preferred remediation (new dedicated query rather than extending `listProjectsForUser`) and did not touch the `project_members`/`project_memberships` split or the archived-project display question — both were explicitly called out as out of scope / open questions.

## Follow-ups

- The `project_members` vs `project_memberships` table split noted in the assessment's Risks section is still unresolved — members picked during project creation (`app/actions/projects.ts`) are still invisible to every read path, including this new sidebar query. Recommend a separate `/speckit-bug-assess` for that.
- Whether archived projects should appear in the sidebar (and how) is still an open question; current behavior includes them like `listProjectsForUser` does, with no archived indicator in the sidebar UI.
