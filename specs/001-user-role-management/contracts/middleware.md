# Middleware Contract: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

## Overview

`src/middleware.ts` enforces route-level access control. It runs in the **Edge runtime** — it cannot use `pg` or any Node.js built-in that the Edge runtime does not support. Its role is limited to:

1. Checking for the presence of the session cookie (not validating it against the DB)
2. Redirecting unauthenticated requests to `/login`
3. Redirecting authenticated requests away from auth pages

Full DB session validation (checking `is_revoked`, `expires_at`, user status) is the responsibility of `getSession()` in `src/lib/auth/session.ts`, called inside Server Components and Server Actions.

---

## Route Classification

| Pattern | Route Group | Middleware Behavior |
|---------|-------------|---------------------|
| `/login`, `/register`, `/reset-password`, `/change-password` | `(auth)` — public | Skip auth check. If session cookie is present, redirect to `/users`. |
| `/users/*`, `/admin/*` | `(shell)` — protected | If no session cookie, redirect to `/login`. |
| `/api/avatar` | API — protected | If no session cookie, return `401 Unauthorized`. |
| `/_next/*`, `/avatars/*`, `favicon.ico` | Static | Always skip — no auth check. |

---

## Matcher Configuration

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|avatars/).*)',
  ],
};
```

The matcher excludes Next.js internals and the `public/avatars/` static path. All other routes are processed by the middleware function.

---

## Middleware Logic

```
function middleware(request: NextRequest):
  path = request.nextUrl.pathname

  if path matches static exclusions:
    return NextResponse.next()

  sessionCookie = request.cookies.get('session')
  isAuthRoute = path starts with /login, /register, /reset-password, /change-password

  if isAuthRoute:
    if sessionCookie exists:
      redirect to /users
    else:
      return NextResponse.next()

  // Protected route
  if sessionCookie is absent:
    if path starts with /api/:
      return 401 JSON response
    else:
      redirect to /login?from=<encoded-path>
  else:
    return NextResponse.next()
    // DB validation happens in getSession() inside the Server Component/Action
```

---

## `getSession()` Contract

**File**: `src/lib/auth/session.ts`

**Called from**: All protected Server Components (at the top, before rendering) and all authenticated Server Actions (at the top, before any mutation).

**Behavior**:
1. `const cookieStore = await cookies()` — async in Next.js 15
2. `const token = cookieStore.get('session')?.value`
3. If no token → return `null`
4. Query `sessions JOIN users` WHERE `session_token = token AND is_revoked = FALSE AND expires_at > NOW()`
5. If no row → return `null` (session expired or revoked)
6. If `user.status = 'suspended'` → revoke the session, clear the cookie, return `null`
7. Return `{ userId, email, role, forcePasswordReset, ... }` session context object

**Force-password-reset interception**: If the returned session context has `forcePasswordReset = TRUE`, protected Server Components (except `/change-password`) redirect to `/change-password`. This check is implemented as a helper `requireSession()` in `src/lib/auth/guards.ts` so it is not duplicated across every page.

---

## `requireAdmin()` Contract

**File**: `src/lib/auth/guards.ts`

**Called from**: Server Actions and Server Components that require Admin role.

**Behavior**:
1. Call `getSession()`
2. If null → throw `Unauthorized` (or redirect to `/login`)
3. If `session.role !== 'admin'` → throw `Forbidden` (or redirect to `/users` with an error)
4. Return the session context

---

## Cookie Specification

| Attribute | Value |
|-----------|-------|
| Name | `session` |
| Value | 64-char hex session token |
| `HttpOnly` | Yes (not accessible to JavaScript) |
| `Secure` | Yes (HTTPS only) |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Expires` | Matches `sessions.expires_at` |

**Setting the cookie**: Server Action via `cookieStore.set(...)` using `next/headers`.

**Clearing the cookie**: Server Action via `cookieStore.delete('session')` or `set('session', '', { maxAge: 0 })`.
