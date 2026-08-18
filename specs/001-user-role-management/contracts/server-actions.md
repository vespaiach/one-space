# Server Action Contracts: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

Each Server Action is an independently reachable mutation boundary. It authenticates current state, authorizes, normalizes/validates, applies all relevant rolling limits, commits required DB/file effects, records a bounded audit event, invalidates affected reads, and only then returns success or redirects. Client-supplied role, status, email ownership, avatar paths, session identity, and eligibility are never trusted.

Expected business failures return a discriminated, field-safe result for the UI; secrets, raw exceptions, database rows, and another user's rate-limit/account state are never returned.

## `app/actions/auth.ts`

### `login(formData)`

**Inputs**: `email`, `password`, `rememberMe`.

**Order**:

1. Canonicalize/validate email and bound password input.
2. Apply `login_source` rolling limit (30 accepted attempts / 15 minutes) using the trusted-proxy source pseudonym.
3. Look up the canonical email; use a fixed dummy scrypt hash path for unknown accounts so the generic failure path still performs password work.
4. For a known account, lock the user row and enforce in order: suspension, active lockout (`now < locked_until`), then password verification.
5. At or after `locked_until`, clear the expired lockout/count before evaluating credentials.
6. On failure, atomically increment consecutive failures. The threshold-triggering failure sets `locked_until = now + configured whole minutes` and returns the exact next permitted time. Suspended/actively locked attempts do not increment.
7. On success, clear failure/lockout state.
8. If `force_password_reset=false`, create a full session token/hash with fixed 2-hour or 21-day expiry, set `session`, clear stale auth cookies, and redirect `/users`.
9. If `force_password_reset=true`, revoke full sessions and prior restricted authorizations, create a 15-minute restricted authorization token/hash, set only `forced_reset`, and redirect `/change-password`.

**Errors**: Unknown email/wrong password share one message. Suspension is explicit. Active lockout is explicit with exact eligible time. Source limiting uses a generic bounded response and emits one transition event.

### `logout()`

Read and hash `session`, mark only that row revoked, clear all auth/flow cookies, and redirect `/login`. A missing/invalid cookie is a successful idempotent logout.

### `register(formData)`

**Inputs**: `firstName`, `lastName`, `password`, `confirmPassword`. The invitation credential is read only from `invitation_flow`; email and role are not accepted from the client.

**Preconditions**:

- Flow token decrypts/authenticates; purpose is `invitation`; `now < expiresAt`; payload email satisfies FR-049.
- Names satisfy FR-046; password confirmation and policy pass.
- Invalid token validation applies the `token_validation_source` rolling limit without disclosing the failure subtype.

**Transaction**:

1. Acquire canonical-email advisory lock.
2. Re-check canonical email is unregistered.
3. Insert exactly one active Member with normalized profile and scrypt password hash.
4. Insert a fixed 2-hour full session hash for the new user.
5. Commit before setting cookies or reporting success.

After commit, set `session`, clear `invitation_flow`, and redirect `/users?registered=true`. Unique/conflict losers create no user/profile/session, clear the flow, and receive the same email-in-use result as ordinary post-registration use.

## `app/actions/password.ts`

### `requestPasswordReset(formData)`

**Input**: `email`.

Canonicalize email and independently apply `reset_recipient` (5/hour) and `reset_source` (20/hour) using pseudonymous keys. Every path returns the same generic confirmation.

For a known user under the limits:

1. Lock the user; mark prior unused reset rows used; generate a purpose-bound encrypted 60-minute credential with random nonce; store only the nonce hash.
2. Commit issuance, construct the HTTPS URL from validated `APP_ORIGIN`, and call SMTP.
3. On SMTP acceptance, record success without recipient/token data.
4. On rejection/timeout, mark the new row used when possible and record an operator-visible degraded/failed audit event. Do not expose the failure or account existence to the requester.

Suspended users may receive/use a reset link; resetting does not reinstate them or end an unexpired lockout.

### `completePasswordReset(formData)`

**Inputs**: `password`, `confirmPassword`; credential comes from `password_reset_flow`.

Validate purpose/confidentiality/tamper protection, nonce hash, password policy, and `token_validation_source` failures. In one transaction lock token and user; require unused and `now < expires_at`; update password hash; set `used_at`; revoke all full sessions and forced-reset authorizations; preserve status and unexpired lockout; record audit event. Commit, clear all session/reset cookies, and redirect `/login?reset=true`.

Used, superseded, expired, modified, or wrong-purpose credentials share one safe invalid-link result.

### `completeForcedPasswordReset(formData)`

**Inputs**: `password`, `confirmPassword`; authorization comes from `forced_reset`.

Call `requireForcedReset()`, validate the shared password policy, then lock authorization and user. Require active Member, `force_password_reset=true`, and unconsumed/unrevoked authorization with `now < expires_at`. Atomically update password, clear flag, consume/revoke every restricted authorization, revoke all full sessions, and record audit event. Commit, clear cookies, and redirect `/login?passwordChanged=true`.

Expiry/revocation leaves the flag set and requires credential authentication again. This action never creates a full session.

## `app/actions/invitations.ts`

### `sendInvitation(formData)`

**Input**: `email`.

1. Call `requireAdmin()` and canonicalize email.
2. Independently apply `invite_actor` (20/hour) and `invite_recipient` (5/day) limits.
3. Reject if any active or suspended user owns the canonical email.
4. Generate a fresh AES-256-GCM invitation credential with at least 128 bits of randomness, purpose `invitation`, and expiry exactly seven days after issuance.
5. Construct the HTTPS intake URL from `APP_ORIGIN`; never from request Host.
6. Await SMTP acceptance.
7. Only after acceptance return success and the FR-063 warning that resending does not revoke earlier links. On rejection/timeout, return a retryable Admin-visible failure and record a secret-free operator event.

No invitation row is written. Delivery delay/duplication does not alter credential expiry. No log/audit field contains recipient email, link, or token.

## `app/actions/users.ts`

This module exports no delete action and performs no user-row deletion. A crafted request therefore has no supported mutation target and changes nothing.

### `updateProfile(formData)`

**Inputs**: `targetUserId`, `firstName`, `lastName`, `phoneNumber`, `slackHandle`, `avatarAction=keep|replace|remove`, optional `avatarFile`. Role, status, actor, email, and avatar key are not accepted.

**Authorization**:

- Active Member may edit self.
- Current Admin may edit a current Member.
- Any Member targeting another user and every Admin-account target, including the acting Admin, is rejected under FR-011/017.

**Processing and commit**:

1. Authenticate and perform a current-row eligibility check before image decoding.
2. Normalize/validate all profile fields.
3. For `replace`, require one JPEG/PNG input at most 5 MB, decode content, reject mismatch/animation/active content/dimensions over 4096×4096, re-encode without metadata within 512×512 and 1 MB, and durably stage an immutable candidate outside the web root.
4. Begin transaction; acquire target account-state lock; lock user row; repeat authorization/eligibility against current state.
5. Update all profile fields and avatar reference together. `remove` with no avatar is a no-op. Commit and record audit event before success.
6. On any pre-commit failure, delete candidate and preserve every prior field/file. After commit, delete old file; cleanup failure records an operations event for reconciliation but does not roll back the already-correct new reference.
7. Invalidate directory and target profile reads; redirect `/users/[id]?updated=true`.

### `suspendUser(formData)`

**Input**: `targetUserId`.

Require current Admin. In an account-state transaction lock/re-read target; require current Member and active status; preserve active-Admin invariant; set suspended; revoke all full sessions and restricted forced-reset authorizations; preserve password, profile/avatar, reset history, canonical email, lockout, and forced-reset flag; record audit event; commit; then report success. Concurrent/no-longer-eligible requests return conflict without partial changes.

### `reinstateUser(formData)`

Require current Admin. Lock/re-read target; require current suspended Member; change only status to active; preserve password, sessions history, lockout, forced-reset flag, profile/avatar, reset history, and canonical email; record and commit. No session is created. The next credential login succeeds only if lockout/forced reset independently permits it.

### `promoteToAdmin(formData)`

Require current Admin. Lock/re-read target; require current active Member; preserve active-Admin invariant; set role Admin; preserve every full session; record and commit. Existing valid sessions gain Admin rights on their next protected request because guards read current role. A suspended or concurrently changed target is rejected.

### `forcePasswordReset(formData)`

Require current Admin. Lock/re-read target; require current Member (active or suspended); set flag true; revoke all full sessions and restricted authorizations before success; preserve status, password, profile/avatar, canonical email, and unexpired lockout; record and commit. A suspended Member remains unable to authenticate; an active locked Member must wait until the exact lockout end.

## Cache, Redirect, and Audit Rules

- Mutations invalidate/refresh affected user list/profile data before redirecting; success always corresponds to committed state.
- Audit insertion for security-sensitive DB mutations occurs in the same transaction as the mutation. SMTP/file-cleanup outcomes that happen outside the DB transaction receive their own bounded operations event.
- Audit fields are limited to category/action/outcome, actor ID, target ID, reason code, timestamp, and generated audit ID. No free-form user data or credential enters them.
- Redirect destinations are fixed or validated relative paths; no action redirects to client-supplied origins.
