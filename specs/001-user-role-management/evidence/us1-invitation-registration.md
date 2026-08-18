# US1 Invitation and Registration Evidence

**Status**: Automated coverage passed; live SMTP and HTTPS browser evidence pending.

**Environment**: Local Node.js test process with isolated PostgreSQL database `one_space_feature_test`.

## Automated evidence

Command:

```text
DATABASE_URL_TEST=postgres://localhost/one_space_feature_test npx vitest run --environment=node --maxWorkers=1 --no-file-parallelism tests/integration/actions/invitations.test.ts tests/integration/http/invitation-intake.test.ts tests/integration/actions/register.test.ts
```

Result: 8 tests passed. Coverage includes SMTP acceptance-only success, rejection/failure, canonical registered-email rejection, fresh seven-day stateless tokens, wrong-purpose/tampered/exact-expiry rejection, post-registration rejection, fixed two-hour Member session creation, and one winner under concurrent canonical-email registration.

Command:

```text
npm test -- --run tests/unit/components/invitation-registration.test.tsx
```

Result: 3 component tests passed. Coverage includes the FR-063 non-revocation warning, degraded-email state, accessible single-step fields, and invalid-link rendering.

## Evidence boundary

SC-002, SC-017, SC-018, and SC-020 have automated fixture evidence only. SC-001 delivery-to-completion timing, live SMTP acceptance/delay/duplicate behavior, Secure-cookie behavior behind HTTPS, and a rendered browser journey have not been exercised and are not claimed as passing here.
