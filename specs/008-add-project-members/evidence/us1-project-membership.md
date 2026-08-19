# US1 Project Membership Evidence

**Task**: T022
**Recorded**: 2026-08-19
**Database**: local isolated PostgreSQL database `one_space_feature_008_test`

## Automated result

Command:

```sh
DATABASE_URL_TEST='postgresql://toannguyen@localhost/one_space_feature_008_test' npx vitest run --maxWorkers=1 --no-file-parallelism tests/integration/projects/add-project-member-action.test.ts tests/integration/projects/project-membership-access.test.ts tests/integration/projects/add-project-member-server-action.test.ts tests/component/projects/add-project-member-form.test.tsx
```

Result: 4 files passed, 19 tests passed.

Obtained evidence:

- Active Member, other active Admin, acting-Admin self-add, and archived-Project additions each committed exactly one current membership, one unread Notification, and one Project activity entry.
- Failures injected after the membership, Notification, and activity writes each rolled back all three records.
- A removed user could be re-added as a new membership period with one new side-effect set.
- A committed membership appeared immediately in the current roster and recipient Project list.
- Active access was editable and changed to archived read-only access after the authoritative Project status changed.
- Historical and absent memberships did not expose the Project.
- Direct Server Action invocation rejected unauthenticated, non-Admin, missing, malformed, and suspended-user requests without revalidation.
- Successful Server Action output used server-resolved names and revalidated the membership page, Project detail, Project list, and home paths only after commit.
- The Admin page rendered Project context for a system-wide Admin who was not required to be a Project member; form pending, committed success, reset, and roster-refresh rendering passed.

## Not yet obtained in this phase

- A browser-observed status transition during an in-flight add was not exercised. Current-status access before and after a database status change passed; the synchronized race matrix remains part of US3 validation.
- Recipient Notification projection, current-key destination, refresh-without-push behavior, and repeated Notification-read timing remain part of US2 and performance tasks.
- Representative-participant usability sessions and manual browser/accessibility measurements remain separate T043–T044 evidence and are not claimed here.
