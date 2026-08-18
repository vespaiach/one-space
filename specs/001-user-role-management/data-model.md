# Data Model: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

## Entity Overview

| Entity | PostgreSQL table | Purpose |
|--------|------------------|---------|
| User Account + Profile | `users` | Canonical identity, password hash, current authorization state, profile, and avatar reference |
| Authenticated Session | `sessions` | Fixed-expiry, revocable full-session token hashes |
| Password-Reset Link | `password_reset_tokens` | Single-use, supersedable email-reset credential hashes |
| Forced-Reset Authorization | `forced_reset_authorizations` | Fifteen-minute restricted password-change credential hashes |
| Rate-Limit Event | `rate_limit_events` | Accepted attempts used for exact rolling-window counts |
| Rate-Limit State | `rate_limit_states` | Current limited interval and one-event-per-transition state |
| Audit Event | `audit_events` | Secret-free security, administrative, and operational outcomes |

Invitation links deliberately have no table. They are AES-256-GCM credentials containing canonical email, purpose, issuance time, and seven-day expiry. Registration validity depends on cryptographic verification plus the current unique canonical email in `users`.

Avatar bytes deliberately do not live in PostgreSQL. `users.avatar_key` points to an immutable file under the private durable avatar volume.

## `users`

One row combines account and profile because both have the same lifecycle and account deletion is prohibited.

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Stable account identifier |
| `email` | `varchar(254)`, unique, not null | FR-049 canonical lowercase email; immutable after creation |
| `password_hash` | text, not null | Versioned scrypt string containing algorithm parameters, salt, and derived key |
| `role` | `admin \| member`, not null | Current role; default `member` |
| `status` | `active \| suspended`, not null | Current access state; default `active` |
| `first_name` | `varchar(100)`, not null | FR-046 normalized first name |
| `last_name` | `varchar(100)`, not null | FR-046 normalized last name |
| `phone_number` | `varchar(50)`, nullable | FR-047 normalized printable free text; blank becomes null |
| `slack_handle` | `varchar(80)`, nullable | FR-048 normalized lowercase handle without leading `@`; blank becomes null |
| `avatar_key` | text, nullable | Server-generated immutable file key; never a client path |
| `force_password_reset` | boolean, not null, default false | Admin-assigned restricted-login requirement |
| `failed_login_attempts` | positive integer, not null, default 0 | Consecutive credential failures outside an active lockout |
| `locked_until` | timestamptz, nullable | Exact instant another login attempt becomes eligible |
| `created_at` | timestamptz, not null | Creation time |
| `updated_at` | timestamptz, not null | Last committed account/profile mutation |

**Indexes**: unique `email`; secondary `(role, status)` for active-Admin checks; optional name ordering index if measurement shows it is needed.

### Validation

- Email uses one shared FR-049 canonicalizer before every invitation, token construction, registration, login, reset request, and lookup. Database uniqueness is over the canonical value.
- Names trim Unicode whitespace, normalize NFC, collapse internal whitespace, permit only letters/marks/spaces/apostrophes/periods/hyphens, and contain 1–100 Unicode characters.
- Phone trims Unicode whitespace, normalizes NFC, stores blank as null, and otherwise contains 1–50 printable non-control Unicode characters.
- Slack handle trims, removes one optional leading `@`, lowercases ASCII, stores blank as null, and otherwise matches 1–80 characters from `[a-z0-9._-]`.
- Password input is 8–128 characters and satisfies the specification's uppercase, lowercase, digit, and printable-special requirements. Persistence stores only a salted scrypt hash.
- Role and status constraints are enforced both in PostgreSQL and in transition-specific application functions.

### State Transitions

```text
status: active -> suspended -> active
role: member -> admin
force_password_reset: false -> true -> false
lockout: eligible -> threshold failure / locked_until -> eligible at locked_until
avatar_key: null or old immutable key -> new immutable key or null
```

- Suspension, reinstatement, promotion, and forced-reset assignment accept Members only and run under the account-state transaction protocol.
- Promotion requires `status=active`, preserves full sessions, and becomes visible because each authorization check joins current `users.role`.
- Suspension commits status and revokes full sessions before success. Reinstatement changes only status and preserves password, lockout, forced-reset flag, and history.
- Password changes update the hash, revoke full sessions, and require a fresh login.
- No application module exports a user deletion operation. All dependent foreign keys use `ON DELETE RESTRICT` as defense in depth.

## `sessions`

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Session row identifier |
| `token_hash` | `char(64)`, unique, not null | SHA-256 of the 32-byte raw cookie token |
| `user_id` | UUID FK `users.id`, restrict, not null | Owning user |
| `expires_at` | timestamptz, not null | Fixed 2-hour or 21-day expiry |
| `revoked_at` | timestamptz, nullable | Null while active; set on logout/security revocation |
| `created_at` | timestamptz, not null | Session creation time |

**Indexes**: unique `token_hash`; `(user_id, revoked_at)` for all-session revocation; `expires_at` for pruning.

**Valid session predicate**: token hash matches, `revoked_at IS NULL`, and `expires_at > now`. The query joins `users` and returns current role/status/forced-reset values. A suspended user or forced-reset user cannot receive ordinary protected access even if a stale session row has not yet been pruned.

**Transitions**: create active; revoke current on logout; revoke all on suspension, forced-reset assignment, and any password change/reset. Expiry is fixed and never renewed.

## `password_reset_tokens`

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Reset record identifier |
| `user_id` | UUID FK `users.id`, restrict, not null | Target account |
| `token_hash` | `char(64)`, unique, not null | SHA-256 of the random nonce carried inside the encrypted link credential |
| `expires_at` | timestamptz, not null | Exactly request acceptance time plus 60 minutes |
| `used_at` | timestamptz, nullable | Set on successful reset or supersession |
| `created_at` | timestamptz, not null | Request acceptance / validity start time |

**Indexes**: unique `token_hash`; `(user_id, used_at, expires_at)` for supersession and validation.

**Issuance transaction**: lock the user, mark every unused prior row used, insert the new row, and then attempt delivery. If delivery fails, the row remains unusable by anyone without the undelivered raw credential and the operator receives a secret-free failure event. The user-facing response remains generic.

**Completion transaction**: lock token and user; require unused and `now < expires_at`; update password; set `used_at`; revoke all full sessions and forced-reset authorizations; commit; clear flow cookie. Suspension and any unexpired login lockout remain unchanged.

## `forced_reset_authorizations`

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Restricted authorization identifier |
| `user_id` | UUID FK `users.id`, restrict, not null | Member required to change password |
| `token_hash` | `char(64)`, unique, not null | SHA-256 of the raw restricted cookie token |
| `expires_at` | timestamptz, not null | Creation time plus exactly 15 minutes |
| `consumed_at` | timestamptz, nullable | Set after successful password change |
| `revoked_at` | timestamptz, nullable | Set when replaced, suspended, or reassigned |
| `created_at` | timestamptz, not null | Authorization creation time |

**Indexes**: unique `token_hash`; `(user_id, consumed_at, revoked_at, expires_at)`.

**Valid restricted predicate**: hash matches, not consumed/revoked, not expired, current user is active and still has `force_password_reset=true`. It authorizes only the change-password page/action.

## `rate_limit_events`

Each accepted counted attempt is one row. Rejected excess attempts are not appended, so an attacker cannot extend the rolling interval by continuing to retry.

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Event identifier |
| `scope` | enum/text allowlist | `login_source`, `invite_actor`, `invite_recipient`, `reset_recipient`, `reset_source`, or `token_validation_source` |
| `key_hash` | `char(64)`, not null | HMAC-SHA-256 pseudonym for source/recipient, or stable actor-derived key |
| `occurred_at` | timestamptz, not null | Accepted attempt time |

**Index**: `(scope, key_hash, occurred_at)` supports exact rolling counts and pruning.

| Scope | Limit | Rolling interval |
|-------|-------|------------------|
| `login_source` | 30 | 15 minutes |
| `invite_actor` | 20 | 1 hour |
| `invite_recipient` | 5 | 24 hours |
| `reset_recipient` | 5 | 1 hour |
| `reset_source` | 20 | 1 hour |
| `token_validation_source` | 30 | 15 minutes |

Every applicable scope is checked independently. The request proceeds only when all required scopes accept it.

## `rate_limit_states`

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `scope` + `key_hash` | composite primary key | One current state per limit key |
| `limited_until` | timestamptz, not null | Earliest instant the rolling count may fall below the limit |
| `event_emitted_at` | timestamptz, nullable | Marks that the current transition event was emitted |
| `updated_at` | timestamptz, not null | Last state evaluation |

Under a scope/key advisory transaction lock, the limiter deletes expired events, counts the rolling interval, appends the final permitted event, or rejects the first excess attempt. Entering a new limited interval inserts exactly one `audit_events` row; repeated denials before `limited_until` emit no duplicate transition event.

## `audit_events`

| Field | Type / constraint | Meaning |
|-------|-------------------|---------|
| `id` | UUID primary key | Audit identifier |
| `category` | `security \| administration \| operations` | Event audience |
| `action` | allowlisted text | Example: `member.suspend`, `email.invitation`, `rate_limit.entered` |
| `outcome` | allowlisted text | `succeeded`, `rejected`, `conflict`, `degraded`, or `failed` |
| `actor_id` | UUID FK `users.id`, restrict, nullable | Authenticated actor when applicable |
| `target_id` | UUID FK `users.id`, restrict, nullable | Registered target when applicable |
| `reason_code` | allowlisted text, nullable | Secret-free machine-readable reason |
| `occurred_at` | timestamptz, not null | Commit/event time |

No raw/canonical email, source address, token, password, phone, Slack handle, profile value, image content, file path, or free-form exception payload is allowed. Runtime logs may emit the audit ID and the same allowlisted fields.

## Private Avatar Storage

`AVATAR_STORAGE_PATH` points to a durable volume outside `.next`, `public`, and release directories. Stored names are server-generated immutable keys such as `<uuid>.jpg` or `<uuid>.png`; no user filename or path segment is retained.

Replacement protocol:

1. Bound transport at just over 5 MB and reject an input over 5 MB.
2. Decode content; reject invalid, mismatched, animated, active, or over-4096×4096 input.
3. Normalize orientation, remove metadata through re-encoding, resize within 512×512 preserving aspect ratio, and require output at most 1 MB.
4. Write and fsync a new immutable candidate on the durable volume.
5. Begin DB transaction, lock target user, re-authorize current actor/target state, validate all profile values, update fields and `avatar_key`, then commit.
6. If validation/write/commit fails, delete the candidate and preserve the old row/file. After commit, delete the previous file. If cleanup fails, record an operations event and let reconciliation remove the unreferenced file later.

Removal of a null avatar is a successful no-op. Avatar reads resolve the current key from the DB and stream through an authenticated Route Handler with `Cache-Control: private, no-store` and a detected fixed `Content-Type`.

## Transaction and Concurrency Rules

| Workflow | Serialization / invariant |
|----------|---------------------------|
| Initial Admin bootstrap | Global bootstrap advisory lock; empty inserts exactly one; active Admin no-op; non-empty/no active Admin fails |
| Invitation registration | Canonical-email advisory lock plus unique `users.email`; winner creates one user and session, while a loser creates neither |
| Suspend/reinstate/promote/force reset | Account-state advisory lock plus target `FOR UPDATE`; eligibility re-read inside transaction |
| Active-Admin invariant | Global account-state lock and current `(role,status)` count in bootstrap and relevant state mutations |
| Reset issuance | User row lock; prior unused reset rows superseded before new insert |
| Reset/forced-reset completion | Credential and user locks; password, flags, credential consumption, and session revocation commit together |
| Profile/avatar save | Target row lock; all profile fields and avatar reference commit together after durable candidate write |
| Rate-limit evaluation | Scope/key advisory lock; exact rolling count and state/audit transition commit together |

## Retention and Cleanup

- User/profile data and canonical-email ownership are retained indefinitely while the account exists; application deletion is unsupported.
- Expired/revoked sessions, used reset credentials, consumed restricted authorizations, and rate-limit events are pruned by an idempotent maintenance job after their operational/audit need ends.
- `audit_events` retention is an operator policy; records contain only the bounded fields above.
- Unreferenced avatar candidates older than the safety interval are reconciled and removed; referenced files are never removed by the reconciler.
- Daily encrypted PostgreSQL/avatar snapshot sets are retained for 30 days. A quarterly production-like restore verifies checksums, references, missing-file fallback, and operator reporting.

## Environment and Deployment Inputs

| Variable | Requirement / use |
|----------|-------------------|
| `DATABASE_URL` | Required PostgreSQL connection |
| `DATABASE_URL_TEST` | Required isolated integration-test database |
| `APP_ORIGIN` | Required validated HTTPS origin used to build email links; never derive from `Host` |
| `TOKEN_ENCRYPTION_KEY` | Required 32-byte secret for AES-256-GCM link credentials |
| `RATE_LIMIT_HASH_KEY` | Required secret for HMAC pseudonyms/advisory keys |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Stable self-hosted Next.js Server Action key |
| `LOGIN_MAX_ATTEMPTS` | Positive integer; default `5` |
| `LOGIN_LOCKOUT_MINUTES` | Positive whole minutes; default `15` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Required SMTP configuration; default port `587` |
| `SMTP_USER`, `SMTP_PASS` | Optional only as a pair when the SMTP service requires authentication |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Required and validated only when `users` is empty |
| `INITIAL_ADMIN_FIRST_NAME`, `INITIAL_ADMIN_LAST_NAME` | Required FR-046 profile values only when `users` is empty |
| `AVATAR_STORAGE_PATH` | Required writable durable-volume path; must not be under `public` or release directories |
| `BACKUP_ENCRYPTION_KEY_FILE` | Required by operations backup/restore scripts, not exposed to the browser |

Compose must mount the avatar volume at `AVATAR_STORAGE_PATH`, keep the app reachable only through Traefik, and keep PostgreSQL on the internal network in production. Migration execution remains an explicit deployment prerequisite before application startup/bootstrap.
