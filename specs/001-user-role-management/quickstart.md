# Quickstart Validation Guide: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

This is the implementation validation/run guide. It proves behavior through the [data model](data-model.md) and [contracts](contracts/) without duplicating implementation code. Record environment, commit/image, timestamps, and evidence for every production-like or operational run.

## Prerequisites

1. GOV-003 (`sharp`), GOV-004 (`axe-core`), and GOV-005 (`@types/nodemailer`) are Approved before those dependencies are added or imported.
2. Node.js 20 and `npm ci` complete.
3. An isolated PostgreSQL database is available for tests. Never point destructive integration cleanup at inherited/development/production `DATABASE_URL`.
4. A controllable SMTP test service supports accepted, rejected, timeout, delayed, and duplicate-delivery fixtures.
5. A writable private avatar directory is outside `public` and the checkout/release tree.
6. Environment contains the values defined in [data-model.md — Environment and Deployment Inputs](data-model.md#environment-and-deployment-inputs), including:

   ```dotenv
   DATABASE_URL=postgres://...
   DATABASE_URL_TEST=postgres://.../one_space_feature_test
   APP_ORIGIN=https://one-space.test
   TOKEN_ENCRYPTION_KEY=<32-byte secret>
   RATE_LIMIT_HASH_KEY=<secret>
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=<stable secret>
   LOGIN_MAX_ATTEMPTS=5
   LOGIN_LOCKOUT_MINUTES=15
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_FROM=noreply@one-space.test
   INITIAL_ADMIN_EMAIL=admin@example.com
   INITIAL_ADMIN_PASSWORD=Admin1234!
   INITIAL_ADMIN_FIRST_NAME=Initial
   INITIAL_ADMIN_LAST_NAME=Admin
   AVATAR_STORAGE_PATH=/absolute/private/avatar-test-volume
   BACKUP_ENCRYPTION_KEY_FILE=/absolute/private/backup-test.key
   ```

7. Migrations are generated/reviewed and applied to the isolated DB. The application or production-equivalent Compose stack is running behind HTTPS/Traefik for cookie and proxy tests.

## Baseline Commands

```bash
npm ci
DATABASE_URL="$DATABASE_URL_TEST" npm run db:migrate
DATABASE_URL_TEST="$DATABASE_URL_TEST" npm test -- --run
npm run verify
```

After implementation, dedicated commands must also exist and exit nonzero on failure:

```bash
npm run test:accessibility
npm run test:integration
```

SC-004 performance is a recorded production-equivalent browser run; it does not require adding an unapproved browser-automation dependency.

`npm run verify` and static fixtures do not prove live SMTP acceptance, HTTPS cookie behavior, Docker volume durability, backup restoration, or a quarterly restore exercise; run the corresponding scenarios below.

## Scenario 1 — Bootstrap and Repeat Deployment (US2, SC-006/007)

Run each case against a fresh isolated database snapshot:

| Case | Setup | Expected startup result |
|------|-------|-------------------------|
| Empty + valid config | No users; all initial Admin inputs valid | Server becomes ready only after exactly one active Admin exists and can log in |
| Empty + missing/invalid config | No users; remove or invalidate one required input | Startup exits/fails readiness before traffic; no row created |
| Existing active Admin | Re-run with same, changed, and absent initial Admin config | Startup succeeds; account count, credentials, role, profile, and timestamps remain unchanged |
| Non-empty, no active Admin | Fixture contains data but no active Admin | Startup fails with bounded recovery reason; no account is created/promoted |
| Concurrent bootstrap | Start two application processes against the same empty DB | Exactly one Admin is inserted; both processes never create duplicates |

Confirm initial credentials cannot be rotated by changing deployment variables; use password reset for rotation.

## Scenario 2 — Invitation, Resend, and Concurrent Registration (US1, SC-001/002/017/020)

1. Log in as Admin and open `/admin/invitations`.
2. Confirm the screen states that resending does not revoke earlier stateless links.
3. Send to a mixed-case/whitespace address and verify the SMTP service accepts before UI success.
4. Confirm audit/log data contains no canonical recipient or token.
5. Open the delivered intake URL. Verify the browser immediately redirects to clean `/register`, the token is absent from address/history-visible page state, and `Referrer-Policy` prevents leakage.
6. Complete normalized names and a compliant password. Verify one active Member and one fixed two-hour full session commit, the invitation-flow cookie clears, and the browser reaches `/users`.
7. Measure SC-001 from the email service's recorded delivery timestamp to registration-success display; require under 3 minutes and report pre-delivery SMTP time separately.
8. Attempt self-registration without a flow, a tampered token, wrong-purpose token, exact-expiry token, expired token, and any authentic link after registration. Require rejection and no extra user/session.
9. For an unregistered canonical email, send two links. Use both concurrently at the transaction barrier. Require exactly one user/session winner; the loser returns email-in-use and creates nothing.
10. Resend after a lost/expired link. Confirm the new link expires seven days from its own issuance and an earlier unexpired link remains valid until registration.
11. Invitation to an active or suspended account's canonical email is rejected.

## Scenario 3 — Login, Sessions, Lockout, and Logout (SC-009/012/017/018)

1. Login without Remember Me; verify cookie flags and DB expiry exactly 2 hours after creation. Repeat with Remember Me and require exactly 21 days.
2. Verify activity never changes `expires_at`; at exact expiry the session is rejected.
3. Logout, restore the old raw cookie manually, and require rejection because only its hash exists and the row is revoked.
4. For threshold 5, submit four wrong passwords and confirm no lock. The fifth failure must lock until exactly trigger time + 15 minutes.
5. Before that instant, every login is rejected with exact eligible time. At that instant, the first valid credential succeeds within 1 second and failed count/lock clear.
6. Confirm suspension/password reset/reinstatement does not clear an independently unexpired lockout.
7. Submit 30 source-address attempts inside 15 minutes; the 30th is accepted for rate-limit accounting and the 31st is rejected. Confirm exactly one secret-free `rate_limit.entered` event for the limited interval.
8. Confirm unknown email and wrong password responses are equivalent; suspended and locked states use their specified explicit messages.

## Scenario 4 — Team Profiles, Normalization, Privacy, and Performance (US3/US4, SC-004/008/016)

1. As Member, verify `/users` shows every role/status with avatar/default, normalized First Name, Last Name, and Role; full profiles add only present Phone/Slack fields.
2. Verify unauthenticated page and avatar requests reveal no team/profile data.
3. As Member, update own profile with Unicode whitespace/NFC cases, blank optionals, `@Mixed.Handle`, and a valid printable phone. Require exact FR-046–FR-048 normalized persistence on the next read.
4. Exercise every invalid length/character boundary and require linked field errors, focus placement, no partial write, and live announcement.
5. Member editing another user is rejected. Admin management edit succeeds only for a Member. Any Admin-account target, including the acting Admin, is rejected under FR-017.
6. Run 100 production-equivalent profile navigations with 20 users and 10 concurrent authenticated users. Exclude only the first post-deploy cold start, measure navigation until all text/avatar/default is visible, and require at least 95 under 2.0 seconds. Record the cold result separately.

## Scenario 5 — Member State, Promotion, and No Deletion (US5/US6, SC-003/005/006/009/011/015)

For each supported action, start from the rendered user list, count only click/tap/keyboard control activations, and require committed visible success in at most three.

1. Suspend an active Member with multiple sessions. Before Admin success, require status committed and every session/restricted authorization revoked; next login/protected request is denied.
2. Reinstate. Require only status changes; password, lockout, forced-reset flag, profile, avatar, reset history, and canonical email remain identical. Next login respects preserved lockout/forced reset.
3. Promote an active Member while they have valid sessions. Require role committed and those sessions gain Admin access on their next protected request without renewal.
4. Attempt to promote a suspended Member or target any Admin with edit/suspend/demote semantics. Require rejection and at least one active Admin preserved.
5. Race suspend vs promote, reinstate vs promote, and duplicate requests at a transaction barrier. Require one eligible commit, conflict/no-longer-eligible losers, and final state matching FR-050.
6. As Member, invoke every Admin action directly. Require forbidden outcomes with no change.
7. Confirm no delete control, exported action, or HTTP mutation exists. Try crafted DELETE/action calls and compare DB rows, avatar files, sessions, reset records, email ownership, and audit history before/after; require no account/profile deletion.

## Scenario 6 — Self-Service Reset (US7, SC-010/017/018/020)

1. Request reset for known, unknown, active, suspended, mixed-case, and whitespace variants. User-visible text and status are identical; unknown sends no email.
2. Verify link validity starts at accepted request time and ends exactly 60 minutes later; exact-expiry use fails.
3. Issue a second link and require the first to be superseded. Use the second once, then require reuse rejection.
4. Verify clean URL intake, purpose/tamper/nonce-hash checks, no raw token at rest/logs/referrers, and shared password policy.
5. On completion, require password commit, token use, full/restricted session revocation, flow-cookie clearing, and fresh login. Suspension and unexpired lockout remain.
6. Boundary-test 5 canonical-recipient/hour and 20 source/hour independently; final permitted accepts, first excess rejects generically, and each limited-state transition emits one event.
7. Complete an active user's valid flow within 5 minutes after recorded delivery.

## Scenario 7 — Forced Reset Restricted Gate (US5, SC-009/013)

1. Give an active Member multiple sessions and assign forced reset. Before Admin success, require flag committed and all sessions/restricted authorizations revoked.
2. Valid credentials create only a 15-minute `forced_reset` authorization and expose only `/change-password`; all shell/API/avatar routes remain inaccessible.
3. Let authorization reach exact expiry. Require login again while flag stays true.
4. Complete a compliant change. Require password/flag commit, all session/restricted credentials revoked, cookie clearing, and a fresh login within 2 minutes.
5. Repeat while Member is suspended: assignment may persist, but login is rejected before credential validation.
6. Repeat with active lockout: wait until exact lockout expiry before credentials can create the restricted authorization.

## Scenario 8 — Avatar Security, Atomicity, and Private Delivery (US8, SC-008/014/019)

Use fixtures for valid JPEG/PNG, spoofed MIME/extension, corrupt bytes, animated content, embedded active content, metadata, 4096×4096 and 4097×4096 boundaries, 5 MB and over-5 MB inputs, and outputs around 1 MB.

1. Valid input is re-encoded, metadata removed, aspect ratio preserved, output at most 512×512 and 1 MB, and visible on the next directory/profile read.
2. Every invalid input is rejected with a specific safe error before profile commit; prior fields/reference/file remain unchanged.
3. Inject failure during candidate write and during DB commit. Require entire save failure, no changed fields, old avatar visible, and no partial/unreferenced candidate.
4. Inject old-file cleanup failure after successful commit. Require new reference/file remains correct, an operations event is recorded, and reconciliation later removes only the unreferenced old file.
5. Remove avatar; require null reference and default placeholder. Remove again; require successful no-op and no profile change.
6. Unauthenticated avatar GET returns 401. Authenticated GET returns correct fixed type, `nosniff`, and private/no-store caching without filesystem path disclosure.
7. Redeploy/roll back the app container and confirm the named avatar volume and referenced avatar persist.

## Scenario 9 — SMTP Degradation (SC-020)

1. Force SMTP rejection and timeout. Invitation UI must not claim success and must offer safe retry; reset request remains generic.
2. Confirm secret-free operator events/health mark email degraded without recipient/token data.
3. During outage, prove login, logout, profile reads/edits, suspend, reinstate, promote, and non-email forced-reset assignment remain usable.
4. Restore SMTP and confirm email health returns without restarting or corrupting core state.
5. Delay/duplicate accepted messages. Confirm expiry is unchanged, reset remains single-use/supersedable, and concurrent invitations cannot create duplicates.

## Scenario 10 — Accessibility (SC-016)

Run automated scans for every normal, validation-error, success, suspended, locked, rate-limited, degraded-email, invalid-token, and restricted-reset state. Require zero critical/serious findings.

Then manually verify each in-scope page/state for:

- keyboard-only completion and visible focus;
- logical focus order and focus movement after error/navigation/dialog;
- programmatic names, descriptions, required state, and linked field errors;
- screen-reader announcement of errors/status without color dependence;
- modal focus containment/return where applicable;
- 200% zoom/reflow without loss of content or function.

Record browser, assistive technology, viewport, tester, date, and findings. Automated success alone does not satisfy SC-016.

## Scenario 11 — Credential and Logging Inspection (SC-017/018)

Inspect database rows, structured logs, audit rows, analytics payloads, error captures, browser history, response headers, and outbound referrers across all prior scenarios.

Require:

- only hashes for full session, reset nonce, and restricted forced-reset credentials at rest;
- no password, raw token, full token URL, profile value, recipient email, source address, or image bytes in logs/audit;
- wrong-purpose, tampered, expired, used, superseded, and post-registration credentials all rejected;
- every FR-059 boundary accepts final permitted and rejects first excess independently;
- exactly one operator security event on each transition into a continuous limited state.

## Scenario 12 — Coordinated Backup and Restore (FR-062)

1. Create profiles with/without avatars and active/history rows, then run `ops/backup.sh`.
2. Verify one encrypted snapshot manifest references database dump and avatar archive, checksums pass, and retention keeps 30 daily sets.
3. Restore both into an isolated production-like environment with `ops/restore.sh`; never overwrite the source environment.
4. Run `ops/verify-restore.sh`. Require users and referenced files agree, avatars render, and missing-file fixtures use default avatar plus a reported mismatch.
5. Exercise application login/profile/avatar reads after restore.
6. Record the completed restore exercise. Script/unit checks are not a quarterly production-like restore exercise by themselves.

## Completion Evidence

The feature is implementation-ready only after dependency approvals. It is production-ready only when automated tests, production-equivalent performance/accessibility runs, live HTTPS/SMTP behavior, Docker volume persistence, backup creation, and an isolated restore exercise all have recorded passing evidence. Report each category separately; do not infer live/operational readiness from document or fixture checks.
