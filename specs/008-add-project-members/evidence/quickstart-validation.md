# Add Project Members Quickstart Validation

**Task**: T046
**Date**: 2026-08-19
**Database**: local isolated PostgreSQL database `one_space_feature_008_test`

## Environment and command corrections

Docker was unavailable, so the named Docker container in the quickstart was not started. Validation used a dedicated local PostgreSQL database whose name contains `test`; it did not reuse inherited application data. The quickstart's stale `TEST_DATABASE_URL` name and obsolete focused-test commands were corrected to the repository's guarded `DATABASE_URL_TEST` contract and current test paths before this record was finalized.

Dependencies installed successfully with `npm ci`. The generated migration was applied to the isolated database. Reviewer-owned checklists were read but not edited.

## Scenario matrix

| Scenario | Result | Obtained boundary |
|---|---|---|
| 1 — Primary add flow | PARTIAL | Active Member, other Admin, self-add, active/archived Project, atomic side effects, rollback, roster visibility, immediate access, status-sensitive access, and re-add passed. The 20 representative-human sessions are unavailable under T044. |
| 2 — Notification and archived access | PASS for automated/local boundaries | One unread recipient Notification, correct actor/Project, derived current destination, active/archived access, refresh-based visibility without push, current status, and 100/100 five-second reads passed. |
| 3 — Duplicate and concurrency safety | PASS | Twenty synchronized pairs each produced one success and one `already_member`; 20 repeats preserved one membership/Notification/activity set; re-add produced one new period and side-effect set. |
| 4 — Authorization, validation, and rollback | PASS | No-session, revoked/expired-session, Member actor, malformed and unknown identifiers, injected failures, privacy boundaries, rollback, and exactly-one allowlisted diagnostic passed. |
| 5 — Eligibility changes | PASS | Stale suspension, initial suspended reason, restored eligibility, and no-eligible-user behavior passed in database and component boundaries. |
| 6 — Notification consumer isolation | PASS | Recipient isolation, unrelated-user denial, current Project rename/key projection, unread creation, and retained read ordering passed. |
| 7 — Accessibility and responsive use | PARTIAL | Automated axe/structure tests and live 320 × 640 active, archived, success, and stale-error inspection passed after two live-found fixes. A physical keyboard session, actual 200% browser zoom, and named physical screen reader remain unavailable under T043. |

## Database inspection

The isolated PostgreSQL schema tests obtained all requested structural evidence:

- partial uniqueness applies only while `removed_at IS NULL`;
- removal timestamp and removing actor must be paired;
- Notification and activity source membership IDs are unique;
- actor, subject, Project, recipient, and membership foreign keys are restrictive;
- destination URLs and event prose are absent from persisted side-effect rows;
- injected failures roll back membership, Notification, and activity writes together.

## Cleanup and boundaries

The performance harness removed its run-scoped records. No Docker container existed to remove. The temporary self-signed HTTPS certificate directory used for browser review was moved to the system Trash at `/Users/toannguyen/.Trash/one-space-v2-certificates-20260819` and is recoverable until Trash is emptied.

T046 is complete because every quickstart row is recorded as obtained, partial, or unavailable without changing reviewer-owned checklist markers. T043 and T044 remain open and are not converted into passes by automated evidence.
