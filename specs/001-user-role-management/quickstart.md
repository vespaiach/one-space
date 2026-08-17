# Quickstart Validation Guide: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-17

This guide describes runnable validation scenarios that prove the feature works end-to-end. It references the [data model](data-model.md) and [contracts](contracts/) rather than duplicating them.

---

## Prerequisites

1. PostgreSQL running locally or accessible via `DATABASE_URL`
2. SMTP service configured (or use a dev tool like Mailpit/MailHog on `localhost:1025`)
3. All required environment variables set (see [data-model.md — Environment Variables](data-model.md)):
   ```
   DATABASE_URL=postgres://...
   INVITATION_SECRET_KEY=<64-char hex>   # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=test
   SMTP_PASS=test
   SMTP_FROM=noreply@one-space.local
   INITIAL_ADMIN_EMAIL=admin@example.com
   INITIAL_ADMIN_PASSWORD=Admin1234!
   ```
4. Database schema applied:
   ```bash
   npm run db:generate   # generate migration files from Drizzle schema
   npm run db:migrate    # apply migrations to DATABASE_URL
   ```
5. Initial Admin seeded (run bootstrap/seed script)
6. App running: `npm run dev` (or `npm run build && npm start`)

---

## Scenario 1 — Initial Admin Login (US2)

**Goal**: Confirm the seed Admin can log in with the configured credentials.

**Steps**:
1. Navigate to `http://localhost:3000/login`
2. Enter `admin@example.com` / `Admin1234!`
3. Do not check "Remember me"
4. Submit

**Expected**:
- Redirected to `/users`
- Admin is listed in the user directory
- Session cookie is set (inspect via browser DevTools → Application → Cookies)
- Cookie is `HttpOnly` (not visible via `document.cookie`)
- Cookie `Expires` is approximately 2 hours from now

**Verify Remember Me variant**: Repeat with "Remember me" checked. Cookie `Expires` should be approximately 21 days from now.

---

## Scenario 2 — Invitation Flow (US1)

**Goal**: Admin invites a new member; invitee registers and can log in.

**Steps**:
1. Log in as Admin (Scenario 1)
2. Navigate to `http://localhost:3000/admin/invitations`
3. Enter `member@example.com`, submit "Send Invitation"
4. Confirm: success message shown
5. Check email inbox (Mailpit UI at `http://localhost:8025` or equivalent)
6. Open the invitation email; click the registration link
7. Confirm: `http://localhost:3000/register?token=<encrypted-token>` loads; email is pre-filled (read-only)
8. Enter First Name: `Alice`, Last Name: `Smith`, password: `Member1234!`
9. Submit

**Expected**:
- Redirected to `/login?registered=true`
- Login page shows a success message
- DB: new row in `users` with `role='member'`, `status='active'`

**Log in as the new member**: Use `member@example.com` / `Member1234!`. Confirm redirect to `/users`.

---

## Scenario 3 — Invalid Invitation Links (US1 edge cases)

**Goal**: Confirm invalid invitation links are rejected.

**3a — Email already registered**:
1. As Admin, attempt to send an invitation to `member@example.com` (already registered)
2. Expected: error "This email address already has an account"

**3b — Expired token**:
1. Set `INVITATION_EXPIRY_DAYS=0` temporarily and send an invitation
2. Follow the link immediately
3. Expected: page shows "This invitation link is invalid or has expired"

**3c — Email registered between invite and registration** (race condition):
1. Invite `race@example.com`
2. Before following the link, manually insert a user row with `email = 'race@example.com'` in the DB
3. Follow the invitation link and attempt to register
4. Expected: registration is rejected with "This invitation link is invalid or has expired" (email already in use)

---

## Scenario 4 — Profile Viewing and Self-Editing (US3, US4)

**Goal**: Any logged-in user can view all profiles; users can edit only their own.

**Steps**:
1. Log in as `member@example.com`
2. Navigate to `/users` — confirm both Admin and Member are listed with Avatar, First Name, Last Name, Role
3. Click on the Admin's profile — confirm all fields (Phone Number, Slack Handle) are visible
4. Navigate to `/users/[admin-id]/edit` — expected: redirect back to `/users/[admin-id]` with an access error (member cannot edit Admin's profile)
5. Navigate to own profile edit (`/users/[member-id]/edit`): update Phone Number to `+1-555-0100`, save
6. Confirm: profile view shows `+1-555-0100`
7. Confirm: Role field is read-only in the edit form

---

## Scenario 5 — Admin Account Management (US5)

**Goal**: Admin can suspend, reinstate, delete, and force-password-reset a Member.

**5a — Suspend**:
1. As Admin, navigate to Member's profile; click "Suspend"
2. Expected: Member is suspended; Admin still shown as active
3. Attempt to log in as the Member: expected error "Your account has been suspended. Contact your administrator."
4. Failed login against suspended account: confirm `failed_login_attempts` is NOT incremented (check DB)

**5b — Reinstate**:
1. As Admin, click "Reinstate" on the suspended Member's profile
2. Expected: Member can log in again

**5c — Force Password Reset**:
1. As Admin, click "Force Password Reset" on Member's profile
2. Log in as the Member
3. Expected: immediately redirected to `/change-password`; all other routes are inaccessible until new password is set
4. Set a new compliant password; confirm redirect to `/users`; confirm `force_password_reset = FALSE` in DB

**5d — Delete**:
1. As Admin, click "Delete Account" on a Member's profile; confirm the dialog
2. Expected: Member no longer appears in `/users`; DB row gone; all sessions for that user deleted (cascade)

---

## Scenario 6 — Last-Admin Guard (US5 edge case)

**Goal**: The system prevents deleting or suspending the last Admin.

**Steps**:
1. Ensure only one Admin account exists
2. As that Admin, navigate to own profile — confirm "Suspend" and "Delete" are absent or disabled (since Admins cannot manage other Admins, and self-deletion is blocked)
3. Alternatively: if test harness allows direct action invocation, call `deleteUser` or `suspendUser` with the last Admin's ID
4. Expected: action returns an error; Admin account remains active

---

## Scenario 7 — Role Promotion (US6)

**Goal**: Admin can promote a Member to Admin.

**Steps**:
1. As Admin, navigate to Member's profile; click "Promote to Admin"
2. Expected: Member's role badge changes to `Admin`; Promote button is gone; Admin controls for that user disappear
3. Log in as the promoted user — confirm they can access `/admin/invitations` and send an invitation

---

## Scenario 8 — Self-Service Password Reset (US7)

**Goal**: User can reset a forgotten password.

**Steps**:
1. Navigate to `/login` → click "Forgot password?"
2. Enter `member@example.com`, submit
3. Expected: generic confirmation message (even for an unregistered email — try `nobody@example.com` to confirm same message, no email sent)
4. Open the reset email; click the link
5. Enter a new password `NewMember1234!`, confirm, submit
6. Expected: redirect to `/login?reset=true`
7. Attempt to use the same reset link again: expected "This link is invalid or has already been used"
8. Log in with new password — confirm success

---

## Scenario 9 — Account Lockout (FR-024/025/026)

**Goal**: Brute-force protection triggers after N failed attempts and clears automatically.

**Steps**:
1. As logged-out user, submit incorrect password for `member@example.com` 5 times
2. Expected on 5th failure: error "Account temporarily locked. Try again after [time]"
3. Confirm: `users.locked_until` is set in DB to approximately 15 minutes from now
4. Attempt a 6th login: expected same lockout message
5. In test: set `locked_until` to a past timestamp in DB (or wait 15 minutes in real test)
6. Attempt login with correct password: expected success; confirm `failed_login_attempts = 0` and `locked_until = NULL` in DB

---

## Scenario 10 — Avatar Upload and Removal (US8)

**Goal**: Valid uploads are saved; invalid files are rejected; removal clears the avatar.

**Steps**:
1. Log in as Member; navigate to own profile edit
2. Upload a valid JPEG under 5 MB
3. Expected: avatar displayed in user directory and full profile view
4. Upload a PNG file with a `.txt` extension (MIME check must catch this)
5. Expected: rejection with a specific error; original avatar unchanged
6. Upload a JPEG over 5 MB
7. Expected: rejection with a specific error; original avatar unchanged
8. Click "Remove avatar"
9. Expected: profile shows default no-avatar placeholder; `avatar_path = NULL` in DB

---

## Scenario 11 — Session Expiry and Revocation

**Goal**: Sessions expire as configured; logout revokes the session immediately.

**11a — Logout revokes session**:
1. Log in; note the session token from the cookie
2. Log out
3. Confirm: `sessions.is_revoked = TRUE` for that token in DB
4. Manually re-set the cookie to the old token value (DevTools)
5. Navigate to `/users`: expected redirect to `/login`

**11b — Standard session expiry** (test with shortened duration):
1. Set `SESSION_DURATION_SECONDS=5` for testing
2. Log in; wait 6 seconds
3. Navigate to `/users`: expected redirect to `/login`

---

## Running Automated Tests

```bash
# All tests
npm test

# Unit tests only (no DB required)
npm test -- tests/unit

# Integration tests (requires DATABASE_URL_TEST pointing to a test DB)
DATABASE_URL_TEST=postgres://... npm test -- tests/integration

# Run with verbose output
npm test -- --reporter=verbose
```

Integration tests truncate all tables between test suites. They do not use mocks for the database layer.
