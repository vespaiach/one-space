# Data Model: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

## Entity Overview

| Entity | PostgreSQL Table | Purpose |
|--------|-----------------|---------|
| User Account + Profile | `users` | Combined account credentials and profile fields; one record per user |
| Session | `sessions` | Opaque session tokens for authenticated users; DB-backed for revocability |
| Invitation | `invitations` | Tracks invitation status; paired with an encrypted token sent via email |
| Password Reset Token | `password_reset_tokens` | Single-use reset tokens for self-service password recovery |

---

## `users` Table

Stores account credentials and profile data in a single record. Role is system-assigned. Status controls login access. Lockout state (`failed_login_attempts`, `locked_until`) governs brute-force protection.

```sql
CREATE TABLE users (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         TEXT        NOT NULL,
  role                  TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member')),
  status                TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'suspended')),
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  phone_number          VARCHAR(50),
  slack_handle          VARCHAR(100),
  avatar_path           TEXT,
  force_password_reset  BOOLEAN     NOT NULL DEFAULT FALSE,
  failed_login_attempts INT         NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

**Field notes**:

| Field | Details |
|-------|---------|
| `password_hash` | Format: `scrypt$16384$8$1$<hex-salt>$<hex-key>` — all params embedded |
| `avatar_path` | Relative path within `public/avatars/`; NULL = no avatar |
| `locked_until` | NULL = no active lockout; a past timestamp is treated as unlocked |
| `force_password_reset` | Set TRUE by Admin (FR-027); cleared to FALSE after member completes reset (FR-029) |

**Validation rules**:
- `email`: valid email format (RFC 5322 simplified); unique; not mutable after creation
- `first_name`, `last_name`: 1–100 characters, required at registration
- `password_hash`: never NULL; set at registration or after reset
- `role`: only `'admin'` or `'member'` (DB constraint enforces)
- `status`: only `'active'` or `'suspended'`
- `phone_number`, `slack_handle`: free-text, no format validation, nullable (FR-033)
- `avatar_path`: validated at upload boundary (JPEG/PNG, ≤ 5 MB); path stored after file is successfully written

**State transitions**:

```
status:               active ←→ suspended          (Admin only; FR-013)
role:                 member → admin               (Admin only; one-way; FR-016)
force_password_reset: FALSE → TRUE → FALSE         (Admin sets; user clears; FR-027/029)
locked_until:         NULL → future timestamp      (after N failures; clears when timestamp elapses)
failed_login_attempts: increments on failure; resets to 0 on success
```

**Last-Admin guard**: Application layer must reject any `DELETE` or `UPDATE status='suspended'` that would leave zero active Admin accounts (FR-017). No DB constraint can enforce this; it must be checked in the server action before the mutation.

---

## `sessions` Table

One row per active authenticated session. Sessions are identified by an opaque random token stored in the browser cookie. Expired and revoked rows are retained until pruned; queries always filter on `is_revoked = FALSE AND expires_at > NOW()`.

```sql
CREATE TABLE sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT        NOT NULL UNIQUE,
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  is_revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_user_id       ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at    ON sessions(expires_at);
```

**Field notes**:

| Field | Details |
|-------|---------|
| `session_token` | 64-char hex string (32 random bytes); stored as-is — sufficient entropy, not derived from user data, no need to hash |
| `expires_at` | Fixed at creation; no sliding window; determined by whether Remember Me was selected |
| `is_revoked` | Set TRUE on logout; allows immediate invalidation before `expires_at` |

**Session durations** (set at `INSERT` time; configurable via env vars):

| Mode | Formula | Default Env Var |
|------|---------|-----------------|
| Standard | `NOW() + INTERVAL '2 hours'` | `SESSION_DURATION_SECONDS=7200` |
| Remember Me | `NOW() + INTERVAL '21 days'` | `REMEMBER_ME_DURATION_SECONDS=1814400` |

**Validation query** (called in `getSession()` — never in middleware):
```sql
SELECT s.id, s.expires_at, u.*
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.session_token = $1
  AND s.is_revoked = FALSE
  AND s.expires_at > NOW();
```

**Cleanup**: Expired rows accumulate; a scheduled `DELETE FROM sessions WHERE expires_at < NOW()` can prune them. Not operationally critical at ~20-user scale — lazy cleanup on first failed lookup is acceptable.

---

## `invitations` Table

One row per invitation email sent. The encrypted token (containing email + expiry) lives only in the email link; the DB record tracks status for duplicate-prevention and revocation.

```sql
CREATE TABLE invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  invited_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'revoked')),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensures only one pending invitation per email at a time (FR-008)
CREATE UNIQUE INDEX idx_invitations_pending_email
  ON invitations(email)
  WHERE status = 'pending';

CREATE INDEX idx_invitations_token_hash ON invitations(token_hash);
CREATE INDEX idx_invitations_email      ON invitations(email);
CREATE INDEX idx_invitations_status     ON invitations(status);
```

**Field notes**:

| Field | Details |
|-------|---------|
| `invited_by` | Nullable (`ON DELETE SET NULL`) — if the inviting Admin is deleted, the invitation remains valid (spec edge case) |
| `token_hash` | `SHA-256(encrypted_token)` in hex — used to look up this record when the link is followed |
| `expires_at` | Denormalized from the token payload for DB-level expiry queries; set from `INVITATION_EXPIRY_DAYS` env var |
| `status` | `'pending'` → `'accepted'` (on successful registration) or `'revoked'` (if Admin cancels) |

**Duplicate-invitation logic** (FR-007, FR-008): Before inserting a new invitation, the application checks whether the email already has an active user account (FR-007) or an existing `status = 'pending'` invitation (FR-008). The partial unique index on `invitations(email) WHERE status = 'pending'` provides a DB-level backstop.

**State transitions**:
```
pending → accepted   (on successful registration with this token)
pending → revoked    (Admin revokes, or future cancellation flow)
```
Expired invitations are not updated in the DB — expiry is evaluated at use time by checking both `expires_at` and the embedded `expiresAt` in the decrypted token. `status` remains `'pending'` but the token is invalid.

---

## `password_reset_tokens` Table

One row per issued reset link. Only the most recently issued token per user is active; prior tokens are invalidated atomically when a new one is issued.

```sql
CREATE TABLE password_reset_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_user_id    ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);
```

**Field notes**:

| Field | Details |
|-------|---------|
| `token_hash` | `SHA-256(encrypted_token)` in hex — same pattern as `invitations.token_hash` |
| `used` | Set TRUE after successful password update; prevents reuse of the same link |

**Invalidation on new issuance** (FR-022): When a new reset token is issued, run this before the `INSERT`:
```sql
UPDATE password_reset_tokens
SET used = TRUE
WHERE user_id = $1 AND used = FALSE;
```
Then insert the new row. Both statements run in a single transaction.

**Validation query at reset time**:
```sql
SELECT * FROM password_reset_tokens
WHERE token_hash = $1
  AND used = FALSE
  AND expires_at > NOW();
```

**Reset token expiry**: Configurable via `PASSWORD_RESET_EXPIRY_MINUTES` env var (suggested default: 60 minutes — not specified in the original spec but standard practice).

---

## Cross-Entity Constraints Summary

| Rule | Where Enforced |
|------|---------------|
| At least one active Admin must exist | Application layer (server action pre-check before delete/suspend) |
| One pending invitation per email | Partial unique index + application pre-check |
| No invitation for email with existing account | Application pre-check before invitation INSERT |
| Sessions cascade on user delete | `ON DELETE CASCADE` on `sessions.user_id` |
| Reset tokens cascade on user delete | `ON DELETE CASCADE` on `password_reset_tokens.user_id` |
| Invitation invited_by nullified on Admin delete | `ON DELETE SET NULL` on `invitations.invited_by` |
| Suspended account check before lockout increment | Application logic (login server action) |
| Role field is read-only via profile edit | Application layer (server action ignores role field in profile update) |

---

## Environment Variables Reference

| Env Var | Default | Used In |
|---------|---------|---------|
| `DATABASE_URL` | — (required) | `src/lib/db/client.ts` |
| `DATABASE_URL_TEST` | — (test only) | `src/lib/db/client.ts` |
| `SESSION_DURATION_SECONDS` | `7200` | `src/lib/auth/session.ts` |
| `REMEMBER_ME_DURATION_SECONDS` | `1814400` | `src/lib/auth/session.ts` |
| `INVITATION_SECRET_KEY` | — (required, 64 hex chars = 32 bytes) | `src/lib/crypto/token.ts` |
| `INVITATION_EXPIRY_DAYS` | `7` | `src/app/actions/invitations.ts` |
| `PASSWORD_RESET_EXPIRY_MINUTES` | `60` | `src/app/actions/password.ts` |
| `LOGIN_MAX_ATTEMPTS` | `5` | `src/app/actions/auth.ts` |
| `LOGIN_LOCKOUT_SECONDS` | `900` | `src/app/actions/auth.ts` |
| `SMTP_HOST` | — (required) | `src/lib/email/sender.ts` |
| `SMTP_PORT` | `587` | `src/lib/email/sender.ts` |
| `SMTP_USER` | — (required) | `src/lib/email/sender.ts` |
| `SMTP_PASS` | — (required) | `src/lib/email/sender.ts` |
| `SMTP_FROM` | — (required) | `src/lib/email/sender.ts` |
| `INITIAL_ADMIN_EMAIL` | — (required at boot) | Bootstrap / seed script |
| `INITIAL_ADMIN_PASSWORD` | — (required at boot) | Bootstrap / seed script |
