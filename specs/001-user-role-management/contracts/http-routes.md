# HTTP Route Contracts: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

These Route Handlers exist only where an HTTP response/cookie/stream boundary is required. All mutations remain Server Actions except one-time token intake.

## `GET /auth/invitation?token=<credential>`

**File**: `app/auth/invitation/route.ts`

1. Apply token-validation source limiting for invalid attempts.
2. Authenticate/decrypt AES-256-GCM, require purpose `invitation`, `now < expiresAt`, and FR-049 canonical payload email.
3. Check current canonical email availability without claiming reservation.
4. On valid input, set `invitation_flow` as Secure, HttpOnly, SameSite=Lax, path `/register`, expiring no later than the link; respond with `Referrer-Policy: no-referrer` and redirect `/register`.
5. On failure, set no credential, expose no subtype, and redirect `/register?invalid=true`.

The raw query token is never copied to the redirect, logs, analytics, error payload, or audit event. Final uniqueness is rechecked under lock by `register`.

## `GET /auth/password-reset?token=<credential>`

**File**: `app/auth/password-reset/route.ts`

1. Apply token-validation source limiting for invalid attempts.
2. Authenticate/decrypt, require purpose `password-reset`, validate nonce hash against an unused row, and require `now < expiresAt` and `now < row.expires_at`.
3. Set `password_reset_flow` as Secure, HttpOnly, SameSite=Lax, path `/reset-password`, expiring no later than the reset row; set `Referrer-Policy: no-referrer`; redirect `/reset-password`.
4. Used, superseded, expired, modified, wrong-purpose, or limited input redirects `/reset-password?invalid=true` with no subtype.

The handler does not consume the DB token; the completion transaction does.

## `GET /api/users/[id]/avatar`

**File**: `app/api/users/[id]/avatar/route.ts`

- Call `requireSession()`; unauthenticated response is `401` and contains no profile/file existence detail.
- Validate UUID; load current `users.avatar_key` by user ID.
- Null/missing account returns a bounded not-found response used by the UI default placeholder.
- Resolve the opaque key only beneath `AVATAR_STORAGE_PATH`; reject traversal or non-allowlisted suffix even though keys are server-generated.
- Stream with detected fixed `image/jpeg` or `image/png`, `X-Content-Type-Options: nosniff`, and `Cache-Control: private, no-store`.
- File missing for a referenced key returns the default-avatar outcome and records one bounded operations mismatch event; no filesystem path is exposed.

There is no POST/DELETE avatar Route Handler. Avatar intent is part of `updateProfile` so file and profile fields share one failure boundary.

## `GET /api/health`

**File**: `app/api/health/route.ts`

Returns bounded component state only:

```json
{
  "status": "ok|degraded|unhealthy",
  "database": "ok|unhealthy",
  "email": "ok|degraded",
  "avatarStorage": "ok|unhealthy"
}
```

- Database or avatar-storage failure makes the application unhealthy because core journeys cannot be safe.
- SMTP verification rejection/timeout marks only email as degraded and overall status degraded; non-email traffic remains served.
- No hostname, credential, recipient, filesystem path, SQL text, exception, version secret, or token is returned.
- Docker healthcheck may use core readiness (database + avatar storage) so an SMTP outage does not restart the app or remove core access.

## Common Response Rules

- Credential intake and auth responses never use shared/public caching.
- HTTPS is mandatory in production; `APP_ORIGIN` is an allowlisted configured origin.
- Route logs use fixed route names/status/audit IDs and explicitly drop query strings and cookie/header values.
