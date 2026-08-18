# Page Contracts: User Role and Account Management

**Feature**: `001-user-role-management` | **Phase**: 1 | **Date**: 2026-08-18

Every page is an App Router Server Component boundary. Public pages reject inappropriate authenticated/restricted state; protected pages call `requireSession()` before loading data; Admin pages additionally call `requireAdmin()`. Rendering a control is never the authorization boundary for its mutation.

## Shared UI and Accessibility Contract

- Components use StyleX and values imported from `@/styles/tokens.stylex`; no raw component CSS values or color literals.
- Every field has a programmatic label, instructions, and an associated error target. Validation summaries link to invalid fields and receive focus after failure.
- Success, error, degraded-email, suspension, lockout, and conflict states use live status semantics and never rely on color alone.
- Keyboard focus is visible and moves predictably after navigation, failed submission, confirmation, and forced-reset redirection.
- Dialogs, when used for confirmation, trap focus, expose a name/description, return focus to the trigger, and support Escape without committing.
- All functions remain usable by keyboard and at 200% zoom. Automated scans have no critical/serious findings; manual keyboard, focus, screen-reader, zoom, and error-identification checks are still required.
- Token-bearing values never render into page markup, analytics, client logs, or links after the token-intake redirect.

## Public Routes

### `GET /login`

**File**: `app/(auth)/login/page.tsx`

**Access**:

- No full or restricted cookie: render login.
- Valid full session after a DB check: redirect `/users`.
- Valid restricted forced-reset authorization after a DB check: redirect `/change-password`.
- Invalid/expired cookie: render login; the next auth action overwrites/clears stale cookies because Server Components cannot mutate them.

**Displays**: canonical email field, password field, Remember Me checkbox, Forgot Password link, submit button, and live error/status region.

**Submit**: `login`. Success creates either a full session and redirects `/users`, or a restricted forced-reset authorization and redirects `/change-password`. Suspended and lockout messages are explicit as required; unknown email and wrong password share the generic credential error.

### `GET /register`

**File**: `app/(auth)/register/page.tsx`

**Access**: Requires the short-lived invitation-flow HttpOnly cookie set by `GET /auth/invitation?token=...`. A missing, invalid, expired, wrong-purpose, post-registration, or rate-limited flow renders one non-secret error state and cannot create an account.

**Displays**: read-only canonical invited email, required First Name/Last Name, password and confirmation, full password rules, submit button, and explicit notice that invitation resends do not invalidate earlier authentic links.

**Submit**: `register`. The flow credential comes from the cookie rather than a client field. Success atomically creates one Member and a fixed two-hour full session, consumes the flow cookie, sets the session cookie, and redirects `/users?registered=true`. A concurrent losing registration receives the normal email-in-use result and no session.

### `GET /reset-password`

**File**: `app/(auth)/reset-password/page.tsx`

**State A — request form**: No reset-flow cookie. Displays canonical email field and submit button. `requestPasswordReset` always returns the same generic confirmation and live announcement, including when no account exists or SMTP fails.

**State B — password form**: A valid short-lived reset-flow cookie exists after `GET /auth/password-reset?token=...`. Displays new password, confirmation, rules, and submit. `completePasswordReset` consumes the DB token, changes the password, revokes sessions/restricted authorizations, clears the cookie, and redirects `/login?reset=true`.

**Invalid flow**: Missing, expired, used, superseded, wrong-purpose, tampered, or rate-limited credentials show one safe failure with a link to request a new reset.

### `GET /change-password`

**File**: `app/(auth)/change-password/page.tsx`

**Access**: Requires a valid restricted forced-reset cookie/row and a current active Member with `force_password_reset=true`. It must not accept a full session as authorization. Missing/expired/revoked authorization clears cookies and redirects `/login?forcedResetExpired=true`.

**Displays**: explanation that access is restricted, new password, confirmation, rules, and submit. No application navigation or profile data is rendered.

**Submit**: `completeForcedPasswordReset`. Success updates the password, clears the flag, consumes/revokes restricted authorizations and full sessions, clears cookies, and redirects `/login?passwordChanged=true`. A fresh login is required.

## Protected Routes

All protected pages call `requireSession()` and use the current joined user row. A cookie's existence in Proxy is only a first-pass routing hint.

### `GET /users`

**File**: `app/(shell)/users/page.tsx`

**Access**: Any valid active Admin or Member full session.

**Displays**: all Admin and Member accounts, including suspended accounts, with authenticated avatar/default placeholder, First Name, Last Name, Role, and profile link. Blank optional fields remain absent. Directory data is never cached publicly.

**Admin control**: Invite Member link appears only for a current Admin. The underlying page/action still calls `requireAdmin()`.

### `GET /users/[id]`

**File**: `app/(shell)/users/[id]/page.tsx`

**Access**: Any valid full session; unknown ID returns not found without exposing data publicly.

**Displays**: authenticated avatar/default, normalized First Name/Last Name, read-only Role, Phone Number if present, Slack Handle if present, and account status where the current product UI requires it.

**Controls**:

- Edit appears for self, or for a current Admin viewing a current Member.
- Suspend/Reinstate, Force Password Reset, and Promote appear only for a current Admin viewing an eligible current Member. Promote is absent for suspended Members.
- No account-deletion control exists for any role/state.

After a successful mutation the destination read waits for committed data and shows a live success message. Conflict/no-longer-eligible responses leave the current state intact and prompt a refresh.

### `GET /users/[id]/edit`

**File**: `app/(shell)/users/[id]/edit/page.tsx`

**Access**: Self, or current Admin editing a current Member. A Member editing another user or an Admin targeting any Admin is rejected server-side.

**Displays**: First Name, Last Name, Phone Number, Slack Handle, avatar preview/upload/remove controls, read-only Role, Save, and Cancel. The file picker accepts JPEG/PNG as a hint but server-side decoded-content validation is authoritative. Upload guidance states 5 MB and 4096×4096 input limits plus processed-output behavior.

**Submit**: One `updateProfile` Server Action receives normalized text intent and `avatarAction=keep|replace|remove` plus an optional file. Profile fields and avatar reference are one committed change; failure preserves all prior fields and avatar.

### `GET /admin/invitations`

**File**: `app/(shell)/admin/invitations/page.tsx`

**Access**: Current Admin only. A Member is rejected/redirected without recipient details.

**Displays**: canonical email field, Send Invitation, email-capability status, and the mandatory FR-063 warning: each authentic stateless link remains usable until its own seven-day expiry or registration of that canonical email, and resend does not cancel earlier links.

**Submit**: `sendInvitation`. Success appears only after SMTP acceptance and repeats the non-revocation warning. Provider rejection/timeout is a retryable visible failure. Registered/suspended canonical-email ownership is rejected. Rate-limit responses do not reveal another user's activity.

## Navigation and Data Freshness

- Protected layouts contain no forced-reset bypass; restricted users never receive the shell.
- Server mutations call the appropriate immediate cache invalidation/refresh before redirect so the next directory/profile read reflects committed data.
- Profile/avatar URLs include only user IDs and optional non-secret version keys; they never expose filesystem paths.
- Authenticated pages and avatar responses prohibit shared/public caching.
