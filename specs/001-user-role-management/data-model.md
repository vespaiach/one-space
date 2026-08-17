# Data Model: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

## Entity Overview

| Entity | PostgreSQL Table | Purpose |
|--------|-----------------|---------|
| User Account + Profile | `users` | Combined account credentials and profile fields; one record per user |
| Session | `sessions` | Opaque session tokens for authenticated users; DB-backed for revocability |
| Password Reset Token | `password_reset_tokens` | Single-use reset tokens for self-service password recovery |

> **No `invitations` table**: Invitation links are stateless AES-256-GCM tokens carrying `{ email, expiresAt, purpose }`. Validity is assessed at registration time by decrypting the token, checking expiry, and confirming the email is not yet registered. No server-side invitation state is stored or revoked.

---

## `users` Table

Stores account credentials and profile data in a single record. Role is system-assigned. Status controls login access. Lockout state (`failed_login_attempts`, `locked_until`) governs brute-force protection.

**File**: `lib/db/schema/users.ts`

```typescript
import { boolean, index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  status: text('status', { enum: ['active', 'suspended'] }).notNull().default('active'),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  slackHandle: varchar('slack_handle', { length: 100 }),
  avatarPath: text('avatar_path'),
  forcePasswordReset: boolean('force_password_reset').notNull().default(false),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_role').on(table.role),
  index('idx_users_status').on(table.status),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
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

**File**: `lib/db/schema/sessions.ts`

```typescript
import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sessions_session_token').on(table.sessionToken),
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_expires_at').on(table.expiresAt),
])

export type Session = typeof sessions.$inferSelect
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

**Cleanup**: Expired rows accumulate; a scheduled `DELETE FROM sessions WHERE expires_at < NOW()` can prune them. Not operationally critical at ~20-user scale — lazy cleanup on first failed lookup is acceptable.

---

## `password_reset_tokens` Table

One row per issued reset link. Only the most recently issued token per user is active; prior tokens are invalidated atomically when a new one is issued.

**File**: `lib/db/schema/passwordResetTokens.ts`

```typescript
import { boolean, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './users'

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_prt_user_id').on(table.userId),
  index('idx_prt_token_hash').on(table.tokenHash),
])

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
```

**Field notes**:

| Field | Details |
|-------|---------|
| `token_hash` | `SHA-256(encrypted_token)` in hex — same pattern as `invitations.token_hash` |
| `used` | Set TRUE after successful password update; prevents reuse of the same link |

**Invalidation on new issuance** (FR-022): When a new reset token is issued, run both statements in a single Drizzle transaction:
```typescript
await db.transaction(async (tx) => {
  await tx
    .update(passwordResetTokens)
    .set({ used: true })
    .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.used, false)))
  await tx.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt })
})
```

**Validation query at reset time**:
```typescript
await db
  .select()
  .from(passwordResetTokens)
  .where(
    and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      eq(passwordResetTokens.used, false),
      gt(passwordResetTokens.expiresAt, new Date()),
    ),
  )
  .limit(1)
```

**Reset token expiry**: Configurable via `PASSWORD_RESET_EXPIRY_MINUTES` env var (suggested default: 60 minutes — not specified in the original spec but standard practice).

---

## Cross-Entity Constraints Summary

| Rule | Where Enforced |
|------|---------------|
| At least one active Admin must exist | Application layer (server action pre-check before delete/suspend) |
| No invitation for email with existing account | Application pre-check in `sendInvitation` before token generation |
| Sessions cascade on user delete | `ON DELETE CASCADE` on `sessions.user_id` |
| Reset tokens cascade on user delete | `ON DELETE CASCADE` on `password_reset_tokens.user_id` |
| Suspended account check before lockout increment | Application logic (login server action) |
| Role field is read-only via profile edit | Application layer (server action ignores role field in profile update) |

---

## Environment Variables Reference

| Env Var | Default | Used In |
|---------|---------|---------|
| `DATABASE_URL` | — (required) | `lib/db/index.ts` |
| `DATABASE_URL_TEST` | — (test only) | `lib/db/index.ts` |
| `SESSION_DURATION_SECONDS` | `7200` | `lib/auth/session.ts` |
| `REMEMBER_ME_DURATION_SECONDS` | `1814400` | `lib/auth/session.ts` |
| `INVITATION_SECRET_KEY` | — (required, 64 hex chars = 32 bytes) | `lib/crypto/token.ts` |
| `INVITATION_EXPIRY_DAYS` | `7` | `app/actions/invitations.ts` |
| `PASSWORD_RESET_EXPIRY_MINUTES` | `60` | `app/actions/password.ts` |
| `LOGIN_MAX_ATTEMPTS` | `5` | `app/actions/auth.ts` |
| `LOGIN_LOCKOUT_SECONDS` | `900` | `app/actions/auth.ts` |
| `SMTP_HOST` | — (required) | `lib/email/sender.ts` |
| `SMTP_PORT` | `587` | `lib/email/sender.ts` |
| `SMTP_USER` | — (required) | `lib/email/sender.ts` |
| `SMTP_PASS` | — (required) | `lib/email/sender.ts` |
| `SMTP_FROM` | — (required) | `lib/email/sender.ts` |
| `INITIAL_ADMIN_EMAIL` | — (required at boot) | Bootstrap / seed script |
| `INITIAL_ADMIN_PASSWORD` | — (required at boot) | Bootstrap / seed script |
