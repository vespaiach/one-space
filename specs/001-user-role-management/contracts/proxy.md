# Proxy Contract: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

Next.js 16 uses root `proxy.ts` and a named `proxy()` export in the Node.js runtime. Proxy is a fast routing layer, not the session or authorization authority.

## Cookie Names

| Cookie | Purpose | Proxy interpretation |
|--------|---------|----------------------|
| `session` | Full authenticated session raw token | Presence hint for protected/auth route routing |
| `invitation_flow` | Scrubbed invitation credential | Presence hint for `/register` only |
| `password_reset_flow` | Scrubbed self-service reset credential | Presence hint for reset form only |
| `forced_reset` | Restricted forced-reset raw token | Presence hint for `/change-password` only |

All cookies are Secure, HttpOnly, SameSite=Lax, and path-limited to the narrowest useful path. Proxy never decrypts, hashes, queries, or trusts their contents.

## Route Classification

| Route | Cookie-presence behavior |
|-------|--------------------------|
| `/login` | Always continue; the page validates any cookies against PostgreSQL before redirecting |
| `/register` | Continue only when `invitation_flow` exists; otherwise render/redirect to invalid invitation state |
| `/reset-password` | Always continue; page selects request or completion state from validated flow |
| `/change-password` | Continue only when `forced_reset` exists; otherwise redirect `/login` |
| `/auth/invitation`, `/auth/password-reset` | Always continue so Route Handler can validate/scrub token |
| `/users/:path*`, `/admin/:path*` | Missing full cookie -> `/login?from=<safe relative path>`; otherwise continue |
| `/api/users/:id/avatar` | Missing full cookie -> JSON `401`; otherwise continue |
| `/api/health` | Continue; Route Handler exposes only bounded health data |
| `/_next/static/:path*`, `/_next/image/:path*`, favicon/static shell assets | Skip Proxy |

There is no public `/avatars` path. Avatar files are outside `public` and cannot be excluded as static assets.

## Matcher

The constant matcher includes application pages, Server Action host routes, auth token-intake routes, and protected APIs while excluding only framework/static shell assets. Changes to page placement must be accompanied by Proxy coverage tests because Server Actions are POSTs to the page route where they are used.

## Authoritative Guards

### `getSession()`

1. Read `session` via `await cookies()`.
2. Hash the raw value with SHA-256.
3. Query `sessions JOIN users` for matching hash, `revoked_at IS NULL`, and `expires_at > now`.
4. Read current user role, status, and forced-reset flag from the joined row.
5. If missing/expired/revoked, return null. Server Components do not mutate cookies; the next Server Action/Route Handler overwrites or clears stale values.
6. If suspended, revoke the session if needed and return the explicit suspended outcome only to the login boundary; protected boundaries return unauthenticated.
7. If forced reset is true, revoke the full session and deny full access. The credential-authentication action later clears the stale cookie and creates only a restricted authorization.
8. Return a constrained context containing IDs and current authorization state; never return password/token/profile secrets.

### `requireSession()`

Calls `getSession()`. On null, protected pages redirect to `/login`; Server Actions/Route Handlers return a bounded unauthorized result. It is called at the top of every protected page, action, and avatar handler.

### `requireAdmin()`

Calls `requireSession()` and checks the current joined role. A Member receives a bounded forbidden result/redirect. Promotion therefore affects existing valid sessions on their next request without session replacement.

### `requireForcedReset()`

Reads and hashes only the `forced_reset` cookie, joins `forced_reset_authorizations` to current `users`, and requires unconsumed/unrevoked/unexpired authorization, active Member status, and `force_password_reset=true`. It authorizes only `/change-password` and `completeForcedPasswordReset`.

## Security Headers and Token Hygiene

- Token-intake responses set `Referrer-Policy: no-referrer`, the narrow flow cookie, and an immediate clean-URL redirect.
- Protected pages and avatar responses use private/no-store caching as appropriate.
- Proxy logging, errors, and redirects never copy query strings containing credentials. The `from` parameter is a validated same-origin relative path without sensitive query data.
- Every Server Action independently authenticates, authorizes, validates, and rate-limits; Proxy coverage is defense in depth only.
