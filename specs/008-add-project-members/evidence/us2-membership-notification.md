# US2 Membership Notification Evidence

**Task**: T028
**Recorded**: 2026-08-19
**Database**: local isolated PostgreSQL database `one_space_feature_008_test`

## Automated result

Command:

```sh
DATABASE_URL_TEST='postgresql://toannguyen@localhost/one_space_feature_008_test' npx vitest run --maxWorkers=1 --no-file-parallelism tests/component/projects/project-membership-notification.test.tsx tests/integration/projects/project-membership-notification.test.ts
```

Result: 2 files passed, 7 tests passed.

Obtained evidence:

- The recipient's next database-backed read returned exactly one unread membership Notification immediately after commit; another user received no record.
- Unread records sorted before read records, with creation time and identity supplying stable reverse ordering.
- Actor and Project names were rendered from referenced current records.
- Renaming a Project changed the projected label and destination to its current name and key.
- Active and archived Notification destinations were derived as `/projects/{current key}`; archived presentation identified read-only status.
- Duplicate attempts created no second Notification, while a re-add after a historical membership produced one Notification for the new membership period.
- The protected shell performs a fresh server-side recipient query on navigation or refresh. The consumer contains no polling, push subscription, background timer, or client-authored destination path, so an already-rendered page does not update live.

## Boundaries

- The no-push behavior is established by implementation inspection plus fresh-read tests, not by a live multi-browser observation.
- The 100-operation five-second timing threshold remains reserved for T042 and is not claimed here.
- Read/unread ordering was verified by setting one retained record's `read_at`; this feature does not introduce a new mark-read mutation.
