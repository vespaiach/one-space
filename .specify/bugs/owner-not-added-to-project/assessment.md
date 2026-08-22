# Bug Assessment: Project creator (owner) is never added as a member of the project they create

- **Slug**: owner-not-added-to-project
- **Created**: 2026-08-21
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> when creating a project the owner should be added to the project by default

## Symptom

When an admin creates a project, the creating admin ("owner") is never inserted as a member of that project. Expected: the creator should automatically have membership/access to the project they just created (this is explicitly required by `specs/007-create-project/spec.md` FR-008: "A successfully created project MUST be immediately accessible to the creating admin").

Actual, observed via code trace: the creator is excluded on purpose from the membership insert, and — separately — the insert writes to a database table that is not consulted by any authorization check anywhere in the app. The practical effect is that immediately after creating a project, the creating admin gets a 404 when opening it and the project does not appear in their own project list.

## Reproduction

1. Log in as a user with the `admin` role.
2. Submit the "create project" form (`createProject` server action) with only the required fields (no extra members picked).
3. On redirect to `/projects`, the newly created project is absent from the list (`listProjectsForUser` returns nothing for this project/user).
4. Navigate directly to `/projects/<KEY>` — the page calls `notFound()` and renders Next.js's not-found page, not the project.

This is directly reproduced by the code paths below; no `[NEEDS CLARIFICATION]` — the root cause is unambiguous from static analysis and is also implicitly confirmed by the existing test suite (see below), which currently asserts the buggy behavior as correct.

## Suspected Code Paths

- `app/actions/projects.ts:38-41` — `candidateMemberIds` explicitly filters out `admin.userId` before any membership row is ever considered:
  ```ts
  const candidateMemberIds = rawMemberIds
    .filter((id) => UUID_REGEX.test(id))
    .filter((id) => id !== admin.userId);
  ```
- `app/actions/projects.ts:60-79` — the creation transaction inserts the `projects` row (with `createdBy: admin.userId` as an audit column only) and, for any *other* selected members, inserts into `projectMembers` — never for the admin, and never into `projectMemberships`:
  ```ts
  await db.transaction(async (tx) => {
    const [project] = await tx.insert(projects).values({ ...., createdBy: admin.userId }).returning({ id: projects.id });
    if (validMemberIds.length > 0) {
      await tx.insert(projectMembers).values(validMemberIds.map((userId) => ({ projectId: project.id, userId })));
    }
  });
  ```
- `lib/db/schema/project-members.ts` — the `project_members` table `createProject` writes to. Grepping the whole source tree (excluding `.next` build output and stale worktrees), this table is written and read **only** by `app/actions/projects.ts` and its test — it is not consulted by any access-control or listing query.
- `lib/db/schema/project-memberships.ts` — the `project_memberships` table that is actually authoritative for access. It has a richer shape (`addedByUserId`, `removedAt`, a partial unique index enforcing one active membership per user/project).
- `lib/db/queries/projects.ts:20-34` (`listProjectsForUser`) and `:36-59` (`getProjectAccessByKey`) — both **inner-join `project_memberships`** (not `project_members`) to determine what a user can see/access:
  ```ts
  .from(projectMemberships)
  .innerJoin(projects, eq(projectMemberships.projectId, projects.id))
  .where(and(eq(projectMemberships.userId, userId), isNull(projectMemberships.removedAt), ...))
  ```
- `app/(shell)/projects/[projectKey]/page.tsx:14-17` — consumes `getProjectAccessByKey`; `if (!project) notFound();` is what the creating admin hits.
- `lib/projects/add-project-member.ts:141-148` — the separate, already-correct "add member" flow shows the intended shape of a real membership insert (into `project_memberships`, with `addedByUserId`):
  ```ts
  const [membership] = await transaction
    .insert(projectMemberships)
    .values({ projectId: project.id, userId: target.id, addedByUserId: input.actorUserId })
    .returning({ id: projectMemberships.id });
  ```
- `tests/integration/projects/create-project.test.ts:381-406` — the test suite currently **pins the bug as expected behavior**: `"silently drops admin's own UUID from memberIds"` asserts the admin is *not* present among `projectMembers` rows, and all creation-related assertions in this file query `projectMembers`, never `projectMemberships`.
- `specs/007-create-project/spec.md` (Assumptions section) — contains the root-cause premise, stated as fact but false in the implementation: *"the creating admin is excluded because self-membership at creation is redundant — the admin already owns and can access the project."* Ownership (`projects.createdBy`) grants no access anywhere in the code; only an active `project_memberships` row does.

## Root Cause Hypothesis

Two membership tables exist because two specs were implemented at different times: `project_members` (spec 007, "create project") and `project_memberships` (spec 008, "add member" — richer, audit-capable). `project_memberships` became the sole source of truth for all authorization/listing queries, but `app/actions/projects.ts` (spec 007's `createProject`) was never migrated to it, and it also carries a deliberate (but now-incorrect) exclusion of the creating admin based on the false assumption that ownership implies access. Net effect: nobody who creates a project — nor anyone explicitly picked as a member during creation — ends up with real, query-visible access; only the admin's `createdBy` audit trail exists. Confidence: **high** — the join conditions, table usage, and the test file all corroborate each other and there is only one plausible fix point.

## Proposed Remediation

**Preferred**: In `app/actions/projects.ts`, change the creation transaction to insert into `projectMemberships` (not `projectMembers`), and include the creating admin in that insert alongside any explicitly-selected members, mirroring the shape already used by `lib/projects/add-project-member.ts` (`projectId`, `userId`, `addedByUserId`). The admin's own row would have `addedByUserId: admin.userId` (self-added, at creation time). Remove the now-unused `candidateMemberIds` filter that excludes `admin.userId`, since the picker already excludes the admin from the *selectable* list (per FR-011) — the filter's job going forward is purely UUID validation, not self-exclusion. This is a single, localized change: it fixes both the reported symptom (owner has no access) and the closely related, previously-undetected symptom that explicitly-picked members also get no real access, since both share the same root cause (wrong table).

**Alternatives** (optional):
- Keep writing to `project_members` and instead change `getProjectAccessByKey` / `listProjectsForUser` to also grant access via `projects.createdBy = userId`. Rejected as preferred: it patches only the owner's symptom, leaves picked-members-at-creation still broken, touches the authorization-critical query path (higher blast radius), and leaves a dead, structurally-duplicate `project_members` table in place with no clear future purpose.

**Files likely to change**:
- `app/actions/projects.ts` — swap `projectMembers` import/insert for `projectMemberships`; include the admin's own membership row; drop the `id !== admin.userId` filter.
- `tests/integration/projects/create-project.test.ts` — update assertions that currently query `projectMembers` and assert the admin is excluded; they need to query `projectMemberships` and assert the admin **is** included (plus any explicitly-selected members).

**Tests to add or update**:
- Update/replace `"silently drops admin's own UUID from memberIds"` (currently asserts exclusion) to assert the admin *is* a member post-creation.
- New/updated test: creating a project with no extra members still results in exactly one `project_memberships` row (the admin) for that project.
- New/updated test: `getProjectAccessByKey` / `listProjectsForUser` return the project for the creating admin immediately after creation (closes the loop on FR-008 at the query layer, not just the insert).
- Existing tests asserting membership counts/contents for explicitly-selected members should continue to pass against `project_memberships` instead of `project_members`.

## Risks & Considerations

- **Schema/data cleanup out of scope**: `project_members` becomes fully dead code after this fix (no remaining writers or readers). Dropping the table/schema file is a separate migration decision and is not required to fix this bug; flagging it as a follow-up rather than bundling a migration into this fix.
- **Spec/doc drift**: `specs/007-create-project/spec.md`'s Assumptions section states the false premise that ownership implies access. Worth a follow-up doc correction so future readers of the spec aren't misled again, but editing specs is outside this command's scope (assessment/fix only touch code + `.specify/bugs/`).
- **Uniqueness constraint**: `project_memberships` enforces one *active* row per `(projectId, userId)` via a partial unique index — inserting the admin's row in the same transaction as any explicitly-selected members is safe as long as the admin can't also appear in `validMemberIds` (already guaranteed: the picker excludes the admin per FR-011, and UUID-only validation doesn't reintroduce them).
- **No notifications/activity-log parity**: `lib/projects/add-project-member.ts` also writes a `notifications` row and a `projectActivityEntries` row per membership. `createProject` today does neither for anyone (owner or picked members). This assessment's preferred fix does not add that parity — it only makes the membership row itself correct — to keep the change minimal and scoped to the reported bug. Whether project-creation-time memberships should also emit notifications/activity entries is a product decision, not implied by the bug report.

## Open Questions

- [NEEDS CLARIFICATION: Should the admin's self-membership row also produce a `projectActivityEntries` "member_added" entry / notification, for audit-trail parity with the post-creation "add member" flow? Not required to fix the reported bug; flagging so the fix author can confirm scope before implementing.]
