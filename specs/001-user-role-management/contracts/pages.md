# Page Contracts: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

Each entry defines a page route, its access requirements, the data it displays, and the actions it surfaces. Page routes map to Next.js App Router `page.tsx` files.

---

## Public Routes — No session required

### `GET /login`

**File**: `src/app/(auth)/login/page.tsx`

**Access**: Unauthenticated only. Redirect authenticated users to `/users`.

**Displays**:
- Email field
- Password field
- "Remember me" checkbox
- "Forgot password?" link → `/reset-password`
- Submit button

**On submit**: Calls `login` server action. On success: redirect to `/users`. On failure: display error (invalid credentials, account suspended, or account locked with unlock time).

---

### `GET /register?token=<encrypted-token>`

**File**: `src/app/(auth)/register/page.tsx`

**Access**: Public. No session required.

**On page load**:
1. Extract `token` from URL query params
2. Decrypt and validate token server-side: if invalid, expired, or invitation is not `pending` → render error state with message "This invitation link is invalid or has expired."
3. If valid: render registration form with email pre-filled (read-only) from the decrypted token

**Displays** (valid token path):
- Email field (read-only, from token)
- First Name field (required)
- Last Name field (required)
- Password field (required, with complexity rules shown)
- Confirm Password field (required)
- Submit button

**On submit**: Calls `register` server action. On success: redirect to `/login` with a success message. On failure: display field-level errors.

---

### `GET /reset-password`

**File**: `src/app/(auth)/reset-password/page.tsx`

**Access**: Public.

**State 1 — Request form** (no `token` param):
- Email field
- Submit button
- On submit: calls `requestPasswordReset` server action → always shows generic confirmation ("If that email is registered, a reset link has been sent.")

**State 2 — New password form** (`?token=<encrypted-token>` present):
- On page load: decrypt and validate token server-side; if invalid/expired → render error state
- Password field (required, complexity rules shown)
- Confirm Password field (required)
- Submit button
- On submit: calls `completePasswordReset` server action. On success: redirect to `/login` with confirmation. On failure: display error.

---

## Protected Routes — Valid session required

All routes below: middleware checks for session cookie; `getSession()` in the Server Component performs DB validation. No session → redirect to `/login`.

---

### `GET /users`

**File**: `src/app/(shell)/users/page.tsx`

**Access**: Any authenticated user (Admin or Member).

**Displays**: Paginated or full list of all users (no filtering). Per row:
- Avatar (thumbnail) or default avatar placeholder
- First Name + Last Name
- Role badge (`Admin` or `Member`)
- Link to full profile (`/users/[id]`)

**Admin-only controls** (rendered only when `session.role === 'admin'`):
- "Invite member" button → `/admin/invitations`

---

### `GET /users/[id]`

**File**: `src/app/(shell)/users/[id]/page.tsx`

**Access**: Any authenticated user.

**Displays**:
- Avatar or default placeholder
- First Name, Last Name
- Role (read-only badge)
- Phone Number (if set)
- Slack Handle (if set)

**Controls**:
- "Edit" button → `/users/[id]/edit` (always visible; self-edit allowed for own profile; Admin can edit any Member's profile)
- Admin-only controls (rendered only when `session.role === 'admin'` AND viewed user's role is `'member'`):
  - "Suspend" / "Reinstate" toggle (disabled if this is the last Admin — not applicable since this guard only shows for Members)
  - "Force Password Reset" button
  - "Promote to Admin" button
  - "Delete Account" button (with confirmation dialog)

---

### `GET /users/[id]/edit`

**File**: `src/app/(shell)/users/[id]/edit/page.tsx`

**Access**:
- A user can only access their own profile edit page, unless they are an Admin
- Admin can access any Member's edit page
- Attempting to access another user's edit page as a Member → redirect to `/users/[id]` with an error

**Displays**:
- First Name field (required)
- Last Name field (required)
- Phone Number field (optional)
- Slack Handle field (optional)
- Avatar upload/remove widget (JPEG/PNG, ≤ 5 MB)
- Role field (read-only badge — no input)
- Save button
- Cancel button → `/users/[id]`

**On submit**: Calls `updateProfile` server action. On success: redirect to `/users/[id]`. On failure: display field-level errors.

---

### `GET /admin/invitations`

**File**: `src/app/(shell)/admin/invitations/page.tsx`

**Access**: Admin only. Non-admin → redirect to `/users` with an error.

**Displays**:
- Email field
- "Send Invitation" button

**On submit**: Calls `sendInvitation` server action. On success: show confirmation. On failure: show specific error (email already has account, pending invitation already exists, invalid email format).

---

## Force-Password-Reset Interstitial

**Not a standalone page** — implemented as a redirect in `getSession()`. If the resolved user has `force_password_reset = TRUE`, all protected routes redirect to `/reset-password` (State 2 — but driven by session context, not a URL token, using a special server-session-based flow).

**Note to implementers**: The forced reset flow uses the existing session (the user is authenticated) but must still require a new password before granting full access. The implementation should use a middleware/guard check that intercepts all `(shell)` routes when `force_password_reset = TRUE` and redirects to a dedicated `/change-password` page (not a token-based URL). This requires a separate page not covered by the token-based reset flow. Document as a separate implementation concern in `tasks.md`.
