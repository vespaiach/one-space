# Research: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 0 | **Date**: 2026-08-17

## Session Management

**Decision**: Opaque session token stored in an `HttpOnly; Secure; SameSite=Lax` cookie; session record backed by PostgreSQL.

**Token format**: `crypto.randomBytes(32).toString('hex')` → 64-char hex string. 256 bits of entropy; not guessable.

**Session lifecycle**:
- Create: generate token → `INSERT INTO sessions` → set cookie with `Set-Cookie`
- Validate: `getSession()` helper reads cookie via `await cookies()` (Next.js 15 — async, not sync) → `SELECT` from `sessions` WHERE token matches AND `is_revoked = FALSE` AND `expires_at > NOW()` → returns user row or null
- Revoke (logout): `UPDATE sessions SET is_revoked = TRUE WHERE session_token = $1`
- Hard expiry: no sliding window; after expiry the user must re-login

**Session durations** (env vars):

| Mode | Env Var | Default |
|------|---------|---------|
| Standard | `SESSION_DURATION_SECONDS` | 7200 (2 hours) |
| Remember Me | `REMEMBER_ME_DURATION_SECONDS` | 1814400 (21 days) |

**Proxy split** (critical pattern for Next.js 16 App Router):
- `proxy.ts` replaces `middleware.ts` in Next.js 16; the exported function is `proxy()` (not `middleware()`)
- Next.js 16 default runtime for Proxy is **Node.js** (no longer Edge); Proxy _can_ use `postgres`, Drizzle ORM, and all Node.js built-ins
- **Architecture decision**: Proxy is still limited to cookie existence check → redirect to `/login` if absent; it does NOT perform DB validation
  - Rationale: Next.js docs state Proxy "is _not_ intended for slow data fetching" and "should not be used as a full session management or authorization solution"
  - Full DB session validation happens inside `getSession()` at the top of every protected Server Component and Server Action
- Proxy is the first-pass guard, not the authoritative validator; `getSession()` is authoritative

**Drizzle client singleton** (HMR pitfall):
- In development, Next.js HMR reloads modules and creates a new Drizzle client on each reload, exhausting connections
- Pattern already implemented in `lib/db/index.ts`: `globalForDb.db ?? drizzleDb` — reuses the Drizzle instance across HMR cycles
- In production, the module-level singleton is stable; the `globalThis` guard is a no-op

**Drizzle query for session validation** (called in `getSession()` — never in middleware):
```typescript
await db
  .select()
  .from(sessions)
  .innerJoin(users, eq(sessions.userId, users.id))
  .where(
    and(
      eq(sessions.sessionToken, token),
      eq(sessions.isRevoked, false),
      gt(sessions.expiresAt, new Date()),
    ),
  )
  .limit(1)
```

**Alternatives considered**:
- JWT (stateless): rejected — cannot revoke individual sessions without a denylist, which adds the same DB dependency with more complexity
- Redis session store: rejected — operational dependency; PostgreSQL alone is sufficient at ~20-user scale

---

## Invitation Token

**Decision**: Stateless AES-256-GCM encrypted token using Node.js built-in `crypto`. Payload: `{ email, expiresAt, purpose: 'invitation' }`. No server-side invitation record is stored.

**Token construction** (12-byte IV for GCM, 16-byte authTag):
1. Generate 12-byte random IV: `crypto.randomBytes(12)`
2. Encrypt JSON payload with `createCipheriv('aes-256-gcm', key, iv)`
3. Retrieve `cipher.getAuthTag()` (16 bytes)
4. Concatenate `iv + ciphertext + authTag` → encode as `base64url` string
5. Token is URL-safe, integrity-protected (AES-GCM authenticates ciphertext + IV)

**Verification flow** (at registration time — fully stateless):
1. Receive token from URL query param
2. Decrypt → extract `{ email, expiresAt, purpose }` — `decipher.final()` throws on tamper, rejecting forged tokens
3. Check `purpose === 'invitation'`
4. Check `expiresAt > now` (expired → reject)
5. Check no user account exists with `email` (already registered → reject)
6. Proceed with account creation

**Token expiry**: `INVITATION_EXPIRY_DAYS` env var (default: 7 days per spec assumption).

**Pre-send check** (before generating the token): Admin-side `sendInvitation` action checks that no user account already exists for the supplied email before generating and emailing the token. This is the only server-side guard; no pending-invitation table is consulted.

**Rationale**: Spec clarified (2026-08-17) that invitation state does not need to be persisted. Stateless tokens eliminate the `invitations` table entirely, removing revocation, duplicate-pending-check, and partial-index complexity. AES-256-GCM provides confidentiality and integrity with no additional HMAC step. Node.js built-in — no new package.

**The `purpose` field** prevents cross-use of invitation tokens as password-reset tokens and vice versa.

**Alternatives considered**:
- HMAC-signed token: exposes email in the URL (signed but not encrypted), violating privacy expectation
- DB-backed invitation record: was the prior design; removed per spec update — adds revocation and duplicate-prevention at the cost of an extra table and query on every registration attempt

---

## Password Hashing

**Decision**: `crypto.scrypt` (async, via `util.promisify`) — Node.js built-in, no new package.

**Parameters**: N=16384, r=8, p=1, keylen=64 bytes. Salt: 32 random bytes per password.

**Storage format**: `scrypt$16384$8$1$<hex-salt>$<hex-key>` — all params embedded in the stored value.

**Verification**: Always use `crypto.timingSafeEqual` to compare the computed key against the stored key — prevents timing attacks.

**Async pattern**: Use `promisify(scrypt)` in Server Actions. `scryptSync` blocks the event loop for ~100–300ms at N=16384, which is unacceptable under concurrent load in a Next.js process.

**Rationale**: Built-in to Node.js; memory-hard (GPU-resistant); OWASP-recommended alternative to bcrypt for new systems. bcrypt requires `bcryptjs` (new package + 72-byte password limit); argon2 requires a native module; PBKDF2 is built-in but not memory-hard.

---

## Password Complexity (Standard)

**Decision**: OWASP ASVS Level 1 minimum — the established baseline for "standard password complexity":

| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Maximum length | 128 characters (DoS prevention) |
| Uppercase | ≥ 1 |
| Lowercase | ≥ 1 |
| Digit | ≥ 1 |
| Special character | ≥ 1 (any printable non-alphanumeric) |

**Validation**: Both client-side (UX feedback) and server-side (authoritative). Server-side validation implemented in `lib/validation/password.ts`. Error messages name which requirements are unmet.

**Rationale**: "Standard password complexity" as specified maps to OWASP ASVS Level 1 — the most widely recognized industry baseline for enterprise applications.

---

## Account Lockout (Brute Force Protection)

**Decision**: Lockout state stored in the `users` table (`failed_login_attempts INT`, `locked_until TIMESTAMPTZ`).

**Configurable defaults** (env vars):

| Env Var | Default | Meaning |
|---------|---------|---------|
| `LOGIN_MAX_ATTEMPTS` | 5 | Consecutive failures before lockout |
| `LOGIN_LOCKOUT_SECONDS` | 900 | Lockout duration (15 minutes) |

**Logic**:
- Suspended account check fires **before** credential check → lockout counter is not incremented for suspended accounts (per spec edge case)
- Each failed credential check: `failed_login_attempts++`, set `locked_until = NOW() + LOCKOUT_SECONDS` when threshold reached
- Successful login: reset `failed_login_attempts = 0`, clear `locked_until = NULL`
- Lockout expires naturally when `locked_until < NOW()`; no Admin action required

**Rationale**: DB-stored lockout state survives server restarts; consistent across deployments; no Redis needed at this scale.

---

## Password Reset Token

**Decision**: Same AES-256-GCM pattern as invitation tokens. Payload: `{ userId, email, expiresAt, purpose: 'password-reset' }`.

**The `purpose` field** prevents cross-use of invitation tokens as password-reset tokens and vice versa.

**DB record** (`password_reset_tokens` table): tracks `token_hash`, `user_id`, `expires_at`, `used`.

**Invalidation rule**: When a new reset link is issued for a user, all prior `password_reset_tokens` rows for that `user_id` are set `used = TRUE` in the same transaction.

**Single-use**: Token row is set `used = TRUE` immediately after the successful password update.

---

## Avatar File Upload

**Decision**: Route Handler (`app/api/avatar/route.ts`), not a Server Action.

**Why Route Handler**: Server Actions process `FormData` through Next.js's request pipeline with less control over size enforcement; a Route Handler exposes the raw `Request.formData()` API where the 5MB size check can be enforced before the file is written to disk.

**Storage**: Files written to `public/avatars/<userId>.<ext>` on the local filesystem. Next.js serves the `public/` directory as static assets with no additional configuration.

**Validation** (server-side, before persisting):
1. Check `Content-Type` is `image/jpeg` or `image/png` (MIME sniff, not just extension)
2. Check file size ≤ 5MB before writing

**Rationale**: Per spec and clarifications — local filesystem, no third-party object storage.

---

## Email Delivery

**Decision**: Nodemailer with SMTP transport.

**Configuration** (env vars): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

**Rationale**: Node.js has no built-in email capability. Nodemailer is the established Node.js email standard with minimal transitive dependencies in SMTP mode. Per spec: "email delivery relies on an external email service already available in the environment." New package requires team approval (Constitution IV) — see plan.md.

---

## Testing Framework

**Decision**: Vitest with `@vitejs/plugin-react`.

| Test type | Vitest environment | What it covers |
|-----------|-------------------|----------------|
| Unit | `node` | `lib/` modules (crypto, auth, validation, db queries in isolation) |
| Unit | `jsdom` | React components (`components/`) |
| Integration | `node` | Server actions + real PostgreSQL (`DATABASE_URL_TEST` env var) |

**No DB mocking in integration tests** — tests use a real PostgreSQL database, truncated between test runs.

**Test commands**:
```bash
# All tests
npm test

# Unit tests only
npm test -- tests/unit

# Integration tests (requires DATABASE_URL_TEST)
DATABASE_URL_TEST=postgres://... npm test -- tests/integration
```

**Vitest config**: Declared in `vitest.config.ts` (or `vite.config.ts`). Uses `vite-tsconfig-paths` for path alias resolution (`@/` → project root).

**Rationale**: Vitest is already configured in the project (`package.json` scripts `"test": "vitest"`). No DB mocking: mocked tests can pass while real DB interactions fail (per project quality standards).
