# US3 Safe Add-Member Results Evidence

**Task**: T039
**Recorded**: 2026-08-19
**Database**: local isolated PostgreSQL database `one_space_feature_008_test`

## Automated result

Command:

```sh
DATABASE_URL_TEST='postgresql://toannguyen@localhost/one_space_feature_008_test' npx vitest run --maxWorkers=1 --no-file-parallelism tests/integration/projects/add-project-member-rejections.test.ts tests/integration/projects/add-project-member-concurrency.test.ts tests/integration/projects/add-project-member-diagnostics.test.ts tests/integration/projects/project-member-candidates.test.ts tests/component/projects/add-project-member-form-states.test.tsx
```

Result: 5 files passed, 23 tests passed.

## Scenario 3: duplicate and concurrency safety

- Twenty duplicate pairs were synchronized immediately before the membership insert using two independent PostgreSQL connections.
- Every pair produced exactly one `success` and one `already_member` outcome.
- Every pair retained exactly one membership, one membership Notification, and one Project activity entry.
- Twenty post-success repeats all returned `already_member` without changing cardinality.
- A removed membership could be re-added as a new period with exactly one new Notification and activity entry.

## Scenario 4: authorization, validation, rollback, and diagnostics

- Missing, expired, and revoked current-session outcomes were represented by the authoritative session resolver returning no current session; each returned `unauthenticated` with no side effects.
- Member actors were rejected before identifier validation or Project disclosure.
- Malformed identifiers, unknown Projects/users, suspended users, and existing memberships returned bounded expected codes.
- An injected Notification-write failure returned `unexpected` and rolled back the transaction.
- An unexpected action result created exactly one `operations` audit event with action `project.membership.add`, outcome `failed`, and reason `transaction_failed`.
- Inspection of the stored diagnostic found no session token, email, submitted form body, or private Project name.

## Scenario 5: current eligibility and actionable controls

- A target suspended through an independent connection immediately before insert was detected by the transaction's second current-state check and returned `conflict` with no side effects.
- Candidate reads returned only user ID, display name, role, and derived state in deterministic name/ID order.
- Acting Admin, eligible Member, already assigned Member, and suspended Member states were distinguishable; non-Admin access returned no protected data.
- The UI rendered disabled text reasons, linked field errors, conflict/retry guidance, live error status, preserved select focus, archived context, and a no-eligible-user explanation.

## Boundaries

- The synchronized PostgreSQL tests prove local database concurrency behavior; they do not claim multi-region or production-load behavior.
- Manual browser, screen-reader, 200%-zoom, and human usability sessions remain separate T043–T044 work.
