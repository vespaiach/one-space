# Research: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 0 | **Date**: 2026-08-18

## 1. Next.js 16 Request Boundaries

**Decision**: Use root `proxy.ts` only for fast cookie-presence redirects. Every protected Server Component, Server Action, and Route Handler calls an authoritative guard that hashes the cookie token, loads the session and current user row, and checks expiry, revocation, status, role, and forced-reset state.

**Rationale**: The installed Next.js 16.3 documentation says Proxy runs before routes and should not be treated as the only Server Function security boundary. Server Actions are reachable POST endpoints and must authenticate, authorize, and validate internally. `cookies()` is asynchronous. Server Actions provide origin/host CSRF checks and a configurable request-body limit, so the complete profile plus optional 5 MB avatar can remain one mutation.

**Alternatives considered**:

- Database authorization in Proxy: rejected because it adds a DB round trip to every matched request and still cannot replace checks inside callable Server Actions.
- UI-only role gating: rejected because hidden controls do not prevent crafted requests.
- Separate avatar mutation: rejected because it cannot satisfy the profile/avatar all-or-nothing behavior in FR-061.

**Local references**: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, and `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`.

## 2. Startup Bootstrap

**Decision**: Call an idempotent `ensureInitialAdmin()` from root `instrumentation.ts` when `NEXT_RUNTIME` is Node.js. It acquires a PostgreSQL transaction-level bootstrap lock and completes before the Next.js server becomes ready.

**Rationale**: Next.js 16 calls async `instrumentation.register()` once per server instance and waits for it before accepting requests. Inside one transaction, bootstrap distinguishes exactly three states: empty database (validate config and insert one Admin), any active Admin (no-op regardless of config), and non-empty database with no active Admin (throw a recovery error). The transaction lock prevents duplicate Admins if startup is invoked concurrently.

**Alternatives considered**:

- Seed command run manually: rejected because FR-002/043 require failure before traffic, not an optional operator step.
- Create or update Admin on every deployment: rejected because it would rotate or overwrite existing identity data contrary to FR-042/044.
- Add a TypeScript script runner: rejected because it introduces another runtime dependency and still needs deployment wiring.

**Local reference**: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md`.

## 3. Sessions and Current-Data Authorization

**Decision**: Generate 32 random bytes per full session, place the 64-character hex token only in a `Secure; HttpOnly; SameSite=Lax; Path=/` cookie, and store only `SHA-256(rawToken)` in PostgreSQL. Standard sessions expire exactly 2 hours after creation and Remember Me sessions exactly 21 days after creation; neither slides.

**Rationale**: A DB-backed opaque token supports per-session and all-session revocation without copying role/status into an unrevocable credential. Joining the current user row on every protected boundary makes promotion visible to existing sessions while suspension and password changes can revoke sessions before reporting success.

**Alternatives considered**:

- JWT role claims: rejected because claims would be stale after promotion/status changes and immediate revocation would require a database denylist.
- Raw tokens in the database: rejected by FR-057.
- Redis: rejected because PostgreSQL is sufficient for the stated single-instance, 20-user scale.

## 4. Link Credentials and URL Scrubbing

**Decision**: Invitation links carry AES-256-GCM ciphertext containing canonical email, purpose, issued time, and exact expiry. Password-reset links use the same confidentiality/tamper-detection envelope plus a random nonce whose hash is stored in `password_reset_tokens`. Email links target Route Handlers, not pages. After validation, the handler sets a short-lived `Secure; HttpOnly; SameSite=Lax` flow cookie and redirects to a clean page URL without the token.

**Rationale**: AES-GCM provides a purpose-bound confidential payload and integrity. A Route Handler can set cookies before redirecting, and a `Referrer-Policy: no-referrer` response plus immediate redirect prevents the raw token from remaining in browser history, application logs, analytics, or outbound referrers. Reset rows provide single-use and supersession; invitation registration remains stateless but database canonical-email uniqueness selects one concurrent winner.

**Alternatives considered**:

- Render forms directly at `?token=` URLs: rejected because the credential remains browser-visible after intake.
- Signed plaintext invitation: rejected because the canonical email would be exposed in the URL.
- Invitation table: rejected because the specification intentionally requires stateless invitations and documents non-revocation.

**Security reference**: [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

## 5. Password Hashing and Login Lockout

**Decision**: Use asynchronous Node.js `crypto.scrypt` with a unique 32-byte salt and encoded parameters. Select the OWASP-listed `N=2^15, r=8, p=3` profile, a 64-byte output, and an explicit safe `maxmem`; compare derived keys with `timingSafeEqual`. Benchmark the target container and increase work without falling below this profile. Login lockout remains DB-backed with configurable positive threshold (default 5) and whole-minute duration (default 15).

**Rationale**: scrypt is built into Node.js and avoids a password-hashing dependency. The selected profile meets current OWASP minimum guidance while using less peak memory than the `N=2^17, p=1` alternative on the single application container. Parameters are stored with each hash so future upgrades can rehash after a successful login.

**Alternatives considered**:

- Existing `N=2^14, r=8, p=1`: rejected because it is below current OWASP-listed scrypt profiles.
- Argon2id: strong first choice but rejected here because Node.js does not provide it and the constitution requires dependency minimization.
- bcrypt: rejected because it adds a dependency and has a 72-byte input limitation.

**Security reference**: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

## 6. Forced-Reset Authorization

**Decision**: Assigning forced reset sets `users.force_password_reset = TRUE` and revokes full sessions plus any restricted authorizations in one transaction. A later successful credential login does not create a full session; it creates a 15-minute opaque restricted authorization in a separate HttpOnly cookie/table and redirects to `/change-password`. Completion atomically updates the password, clears the flag, consumes/revokes all restricted authorizations and full sessions, clears cookies, and requires a fresh login.

**Rationale**: A distinct credential makes the permitted surface explicit and prevents a role-bearing full session from reaching other features. Persisting only its hash provides expiry and revocation without storing the raw credential.

**Alternatives considered**:

- Full session with a boolean UI redirect: rejected because a missed guard would expose the application.
- Password-reset email token: rejected because forced reset begins after credential authentication and must work without email.

## 7. Canonicalization and Validation

**Decision**: Implement dependency-free, shared server functions for FR-046–FR-049 and call them at every boundary before lookup or persistence. PostgreSQL stores canonical lowercase email under a unique constraint; registration additionally uses a transaction-level advisory lock derived from the canonical email before checking/inserting.

**Rationale**: One canonicalizer prevents invitation/login/reset inconsistencies. JavaScript supports Unicode NFC normalization and Unicode property escapes; bounded allowlists can be implemented without a schema library. The unique constraint is the final concurrency authority, while the advisory lock produces deterministic loser behavior before any profile/session side effect.

**Alternatives considered**:

- Provider-specific email alias rewriting: rejected by FR-049.
- Validation only in components: rejected because requests can bypass the UI.
- New schema-validation package: rejected because the bounded rules are straightforward and dependency minimization applies.

## 8. Atomic Account-State Mutations

**Decision**: Suspension, reinstatement, promotion, and forced-reset assignment execute in PostgreSQL transactions that acquire an account-state advisory lock, lock the target row `FOR UPDATE`, re-read current role/status, and apply exactly one eligible transition. Bootstrap and state changes also serialize the active-Admin invariant.

**Rationale**: Authorization from current state plus row/advisory locks makes concurrent outcomes deterministic. A promotion that commits first makes later Member-only actions fail; a suspension that commits first makes later promotion fail. Success is returned only after commit and required session revocation.

**Alternatives considered**:

- Read then update outside a transaction: rejected because concurrent requests can both act on stale state.
- Process-local mutex: rejected because it is lost on restart and does not coordinate multiple processes.

## 9. Rolling Abuse Limits and Audit Events

**Decision**: Store accepted attempts in `rate_limit_events`, active limited-state metadata in `rate_limit_states`, and operator-visible outcomes in `audit_events`. Each limit uses an independent scope/key. Canonical email and source address keys are HMAC-SHA-256 pseudonyms using `RATE_LIMIT_HASH_KEY`; actor UUIDs may be used directly. A transaction-level advisory lock serializes each scope/key, counts only events within the exact rolling interval, accepts the final permitted request, and rejects the first excess request.

**Rationale**: Event timestamps implement true rolling windows without Redis. `rate_limit_states` records `limited_until` so exactly one secret-free transition event is emitted per continuous limited state. Independent keys prevent a combined IP/email key from weakening either limit. Old events are pruned after the longest required window plus a safety margin.

**Alternatives considered**:

- Fixed-window counters: rejected because boundary bursts violate rolling-limit semantics.
- In-memory counters: rejected because restart loses enforcement.
- Raw email/IP in events and logs: rejected by FR-058–FR-060.

**Security reference**: [OWASP Bot Management and Anti-Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html).

## 10. SMTP Delivery and Degraded Health

**Decision**: Use approved Nodemailer SMTP transport. Invitation success is returned only after the SMTP service accepts the message. Password-reset requests always return the same generic response; delivery failure produces a secret-free operator audit event but no account-disclosing response. Email exceptions are caught inside email actions and do not affect login, logout, profiles, or account-state actions. `/api/health` reports the app/database as healthy while marking email capability degraded.

**Rationale**: SMTP avoids provider coupling. Separating capability health prevents an email outage from taking the application offline. Events identify action/outcome and actor/target IDs when available, never recipient addresses or credentials.

**Alternatives considered**:

- Hosted provider SDK: rejected because an SMTP service already exists and would need separate approval.
- Report invitation success before send completion: rejected by FR-052.
- Fail the global health check on SMTP degradation: rejected because FR-053 requires non-email journeys to remain available.

## 11. Avatar Processing and Atomic Save

**Decision**: Add direct `sharp` only after GOV-003 approval. The profile Server Action treats avatar intent as `keep`, `remove`, or `replace`. For replacement it checks the 5 MB transport limit, decodes bytes, rejects unsupported/animated/oversized dimensions, normalizes orientation, strips metadata by re-encoding, preserves aspect ratio within 512×512, and rejects output above 1 MB. It writes an immutable random candidate name to `AVATAR_STORAGE_PATH`, fsyncs it, then locks and updates the user profile/avatar reference in one DB transaction. On transaction failure it deletes the candidate; after commit it deletes the previous file. A reconciler removes old unreferenced candidates after a safety interval.

**Rationale**: Re-encoding is required to validate decoded content and remove injected/metadata content. Files remain outside the web root and are served only through an authenticated Route Handler with private caching. Immutable filenames avoid destructive overwrite before commit.

**Alternatives considered**:

- Trust MIME or extension: rejected because both are attacker-controlled.
- Write to `public/avatars`: rejected because public files bypass authentication and release replacement can erase them.
- Reuse Next.js's transitive `sharp`: rejected because undeclared transitive imports are not a stable dependency contract.
- Object storage: rejected by scope and single-server assumptions.

**Security reference**: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## 12. Backup and Restore

**Decision**: Compose mounts a named avatar volume outside release directories. Daily operations create an encrypted PostgreSQL dump and encrypted avatar archive under one snapshot manifest, verify checksums, retain 30 days, and only then mark the set complete. Restore requires both artifacts, restores them to an isolated production-like environment, checks every DB avatar reference, reports missing/orphan files, and verifies default-avatar fallback. A real restore exercise is recorded quarterly.

**Rationale**: A shared manifest gives the closest practical consistency point without adding distributed storage. The restore verifier makes mismatches visible rather than silently serving broken paths.

**Alternatives considered**:

- Database-only backup: rejected because avatar references would not be restorable.
- Backing up the application release directory: rejected because avatar storage must survive deploy and rollback independently.
- Claiming readiness from scripts alone: rejected because FR-062 requires an exercised restore.

## 13. Accessibility Validation

**Decision**: Add test-only `axe-core` only after GOV-004 approval and run it against every in-scope rendered page/state. Keep Testing Library tests for names, descriptions, error links, live regions, and focus placement. Execute manual keyboard-only, focus-order, screen-reader announcement, 200% zoom/reflow, and error-identification checks using the quickstart matrix.

**Rationale**: A rules engine supplies the critical/serious severity classification required by SC-016, while manual checks cover interactions and announcements that automated DOM analysis cannot prove.

**Alternatives considered**:

- Automated scan only: rejected because it cannot prove keyboard flow or screen-reader behavior.
- Hand-written DOM assertions only: rejected because they do not constitute a comprehensive WCAG findings engine.

## 14. Test and Performance Strategy

**Decision**: Use Vitest for unit/component/integration tests and a real isolated PostgreSQL database for transaction, uniqueness, session, rate-limit, and recovery behavior. Use a browser harness for the 100-navigation production-equivalent SC-004 measurement and accessibility manual run. Use fake clocks for expiry boundaries, deterministic SMTP fixtures for acceptance/rejection/timeout/duplicate cases, fault injection around avatar staging/commit, and executable operations scripts for backup/restore.

**Rationale**: The highest-risk requirements are persistence and boundary semantics; mocks cannot prove PostgreSQL locking, uniqueness, rollback, or file/DB coordination. Performance and accessibility outcomes require rendered-browser evidence.

**Alternatives considered**:

- Database mocks for integration tests: rejected because they cannot reproduce transaction conflicts.
- Unit-only validation of backup scripts: rejected because it does not prove restore recovery.

## Resolved Unknowns and Remaining Governance Gates

All technical unknowns are resolved. No `NEEDS CLARIFICATION` marker remains.

Implementation is constitutionally blocked only on the explicit approvals below:

- GOV-003: direct `sharp` runtime dependency
- GOV-004: `axe-core` test dependency
- GOV-005: `@types/nodemailer` development dependency

These are approval gates, not unresolved architecture decisions; the selected alternatives and containment are documented above and in [governance.md](governance.md).
