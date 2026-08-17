# Server Action Contracts: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

Each entry documents a Next.js Server Action: its file location, inputs, the preconditions it enforces, the mutations it performs, and its return/redirect behavior. All server actions call `getSession()` first when they require an authenticated user.

"Throws" in this context means the server action returns an error result that the calling form/component displays; it does not mean an unhandled exception.

---

## `app/actions/auth.ts`

### `login(formData: FormData)`

**Inputs**: `email: string`, `password: string`, `rememberMe: boolean`

**Preconditions** (evaluated in order — fail fast):
1. Email format is valid
2. User account exists with this email; if not → return generic "Invalid email or password" (no account enumeration)
3. Account is not suspended; if suspended → return "Your account has been suspended. Contact your administrator."
4. Account is not locked (`locked_until IS NULL OR locked_until < NOW()`); if locked → return "Account temporarily locked. Try again after [locked_until time]."
5. Password matches `password_hash` (constant-time comparison with `timingSafeEqual`)

**On credential failure (step 5)**:
- Increment `failed_login_attempts`
- If `failed_login_attempts >= LOGIN_MAX_ATTEMPTS`: set `locked_until = NOW() + LOCKOUT_SECONDS`
- Return "Invalid email or password"

**On success**:
- Reset `failed_login_attempts = 0`, clear `locked_until = NULL`
- Create session: `INSERT INTO sessions (session_token, user_id, expires_at)` — `expires_at` based on `rememberMe` flag
- Set `Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=<expires_at>`
- If `force_password_reset = TRUE`: redirect to `/change-password`
- Otherwise: redirect to `/users`

---

### `logout()`

**Inputs**: None (reads session cookie)

**Preconditions**: Session cookie present (no-op if missing)

**Mutations**: `UPDATE sessions SET is_revoked = TRUE WHERE session_token = <cookie>`

**On success**: Clear session cookie (`Set-Cookie: session=; Max-Age=0`); redirect to `/login`

---

## `app/actions/auth.ts` — Registration

### `register(formData: FormData)`

**Inputs**: `token: string` (from hidden form field, originally from URL), `firstName: string`, `lastName: string`, `password: string`, `confirmPassword: string`

**Preconditions**:
1. Token decrypts without error (AES-256-GCM authTag check)
2. Token `expiresAt > now`
3. Token `purpose === 'invitation'`
4. No user account exists with the invitation's email (race-condition guard)
5. `password === confirmPassword`
6. Password meets complexity requirements (length, uppercase, lowercase, digit, special char)

**Mutations** (single transaction):
- Hash password with `crypto.scrypt`
- `INSERT INTO users (email, password_hash, role, status, first_name, last_name)` with `role='member'`, `status='active'`

**On success**: Redirect to `/login` with query param `?registered=true` (triggers a success message on the login page)

---

## `app/actions/password.ts`

### `requestPasswordReset(formData: FormData)`

**Inputs**: `email: string`

**Behavior** (always returns the same generic response — no account enumeration):
1. Validate email format
2. Look up user by email; if not found → return generic "If that email is registered, a reset link has been sent."
3. If found:
   - Invalidate all prior reset tokens: `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`
   - Generate new encrypted token: `{ userId, email, expiresAt, purpose: 'password-reset' }`
   - `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)`
   - Send reset email via `sendPasswordResetEmail(email, token)`
4. Return generic confirmation message regardless of whether the user existed

---

### `completePasswordReset(formData: FormData)`

**Inputs**: `token: string`, `password: string`, `confirmPassword: string`

**Preconditions**:
1. Token decrypts without error
2. Token `expiresAt > now`
3. Token `purpose === 'password-reset'`
4. Reset token record exists by `token_hash` with `used = FALSE AND expires_at > NOW()`
5. `password === confirmPassword`
6. Password meets complexity requirements

**Mutations** (single transaction):
- Hash new password
- `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`
- `UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`
- Note: if user is suspended, password is still updated but login remains denied (FR-023)

**On success**: Redirect to `/login?reset=true`

---

## `app/actions/invitations.ts`

### `sendInvitation(formData: FormData)`

**Inputs**: `email: string`

**Preconditions**:
1. Caller is authenticated (`getSession()` returns non-null)
2. Caller's role is `'admin'`; if not → throw `Forbidden`
3. Email format is valid
4. No active user account with this email (FR-007)

**Mutations**:
- Generate encrypted invitation token: `{ email, expiresAt, purpose: 'invitation' }`
- Send invitation email via `sendInvitationEmail(email, token)`

> No invitation record is inserted into the database. The token is self-contained; validity is assessed entirely at registration time.

**On success**: Return success message "Invitation sent to [email]"

---

## `app/actions/users.ts`

### `updateProfile(formData: FormData)`

**Inputs**: `targetUserId: string`, `firstName: string`, `lastName: string`, `phoneNumber: string | null`, `slackHandle: string | null`

**Preconditions**:
1. Caller is authenticated
2. `targetUserId === session.userId` (self-edit) OR caller's role is `'admin'` (FR-011, FR-012)
3. Target user exists
4. If Admin editing: target user's role must be `'member'` (Admins cannot edit other Admins per assumptions)
5. `firstName` and `lastName` are non-empty (FR-033)

**Mutations**:
- `UPDATE users SET first_name=$1, last_name=$2, phone_number=$3, slack_handle=$4, updated_at=NOW() WHERE id=$5`
- Note: `role` is never updated by this action

**On success**: Redirect to `/users/[targetUserId]`

---

### `suspendUser(formData: FormData)`

**Inputs**: `targetUserId: string`

**Preconditions**:
1. Caller is authenticated with role `'admin'`
2. Target user exists with role `'member'` (Admins cannot suspend other Admins per assumptions)
3. Not the last active Admin (redundant here since target is Member, but guard is in place)

**Mutations**: `UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1`

**Side effect**: All active sessions for the target user are immediately revoked:
`UPDATE sessions SET is_revoked = TRUE WHERE user_id = $1 AND is_revoked = FALSE`

**On success**: Redirect to `/users/[targetUserId]`

---

### `reinstateUser(formData: FormData)`

**Inputs**: `targetUserId: string`

**Preconditions**:
1. Caller is authenticated with role `'admin'`
2. Target user exists with `status = 'suspended'`

**Mutations**: `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = $1`

**On success**: Redirect to `/users/[targetUserId]`

---

### `deleteUser(formData: FormData)`

**Inputs**: `targetUserId: string`

**Preconditions**:
1. Caller is authenticated with role `'admin'`
2. Target user exists with role `'member'`
3. **Last-Admin guard**: confirm at least one other active Admin exists (not applicable here since target is Member; guard is belt-and-suspenders)
4. Caller is not deleting themselves (belt-and-suspenders guard)

**Mutations** (transaction):
- `DELETE FROM users WHERE id = $1`
- Sessions and reset tokens cascade via `ON DELETE CASCADE`

**On success**: Redirect to `/users`

---

### `promoteToAdmin(formData: FormData)`

**Inputs**: `targetUserId: string`

**Preconditions**:
1. Caller is authenticated with role `'admin'`
2. Target user exists with role `'member'`

**Mutations**: `UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = $1`

**On success**: Redirect to `/users/[targetUserId]`

---

### `forcePasswordReset(formData: FormData)`

**Inputs**: `targetUserId: string`

**Preconditions**:
1. Caller is authenticated with role `'admin'`
2. Target user exists with role `'member'`

**Mutations**: `UPDATE users SET force_password_reset = TRUE, updated_at = NOW() WHERE id = $1`

**On success**: Redirect to `/users/[targetUserId]`

---

## `app/api/avatar/route.ts` (Route Handler, not Server Action)

### `POST /api/avatar`

**Content-Type**: `multipart/form-data`

**Fields**: `targetUserId: string`, `file: File`

**Preconditions**:
1. Caller is authenticated (read session cookie from request headers)
2. `targetUserId === session.userId` OR caller's role is `'admin'`
3. `file.type` is `'image/jpeg'` or `'image/png'` (MIME check — not just extension)
4. `file.size <= 5 * 1024 * 1024` (5 MB)

**Mutations**:
- Write file to `public/avatars/<targetUserId>.<ext>` (overwrite if exists)
- `UPDATE users SET avatar_path = $1, updated_at = NOW() WHERE id = $2`

**On success**: `200 OK` with `{ avatarPath: "/avatars/<targetUserId>.<ext>" }`

**On failure**: `400` (validation) or `403` (permission)

---

### `DELETE /api/avatar`

**Body**: `{ targetUserId: string }`

**Preconditions**: Same as POST (auth + permission)

**Mutations**:
- Delete file from `public/avatars/<targetUserId>.*` if it exists
- `UPDATE users SET avatar_path = NULL, updated_at = NOW() WHERE id = $1`

**On success**: `200 OK`
