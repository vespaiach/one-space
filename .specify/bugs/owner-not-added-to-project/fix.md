# Bug Fix: Project creator (owner) is never added as a member of the project they create

- **Slug**: owner-not-added-to-project
- **Fixed**: 2026-08-21
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`createProject` now inserts the creating admin's own `project_memberships` row (the table every authorization/listing query actually reads) alongside any explicitly-selected members, instead of writing exclusively to the unused legacy `project_members` table and excluding the admin. The admin now has immediate, query-visible access to a project they just created, matching FR-008.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `app/actions/projects.ts` | modified | Swapped the `projectMembers` import/insert for `projectMemberships`; the creation transaction now inserts one row for the admin (`addedByUserId: admin.userId`) plus one row per explicitly-selected member. Kept (simplified into one filter) the `id !== admin.userId` exclusion in `candidateMemberIds` — see Deviations below. |
| `tests/integration/projects/create-project.test.ts` | modified | Repointed all membership assertions from `projectMembers` to `projectMemberships`; updated expected row counts (+1 for the admin) in the "member insertion" describe block; renamed the self-UUID test to reflect dedup rather than "drop"; added a new describe block asserting `getProjectAccessByKey`/`listProjectsForUser` return the project for the admin right after creation. |

## Diff Highlights

```ts
// app/actions/projects.ts
await tx.insert(projectMemberships).values([
  { projectId: project.id, userId: admin.userId, addedByUserId: admin.userId },
  ...validMemberIds.map((userId) => ({
    projectId: project.id,
    userId,
    addedByUserId: admin.userId,
  })),
]);
```

```ts
const candidateMemberIds = rawMemberIds.filter((id) => UUID_REGEX.test(id) && id !== admin.userId);
```

## Tests Added or Updated

- `tests/integration/projects/create-project.test.ts::"inserts a membership for the admin plus two valid memberIds"` — was "inserts two project_members rows..."; now asserts 3 `project_memberships` rows (admin + 2 picks), all with `addedByUserId === admin.id`.
- `tests/integration/projects/create-project.test.ts::"inserts exactly one membership row (the admin) when no memberIds submitted"` — was "inserts no project_members rows..."; now asserts exactly one row, owned by the admin. This directly pins the reported bug.
- `tests/integration/projects/create-project.test.ts::"dedupes admin's own UUID from memberIds instead of inserting it twice"` — was "silently drops admin's own UUID..."; now asserts the admin appears exactly once (not doubled, not dropped) when their own id is also submitted in `memberIds[]`.
- `tests/integration/projects/create-project.test.ts::"silently drops non-existent UUID and inserts remaining valid member"` — updated row-count expectation from 1 to 2 (admin + the one valid member).
- `tests/integration/projects/create-project.test.ts::"makes the new project visible to the creating admin via getProjectAccessByKey and listProjectsForUser"` (new) — creates a project, then calls the actual query-layer functions used by the project page and project list to confirm the admin can see it immediately — closes the loop at the layer where the bug was actually observable, not just at the insert.

## Local Verification

- Commands run:
  - `npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects/create-project.test.ts` → **16/16 passed**.
  - `npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/projects` → **55/55 passed** (full projects integration suite, including `add-project-member*` tests — no regressions from the schema-import change).
  - `npx biome check app/actions/projects.ts` → clean (test files are excluded from biome's configured paths in this repo).
- Environment note: this machine had no `DATABASE_URL_TEST` configured and no existing `one_space_test` Postgres role. With the user's explicit consent, I created the role (`CREATE ROLE one_space_test LOGIN PASSWORD 'change-me'`) and granted it privileges on the existing `one_space_feature_test` database/schema (which already existed with current tables — no migration needed). This is local-only state on the dev machine, not a shared/production resource.

## Deviations from Assessment

- The assessment's preferred remediation said to "remove the now-unused `candidateMemberIds` filter that excludes `admin.userId`... the filter's job going forward is purely UUID validation, not self-exclusion." I kept the exclusion (merged the two `.filter()` calls into one, same effect) instead of removing it: `project_memberships` enforces one *active* row per `(projectId, userId)` via a partial unique index, and the transaction now unconditionally inserts a row for `admin.userId` first. If a crafted `memberIds[]` payload also included the admin's own UUID and the exclusion were removed, `validMemberIds` would contain `admin.userId` a second time, producing a duplicate-key insert that would throw inside the transaction (unhandled — `createProject` has no catch around the insert, unlike `add-project-member.ts`). Keeping the exclusion is a one-line dedup that avoids introducing a new crash path for no behavioral loss (the picker already excludes the admin from the selectable list per FR-011, so this only guards against a crafted/replayed request). Covered by the new test `"dedupes admin's own UUID from memberIds instead of inserting it twice"`.
- No other deviations. Notification/activity-log parity was explicitly out of scope per the assessment and was not added.

## Follow-ups

- `project_members` (`lib/db/schema/project-members.ts`) is now fully dead code (no remaining readers or writers anywhere in the app). Consider a follow-up migration to drop the table and schema file — out of scope for this bug fix per the assessment.
- `specs/007-create-project/spec.md`'s Assumptions section still states "the admin already owns and can access the project" as the rationale for excluding the admin from the member picker — worth a doc correction so the false premise doesn't mislead future readers.
- Open question from the assessment (whether the admin's self-membership should also emit a `projectActivityEntries`/`notifications` entry for audit parity with the separate "add member" flow) remains unresolved; not required for this bug.
