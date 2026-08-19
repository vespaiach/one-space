# US2 Initial Admin Bootstrap Evidence

**Status**: Passed in isolated local PostgreSQL.

**Environment**: Local Node.js test process with PostgreSQL database `one_space_feature_test`.

Command:

```text
DATABASE_URL_TEST=postgres://localhost/one_space_feature_test npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/bootstrap/initial-admin.test.ts
```

Result: 3 tests passed. An empty database creates exactly one active Admin under concurrent bootstrap calls; repeat bootstrap preserves the existing Admin despite changed configuration; missing empty-database configuration and non-empty data without an active Admin fail without creating or promoting an account.

Command:

```text
npm test -- --run tests/unit/instrumentation.test.ts
```

Result: 1 test passed. Edge runtime registration performs no bootstrap work. The installed Next.js instrumentation contract confirms async Node registration completes before readiness; Node bootstrap failures are not caught by `instrumentation.ts` and therefore propagate.

This is local integration evidence, not a two-process production deployment exercise.
