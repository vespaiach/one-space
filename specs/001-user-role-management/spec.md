# Feature Specification: User Role and Account Management

**Feature Branch**: `001-user-role-management`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Develop user role and account management with two user roles: Admin and Member."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invitation-Based User Registration (Priority: P1)

A new person cannot self-register. An Admin sends them an invitation email. The invitee follows the link, fills in their First Name, Last Name, and chosen password, and completes registration. They are automatically assigned the Member role and can immediately log in.

**Why this priority**: This is the only entry point into the system. Without a working invitation and registration flow, no other feature is accessible.

**Independent Test**: Can be fully tested by having an Admin send an invitation, the recipient opening the link and completing sign-up, then verifying the new account appears as a Member in the user list.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** the Admin submits a valid email address to invite a user, **Then** an invitation email is sent to that address containing a unique, time-limited registration link.
2. **Given** a valid, unexpired invitation link for an email address not yet registered, **When** the invitee opens the link and submits their First Name, Last Name, and chosen password in a single registration form, **Then** a new account is created with the Member role and the invitee can immediately log in.
3. **Given** an expired invitation link, **When** the invitee opens the link, **Then** the system informs them the link has expired and no account is created.
4. **Given** a valid invitation link where the invited email address is already registered, **When** someone attempts to use the link to register, **Then** the system rejects the request because the email address is already in use and no duplicate account is created.
5. **Given** an unauthenticated user, **When** they attempt to access the registration page without a valid invitation link, **Then** they are denied and cannot create an account.
6. **Given** multiple valid invitation links for the same unregistered canonical email, **When** registration attempts use them concurrently, **Then** exactly one account and profile are created, only the winning attempt receives a session, and every losing attempt receives the same email-in-use result as an ordinary post-registration attempt.

---

### User Story 2 - Initial Admin Account Setup (Priority: P2)

Before any users exist, the system needs at least one Admin. An operator configures the initial Admin credentials during deployment. That Admin can then log in and begin inviting users.

**Why this priority**: The entire invitation flow depends on at least one Admin account existing. Deployment-time setup must work before any other scenario can be tested.

**Independent Test**: Can be fully tested by deploying the system with a predefined Admin configuration, logging in with those credentials, and confirming Admin-level access is available.

**Acceptance Scenarios**:

1. **Given** a fresh deployment with a predefined Admin configuration, **When** the configured Admin credentials are used to log in, **Then** the user gains Admin-level access.
2. **Given** an empty database without valid initial Admin configuration, **When** the system starts, **Then** startup fails before the application accepts user traffic and identifies the invalid or missing configuration.
3. **Given** a database that already contains an active Admin, **When** the application is deployed again with unchanged, changed, or absent initial Admin configuration, **Then** no account is created or modified and the existing Admin credentials and profile are preserved.
4. **Given** a non-empty database with no active Admin, **When** the system starts, **Then** startup fails with a clear recovery message and does not silently create or promote an account.

---

### User Story 3 - Profile Viewing for All Users (Priority: P3)

Any logged-in user — whether Admin or Member — can browse the full list of user profiles and view the details of any individual profile.

**Why this priority**: Visibility of team members is a fundamental collaboration need, required before management actions become meaningful.

**Independent Test**: Can be tested independently by logging in as a Member and verifying they can navigate to and read any user's profile, including Admins.

**Acceptance Scenarios**:

1. **Given** a logged-in Member, **When** they navigate to the user directory, **Then** they see a list of all Admin and Member accounts, each showing Avatar, First Name, Last Name, and Role.
2. **Given** a logged-in Member, **When** they open any user's full profile, **Then** they can view all profile fields — First Name, Last Name, Role, Avatar, Phone Number, and Slack Handle — without restriction.
3. **Given** a logged-in Admin, **When** they navigate to the user directory, **Then** they see the same full list including all roles, with the same Avatar, First Name, Last Name, and Role fields per row.

---

### User Story 4 - Self-Profile Editing (Priority: P4)

Any logged-in user can update their own profile information: First Name, Last Name, Avatar, Phone Number, and Slack Handle. Role is a read-only system field and cannot be changed by the user.

**Why this priority**: Self-service profile management is a basic user expectation and has no dependency on Admin actions.

**Independent Test**: Can be tested by a Member editing their own profile and confirming the updated values are saved and displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their own profile edit page, **When** they update their First Name or Last Name and save, **Then** the changes are committed before success is reported and appear on the next read of the user directory or full profile.
2. **Given** a logged-in user, **When** they submit a profile update with First Name or Last Name left blank, **Then** the system rejects the submission with a specific error indicating those fields are required.
3. **Given** a logged-in user, **When** they save a valid Phone Number or Slack Handle value or leave either field blank, **Then** the value is normalized and saved according to FR-047 or FR-048, with a blank value stored as absent.
4. **Given** a logged-in user, **When** they view their own profile edit form, **Then** the Role field is displayed as read-only and the form provides no way to change it.
5. **Given** a logged-in user, **When** they attempt to edit another user's profile through the self-edit interface, **Then** the system rejects the action.

---

### User Story 5 - Admin Member Account Management (Priority: P5)

An Admin can edit, suspend, or reinstate any Member account. A suspended account cannot log in, but its account and profile data are retained. Account deletion is not supported.

**Why this priority**: Administrative control over Members is essential for compliance and access governance, but depends on Members existing first.

**Independent Test**: Can be tested by an Admin suspending a Member account and verifying the Member can no longer log in.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they update any of a Member's profile fields — First Name, Last Name, Phone Number, or Slack Handle — and save, **Then** the changes are committed before success is reported and appear on the next read of the Member's profile.
2. **Given** a logged-in Admin, **When** they suspend a Member account, **Then** the account is marked suspended and the Member cannot log in until reinstated.
3. **Given** a suspended Member, **When** they attempt to log in, **Then** they are denied with an explicit message stating their account is suspended and directing them to contact their administrator.
4. **Given** a logged-in Member, **When** they attempt to perform Admin management actions, **Then** the system rejects those actions.
5. **Given** a logged-in Admin, **When** they trigger a forced password reset on a Member account, **Then** the Member is required to set a new password the next time they log in before accessing any other part of the system.
6. **Given** a suspended Member, **When** a logged-in Admin reinstates the account, **Then** the account returns to active status and can log in with its existing password, subject to any existing temporary lockout or forced-password-reset requirement.
7. **Given** any authenticated user or Admin, **When** they inspect account-management controls or submit a crafted account-deletion request, **Then** no delete action is available and the request is rejected without changing the account or profile.

---

### User Story 6 - Promote Member to Admin (Priority: P6)

An existing Admin can elevate any Member to the Admin role, granting them full administrative privileges.

**Why this priority**: Role promotion is important for team growth but is an infrequent operation that depends on Members and Admin management already working.

**Independent Test**: Can be tested by promoting a Member to Admin and verifying the promoted user can then perform Admin actions such as inviting new users.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they promote an active Member to Admin, **Then** the Member's role changes to Admin before success is reported and every existing valid session gains Admin-level access on its next protected request.
2. **Given** a newly promoted Admin, **When** they log in, **Then** they can perform Admin actions such as sending invitations and managing Members.
3. **Given** a logged-in Member, **When** they attempt to promote another user's role, **Then** the system rejects the action.

---

### User Story 7 - Self-Service Password Reset (Priority: P7)

A user who has forgotten their password can request a reset from the login page. They receive an email with a time-limited reset link, follow it, set a new password, and regain access.

**Why this priority**: Without self-service reset, users are locked out whenever they forget their password until an Admin intervenes — creating an operational bottleneck.

**Independent Test**: Can be tested by logging out, requesting a password reset for a known account, following the emailed link, setting a new password, and confirming login with the new credentials succeeds.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user on the login page, **When** they submit their registered email address via the "Forgot Password" form, **Then** a password-reset email is sent to that address containing a unique, time-limited link.
2. **Given** a valid, unexpired password-reset link, **When** the user submits a new password meeting strength requirements, **Then** their password is updated and the reset link is invalidated.
3. **Given** an expired or already-used password-reset link, **When** the user follows it, **Then** the system rejects the request and prompts them to request a new reset.
4. **Given** a user requests a password reset for an email address not associated with any account, **When** they submit the form, **Then** the system responds with a generic confirmation (no account enumeration) and sends no email.
5. **Given** a suspended user who requests a password reset, **When** they follow the reset link and set a new password, **Then** the password is updated but the account remains suspended; login is still denied until reinstated by an Admin.

---

### User Story 8 - Profile Picture Management (Priority: P8)

A logged-in user can upload a profile picture to personalise their account, replace an existing one, or remove it entirely. Admins can perform the same actions on any Member's profile picture.

**Why this priority**: Profile picture management depends on the profile editing flow (US4) being in place. It is a lower-urgency personalisation feature relative to core account and role management.

**Independent Test**: Can be tested by uploading a valid image and verifying it appears in the user directory and full profile, then uploading an invalid file and verifying rejection, then removing the avatar and verifying the default no-avatar state is displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their profile edit page, **When** they upload a JPEG or PNG image under 5 MB, **Then** the image is saved and displayed as their avatar in both the user directory and their full profile.
2. **Given** a logged-in user, **When** they upload a file that is not a JPEG or PNG, **Then** the system rejects the upload with a specific error message and the existing avatar (if any) remains unchanged.
3. **Given** a logged-in user, **When** they upload a file exceeding 5 MB, **Then** the system rejects the upload with a specific error message before saving anything and the existing avatar (if any) remains unchanged.
4. **Given** a logged-in user with an existing avatar, **When** they remove their avatar, **Then** the avatar is deleted and their profile displays a default no-avatar state in both the user directory and the full profile.
5. **Given** a logged-in Admin, **When** they upload or remove an avatar on any Member's profile and save, **Then** the Member's profile reflects the Admin's change.
6. **Given** a logged-in Member, **When** they attempt to change another user's avatar through the self-edit interface, **Then** the system rejects the action.
7. **Given** a user replaces an existing avatar as part of a profile save, **When** file validation, durable writing, or the profile commit fails, **Then** the whole save fails, the prior avatar and all prior profile fields remain visible, and no unreferenced replacement file remains.
8. **Given** a logged-in user whose profile has no avatar, **When** they request avatar removal, **Then** the request succeeds as a no-op, no profile data changes, and the default no-avatar state remains visible without an error.

---

### Edge Cases

- What happens when an invitation link expires before the user signs up? The link is rejected and the recipient must request a new invitation from an Admin.
- What if an Admin attempts to edit, suspend, or demote any Admin account, including their own? The system rejects the request because Admin management actions target Members only; the one-active-Admin invariant is also checked atomically during every bootstrap and account-state mutation.
- What if an Admin tries to invite an email address that already has an account? The system rejects the invitation with a clear message.
- What if invited, registered, or password-reset email input differs only by letter case or surrounding whitespace? Every flow compares the FR-049 canonical form, so those variants identify the same address. Provider-specific aliases, including `+tag` variants or dotted local parts, remain distinct addresses.
- What if the invitee submits a password that does not meet the required strength criteria? The registration form rejects the submission and prompts them to choose a stronger password before the account is created.
- What if a user requests multiple password resets in quick succession? Only the most recently issued reset link is valid; prior links are invalidated.
- What if a suspended user successfully resets their password? Their password is updated but the account remains suspended; they cannot log in until an Admin reinstates them.
- What if an Admin invites an address owned by a suspended account, or the suspended user opens an invitation or password-reset link? The invitation is rejected and every invitation link for that registered canonical email is unusable. A valid password-reset link may change the password, but it neither releases the email nor reinstates the account.
- What happens when an account is temporarily locked due to failed login attempts? The user is shown a message indicating the account is temporarily locked and when they may try again; the lockout lifts automatically after the lockout period.
- Does a failed login attempt against a suspended account count toward the lockout threshold? No — the suspended-account rejection fires before credential checking, so the counter is not incremented.
- What if a user uploads an avatar in an unsupported format or exceeding 5 MB? The system rejects the upload before saving anything and returns a specific error message indicating which constraint was violated; the existing avatar (if any) is unchanged.
- What if avatar replacement fails after processing or writing the candidate file? The whole profile save fails, the prior avatar and all profile fields remain unchanged, and any partial or unreferenced candidate file is removed.
- What if a user removes their avatar when they have never uploaded one? The system treats the remove action as a no-op; the profile continues to display the default no-avatar state with no error.
- What if a Member with a forced password reset tries to navigate to the app before resetting? They are blocked at login and redirected to a password-change screen; no other page is accessible until the reset is complete.
- What if an invitation is expired, lost, delayed, or not accepted by the email service? An Admin may send a new invitation to the same unregistered canonical email. Each accepted send creates an independent 7-day link; resending cannot revoke earlier stateless links, and any unexpired link becomes unusable as soon as one registration commits.
- What if the email service rejects or times out while sending? Invitation sending reports a retryable failure and MUST NOT claim success. Password-reset requests keep the same generic user response to prevent account enumeration, while the delivery failure is recorded for operators. Core login and profile features remain available.
- What if an email is delivered more than once? Duplicate messages do not extend validity or create new credentials. A reset link remains single-use, and concurrent invitation registrations for one canonical email create exactly one account; losing attempts receive the existing email-in-use result.
- What if a forced-reset Member is suspended, locked, already signed in, or lets the restricted password-change gate expire? Assignment revokes existing sessions; suspension and an unexpired lockout are enforced before the gate; an expired gate requires credential authentication again while the forced-reset flag remains set.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support exactly two user roles: Admin and Member.
- **FR-002**: On an empty database, the system MUST require valid deployment-time configuration and create exactly one initial Admin account without requiring an invitation before accepting user traffic.
- **FR-003**: Admins MUST be able to send an invitation email to any email address not already associated with an account.
- **FR-004**: New users MUST only be able to register by following a valid, unexpired invitation link; self-registration without an invitation MUST be rejected.
- **FR-004a**: The invitation registration form MUST collect the invitee's First Name, Last Name, and chosen password in a single step; no temporary password or secondary email is issued. Avatar, Phone Number, and Slack Handle are not required at registration and may be set later via profile editing.
- **FR-004b**: The system MUST enforce minimum password strength requirements and reject registration if the chosen password does not meet them, with a specific error message.
- **FR-005**: All newly registered users MUST be automatically assigned the Member role upon completing registration.
- **FR-006**: The system MUST reject registration attempts where the invitation link has expired or the invited email address is already registered.
- **FR-007**: The system MUST reject invitation attempts for canonical email addresses owned by any registered account, including a suspended account.

**Requirement identifier note**: FR-008 is intentionally retired. It previously represented server-side invitation records, which were removed when invitations became stateless. Existing identifiers are not renumbered so references in review and planning artifacts remain stable.

- **FR-009**: Any logged-in user (Admin or Member) MUST be able to view the profile of any other user in the system, regardless of role.
- **FR-010**: Any logged-in user MUST be able to edit and save changes to their own personal profile.
- **FR-011**: The system MUST prevent users from editing another user's profile through the self-edit interface.
- **FR-012**: Admins MUST be able to edit the profile information of any Member account.
- **FR-013**: Admins MUST be able to suspend any Member account. The suspended status MUST be committed and all sessions for that Member MUST be revoked before success is reported, so every subsequent login or protected request is denied.
- **FR-014**: The application MUST NOT provide or execute account deletion for any role. Member accounts may only transition between active and suspended states, and suspension MUST retain the account, canonical-email ownership, profile, avatar, sessions, and password-reset history subject to their ordinary expiry or revocation rules. While suspended, the canonical email MUST remain unavailable for invitation or registration, every invitation link for it MUST be rejected as already registered, and valid password-reset links MUST remain usable only to change the retained account's password without reinstating it. Crafted or direct deletion requests MUST be rejected without changing data.
- **FR-015**: The system MUST reject login attempts from suspended accounts with an explicit message stating the account is suspended and directing the user to contact their administrator; this message MUST be distinct from an invalid-credentials error.
- **FR-016**: Admins MUST be able to promote any active Member to the Admin role. The role change MUST be committed before success is reported and MUST grant full administrative privileges to every existing valid session on its next protected request; promotion MUST NOT require session revocation or a new login. A suspended Member MUST NOT be promoted.
- **FR-017**: Admin management actions in this feature MUST target Member accounts only. The system MUST reject every attempt to edit, suspend, or demote an Admin account, including the acting Admin's own account. Independently, bootstrap and every account role or status mutation MUST preserve at least one active Admin.
- **FR-018**: Members MUST NOT be able to perform any Admin-only actions (invite users, manage Member accounts, promote roles).
- **FR-019**: Any user MUST be able to request a password-reset email from the login page by providing their registered email address.
- **FR-020**: The system MUST send a unique, single-use password-reset link to the user's registered email address upon request. The link's validity period MUST begin when the reset request is accepted and MUST end exactly 60 minutes later; it MUST be accepted before the expiry timestamp and rejected at or after that timestamp.
- **FR-021**: The system MUST reject password-reset requests for unknown email addresses without revealing whether the address exists (generic confirmation response to prevent account enumeration).
- **FR-022**: When a new password-reset link is issued, any previously issued and unused reset links for that account MUST be invalidated.
- **FR-023**: A suspended user who resets their password MUST still be denied login; password reset does not lift a suspension.
- **FR-024**: The system MUST temporarily lock a user account when a failed login reaches the configured consecutive-failure threshold. The threshold MUST be a positive integer configurable at deployment time and MUST default to 5 failed attempts.
- **FR-025**: The lockout duration MUST be a positive whole number of minutes configurable at deployment time and MUST default to 15 minutes, measured from the failed attempt that triggered the lockout. A successful login before the threshold or expiry of the lockout period MUST reset the consecutive-failure count to zero; password reset, suspension, and reinstatement MUST NOT end an unexpired lockout.
- **FR-026**: The system MUST reject every login attempt during the lockout period. When a login attempt is blocked, the system MUST inform the user that the account is temporarily locked and give the exact time at which another attempt is permitted. At that time the account MUST unlock automatically without Admin intervention.
- **FR-027**: Admins MUST be able to flag any Member account as requiring a password reset.
- **FR-028**: A Member flagged for a forced password reset MUST be prompted to set a new password immediately upon their next login; no other part of the system MUST be accessible until the reset is completed.
- **FR-029**: Once the Member successfully sets a new password, the forced-reset flag MUST be cleared and normal access restored.
- **FR-030**: A User Profile MUST include the following fields: First Name (required), Last Name (required), Role (read-only, system-assigned), Avatar (optional profile picture), Phone Number (optional free-text subject only to FR-047), and Slack Handle (optional and subject to FR-048).
- **FR-031**: The Role field MUST be read-only in all profile view and edit interfaces; it MUST only change via Admin-initiated promotion (FR-016) or initial system assignment.
- **FR-032**: The user directory listing MUST display Avatar, First Name, Last Name, and Role for each user. The full profile detail view MUST additionally display Phone Number and Slack Handle. Any logged-in user MUST be able to access both views for any user in the system.
- **FR-033**: A user MUST be able to update their own First Name, Last Name, Avatar, Phone Number, and Slack Handle; the Role field MUST NOT be editable by the user themselves. A user MUST also be able to remove their avatar, returning the profile to a default no-avatar state. Removing an avatar when none exists MUST succeed as a no-op without changing profile data or reporting an error.
- **FR-034**: An Admin MUST be able to view and override the First Name, Last Name, Avatar, Phone Number, and Slack Handle of any Member account.
- **FR-035**: Avatar uploads MUST be restricted to JPEG and PNG formats with a maximum file size of 5 MB; uploads exceeding these constraints MUST be rejected with a specific error message before the file is persisted.
- **FR-036**: Admins MUST be able to reinstate a suspended Member by changing only the account status to active; reinstatement MUST preserve the Member's password, temporary-lockout state, and forced-password-reset flag.
- **FR-037**: A successful login MUST create a server-revocable authenticated session and set its expiry when the session is created.
- **FR-038**: A standard session MUST expire 2 hours after creation. The login form MUST offer an optional Remember Me choice that instead sets a 21-day expiry.
- **FR-039**: Session expiry MUST be fixed rather than sliding; activity MUST NOT renew a session, and an expired session MUST require a new login.
- **FR-040**: Logging out MUST revoke the current session. Suspending an account, completing any password change or reset, or assigning a forced-password-reset requirement MUST revoke all sessions for the affected account before the action is reported as complete.
- **FR-041**: Retired. Permanent account deletion and all deletion-side effects are removed from this feature; FR-014 is the normative no-deletion requirement. The identifier remains reserved so existing references are not renumbered.
- **FR-042**: Initial Admin bootstrap MUST be idempotent. If an active Admin already exists, repeat deployment MUST NOT create, overwrite, reset, promote, or otherwise modify any account, regardless of whether the bootstrap configuration is unchanged, changed, or absent.
- **FR-043**: If the database is empty and the initial Admin configuration is missing or invalid, or if a non-empty database contains no active Admin, the system MUST fail startup before accepting user traffic and MUST report the condition without silently creating or promoting an account.
- **FR-044**: Changing deployment-time initial Admin credentials MUST NOT rotate an existing Admin's credentials. Existing Admin credentials MUST be rotated through the authenticated or email-based password-reset flow.
- **FR-045**: Every successful access or profile change MUST use committed account data on the affected user's next protected request or profile read. Authorization checks MUST use the current role, status, and forced-password-reset flag rather than values captured when a session was created. Suspension, password change or reset, and assignment of a forced-password-reset requirement MUST revoke existing sessions under FR-040; promotion and profile updates MUST preserve existing sessions. Profile changes MUST appear on the next read after success, and completion of any password change or reset MUST require a fresh login.
- **FR-046**: First Name and Last Name MUST each be normalized by trimming leading and trailing Unicode whitespace, converting to Unicode NFC, and collapsing each internal whitespace sequence to one space. After normalization, each name MUST contain 1–100 Unicode characters and only letters, combining marks, spaces, apostrophes, periods, or hyphens; all other characters MUST be rejected.
- **FR-047**: Phone Number MUST be optional free text with no phone-format validation. When supplied, it MUST be normalized by trimming leading and trailing Unicode whitespace and converting to Unicode NFC; an empty result MUST be stored as absent, while a non-empty result MUST contain 1–50 printable Unicode characters with no control characters.
- **FR-048**: Slack Handle MUST be optional. When supplied, it MUST be normalized by trimming leading and trailing Unicode whitespace, removing one optional leading `@`, and converting ASCII letters to lowercase; an empty result MUST be stored as absent, while a non-empty result MUST contain 1–80 characters drawn only from lowercase ASCII letters, digits, periods, underscores, and hyphens. Internal whitespace MUST be rejected.
- **FR-049**: Every email value from Admin invitation input, an invitation-link payload, registration input, login input, or password-reset input MUST use the same canonical form: trim leading and trailing Unicode whitespace, require 3–254 ASCII characters with exactly one `@`, a non-empty local part of at most 64 characters, and a syntactically valid non-empty domain, then lowercase the full address. Internal whitespace and control characters MUST be rejected. Uniqueness, invitation eligibility, registration, and account lookup MUST compare the canonical form, so case-only or surrounding-whitespace variants identify the same address. Provider-specific transformations such as removing `+tag` suffixes or dots MUST NOT be applied, so provider aliases remain distinct canonical addresses.
- **FR-050**: Every suspension, reinstatement, promotion, and last-active-Admin check MUST execute as one atomic transaction against current account state. When concurrent requests target the same account or could affect the active-Admin invariant, at most one conflicting transition may commit; every loser MUST be rejected as a conflict or as no longer eligible, and the final state MUST satisfy FR-017. If promotion commits first, later Member-only mutations MUST reject the now-Admin target; if suspension commits first, later promotion MUST reject the inactive target.
- **FR-051**: An Admin MUST be able to resend an invitation whenever the canonical email remains unregistered, including after an earlier link expires, is lost, is delayed, or fails delivery. Every send accepted by the email service MUST contain a newly issued 7-day stateless link. Resending MUST NOT invalidate an earlier link; registration of the email MUST atomically make every other invitation for that email unusable.
- **FR-052**: An invitation MUST be reported as sent only after the external email service accepts the message. Rejection or timeout MUST return a retryable Admin-visible failure without creating an account. Password-reset requests MUST always return the same generic response, but delivery rejection or timeout MUST be recorded as an operator-visible failure. Delayed or duplicate delivery MUST NOT extend link expiry, restore a superseded link, bypass single-use enforcement, or produce duplicate accounts.
- **FR-053**: Loss of the external email service MUST NOT prevent login, logout, profile viewing or editing, or Admin account-state actions that do not send email. During an outage, invitation attempts MUST fail visibly and remain safe to retry; password-reset requests MUST preserve the anti-enumeration response while surfacing the failure to operators. Service health MUST identify the degraded email capability without exposing recipient addresses or tokens.
- **FR-054**: Assigning a forced-password-reset requirement MUST revoke every existing session before success is reported. A suspended Member MUST remain denied before credential validation, and a temporarily locked Member MUST wait until lockout expiry. After valid credentials, the Member MUST receive a restricted password-change authorization that exposes no other feature and expires after 15 minutes. Expiry MUST leave the forced-reset flag set and require credential authentication again; successful completion MUST clear the flag, revoke the restricted authorization and all other sessions, and require a fresh login.
- **FR-055**: Invitation registration and account creation MUST be atomic with canonical-email uniqueness. If multiple valid invitations for the same unregistered email are used concurrently, exactly one account MAY be created; every losing attempt MUST create no profile or session and MUST return the same email-in-use outcome as FR-006.
- **FR-056**: Authentication forms, profile views and forms, status and error messages, avatar controls, Admin actions, and the forced-reset gate MUST conform to WCAG 2.2 Level AA. Every function MUST be operable by keyboard alone with visible focus; fields and controls MUST have programmatic names and instructions; validation errors MUST identify and link to the affected field; status changes and errors MUST be announced to assistive technology without relying on color alone; focus MUST move predictably after navigation, validation failure, modal confirmation, and forced-reset redirection.
- **FR-057**: Invitation, password-reset, restricted forced-reset, and session credentials MUST provide at least 128 bits of effective unpredictability and MUST be bound to one purpose and expiry. Tokens carried in links MUST provide confidentiality and tamper detection for their payload. Raw password-reset and session tokens MUST never be stored at rest; only one-way hashes MAY be stored. Token comparisons MUST resist timing disclosure, and invalid, modified, wrong-purpose, used, superseded, or expired tokens MUST be rejected.
- **FR-058**: All credential-bearing requests MUST use HTTPS. Session cookies MUST be Secure, HttpOnly, SameSite=Lax, limited to the application path, and expire no later than their server-side session. Token-bearing URLs and raw tokens MUST be excluded from application logs, analytics, error reports, and outbound referrers; after token intake, the browser-visible URL MUST no longer contain the token.
- **FR-059**: Abuse controls MUST enforce all of the following rolling limits in addition to FR-024: at most 30 login attempts per source address per 15 minutes; 20 invitation sends per Admin per hour and 5 per canonical recipient per day; 5 password-reset requests per canonical email per hour and 20 per source address per hour; and 30 invitation or reset-token validation failures per source address per 15 minutes. Exceeding a limit MUST reject or defer the action without revealing account existence, token validity, or another user's activity, and MUST produce an operator-visible security event without logging secrets.
- **FR-060**: The user directory and full profiles, including Phone Number, Slack Handle, and avatars, are an intentional authenticated-team disclosure for this single-organization deployment and MUST NOT be accessible to unauthenticated users. Optional fields MUST remain absent when blank. Suspended-account data MUST remain available only to authenticated users and MUST be retained for possible reinstatement. Profile values, credentials, and avatar contents MUST be excluded from routine logs; security audit events MAY contain actor ID, target ID, action, outcome, and timestamp but MUST NOT contain raw tokens, passwords, phone numbers, Slack handles, or image data.
- **FR-061**: Avatar validation MUST use decoded file content rather than filename or declared media type alone. The system MUST reject undecodable, mismatched, animated, or embedded active content; remove metadata by re-encoding; accept only JPEG or PNG input no larger than 5 MB or 4096 by 4096 pixels; and persist a non-animated JPEG or PNG no larger than 512 by 512 pixels and 1 MB while preserving aspect ratio. Avatar delivery MUST require an authenticated user and use private caching. Replacement MUST validate and durably write the new file before atomically committing the new profile state and avatar reference. Any validation, write, or commit failure MUST fail the whole profile save, preserve the prior file, avatar reference, and all prior profile fields, and remove any partial or unreferenced candidate file. The prior file MUST be deleted only after the new reference commits. Removing an absent avatar MUST succeed as a no-op.
- **FR-062**: Avatar files MUST reside on a durable deployment volume outside release directories so application deployment and rollback cannot overwrite or delete them. The database and avatar volume MUST receive coordinated encrypted backups at least daily and retain those backups for 30 days; restoration MUST restore a mutually consistent snapshot, verify referenced files, and fall back to the default avatar for any missing file while reporting the mismatch. A production-like restore exercise MUST be completed at least quarterly.
- **FR-063**: Because individual stateless invitation links cannot be revoked, every Admin invitation interface and successful-send confirmation MUST state that resending does not invalidate earlier links and that each authentic link remains usable until its 7-day expiry or registration of the canonical email. Acceptance tests MUST prove payload tampering, wrong-purpose use, expiry, and use after registration are rejected; operator guidance MUST treat a misdirected link as valid until one of those conditions occurs and MUST prohibit claiming that a resend cancels it.

### Key Entities

- **User Account**: Represents a registered user; has a role (Admin or Member), a unique canonical email address defined by FR-049, a status (active, suspended), a password-reset-required flag, and a creation timestamp.
- **User Profile**: The personal details associated with a User Account. Fields: First Name and Last Name (required and normalized under FR-046), Role (read-only, system-assigned Admin or Member), Avatar (optional profile picture linked to the user's account; absent by default), Phone Number (optional and normalized under FR-047), Slack Handle (optional and normalized under FR-048); owned by one User Account.
- **Authenticated Session**: Represents one login session for a User Account; has a creation time, fixed expiry, and revocation state. A User Account may have multiple sessions, all of which can be revoked together after security-sensitive account changes.
- **Password-Reset Link**: A single-use credential associated with one User Account, with an issuance timestamp and an expiry timestamp exactly 60 minutes later. New issuance supersedes earlier unused links; account suspension does not remove reset-link history or lift the suspension.
- **Invitation Link**: A time-limited token embedded in a registration URL; contains the recipient's email address and an expiry timestamp. Validity is assessed at registration time by verifying the link has not expired and the email address is not yet registered. No server-side state is stored for invitations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A recipient can complete invitation registration in under 3 minutes, measured from the delivery timestamp recorded by the recipient's email service until the registration-success confirmation is displayed. Time spent by the external email service before recorded delivery is excluded from this three-minute measure and MUST be reported separately under the email-availability criteria.
- **SC-002**: 100% of successful registrations originate from valid, unexpired invitation links — no account can be created without one.
- **SC-003**: From a rendered user list, an Admin can complete edit, suspend, reinstate, or promote within at most 3 control activations. A control activation is one click, tap, or keyboard activation that advances the task; text entry, pointer movement, scrolling, and focus traversal do not count. Measurement ends when success is displayed and the committed state is visible.
- **SC-004**: At least 95% of 100 consecutive profile-view navigations MUST display the complete profile within 2.0 seconds, measured in a production-equivalent single-server environment containing 20 users and serving 10 concurrent authenticated users. Measurement begins at browser navigation and ends when all textual profile fields and the avatar or default placeholder are visible; the first cold-start request after deployment is measured separately and excluded.
- **SC-005**: The system enforces role boundaries such that no Member can trigger or complete any Admin-only action, verified by attempting all Admin actions as a Member.
- **SC-006**: The system is never left without at least one active Admin account; 100% of Admin-targeting management attempts and conflicting concurrent mutations are rejected or serialized so the invariant remains true.
- **SC-007**: On an empty database, valid bootstrap configuration creates exactly one usable Admin before the application accepts traffic; every repeat deployment preserves the existing account count, credentials, roles, and profiles, and every startup with existing data but no active Admin fails clearly.
- **SC-008**: 100% of valid self-profile and avatar changes appear in the directory and profile on the next view, while 100% of rejected avatar uploads leave the prior avatar unchanged.
- **SC-009**: 100% of successful suspension, reinstatement, promotion, and forced-password-reset actions are enforced on the affected user's next protected request without waiting for an existing session to expire.
- **SC-010**: An active registered user can complete self-service password reset within 5 minutes after receiving the email, and 100% of used, expired, or superseded reset links are rejected.
- **SC-011**: No account-deletion control or supported request exists for any role, and 100% of crafted deletion attempts are rejected without changing the account, profile, avatar, sessions, password-reset records, or canonical-email ownership.
- **SC-012**: In 100% of lockout tests, the configured threshold-triggering failure blocks further login attempts through the exact lockout end time, and the first valid attempt at or after that time is accepted within 1 second without Admin intervention.
- **SC-013**: In 100% of forced-reset tests, existing sessions are unusable before the Admin sees success, the Member's next valid login reaches only the password-change gate, and completing a compliant password change clears the flag and permits a fresh login within 2 minutes.
- **SC-014**: In 100% of avatar tests, a valid upload, replacement, or removal is visible on the next profile read, while every rejected or interrupted replacement preserves the prior avatar and profile state.
- **SC-015**: In 100% of reinstatement tests, the account becomes active before the Admin sees success and the Member's next valid login is accepted unless an independently preserved lockout or forced-reset requirement applies.
- **SC-016**: Every in-scope page passes automated accessibility checks with no critical or serious findings and passes manual keyboard, focus-order, screen-reader announcement, zoom-to-200%, and error-identification tests against WCAG 2.2 Level AA.
- **SC-017**: Security tests reject 100% of tampered, wrong-purpose, expired, used, superseded, or post-registration tokens and confirm that raw credentials appear in none of the inspected database rows, logs, analytics payloads, error reports, or referrer headers.
- **SC-018**: Boundary tests for every FR-059 limit accept the final permitted request, reject the first excess request, preserve anti-enumeration behavior, and record exactly one secret-free operator-visible security event for the transition into a limited state.
- **SC-019**: In 100% of avatar security and recovery tests, invalid content is rejected, persisted output satisfies the dimension and size limits with metadata removed, unauthenticated retrieval is denied, and interrupted replacement preserves the prior avatar.
- **SC-020**: During a simulated email-service outage, 100% of non-email account and profile journeys remain usable, no invitation reports false success, password-reset responses remain non-enumerating, and operators can identify the degraded email capability without seeing recipient data or tokens.

**User-story traceability**:

| User Story | Functional Requirements | Measurable Outcomes |
|------------|-------------------------|---------------------|
| US1 - Invitation-Based User Registration | FR-003–FR-007, FR-046, FR-049, FR-051–FR-053, FR-055–FR-059, FR-063 | SC-001, SC-002, SC-016–SC-018, SC-020 |
| US2 - Initial Admin Account Setup | FR-002, FR-017, FR-042–FR-044 | SC-006, SC-007 |
| US3 - Profile Viewing for All Users | FR-009, FR-030–FR-032, FR-046–FR-048, FR-056, FR-060 | SC-004, SC-016 |
| US4 - Self-Profile Editing | FR-010–FR-011, FR-030–FR-033, FR-035, FR-045–FR-048, FR-056, FR-060 | SC-004, SC-008, SC-016 |
| US5 - Admin Member Account Management | FR-012–FR-018, FR-027–FR-029, FR-034, FR-036, FR-040–FR-041, FR-045–FR-050, FR-054, FR-060 | SC-003, SC-005, SC-006, SC-009, SC-011–SC-013, SC-015 |
| US6 - Promote Member to Admin | FR-016–FR-018, FR-045, FR-050, FR-056 | SC-003, SC-005, SC-006, SC-009, SC-016 |
| US7 - Self-Service Password Reset | FR-019–FR-023, FR-040, FR-045, FR-049, FR-052–FR-054, FR-056–FR-059 | SC-010, SC-012–SC-013, SC-016–SC-018, SC-020 |
| US8 - Profile Picture Management | FR-030, FR-033–FR-035, FR-045, FR-056, FR-060–FR-062 | SC-008, SC-014, SC-016, SC-019 |

## Assumptions

- Invitation links expire after 7 days (standard industry practice for email invitations).
- Invitation links are stateless and require no server-side storage; an invitation is valid as long as it has not expired and the recipient's email address is not yet registered.
- Multiple invitation links may be sent to the same unregistered email address; no duplicate-invitation check is enforced since no pending-invitation state is tracked.
- Invitation links cannot be revoked; expiry and email-already-registered are the only invalidation conditions.
- Role promotion is one-way in this version; Admin accounts cannot be demoted or targeted by Member-management actions under FR-017.
- Account deletion is out of scope for every role. Suspended accounts retain their canonical email and all profile data for possible reinstatement, so their email addresses remain unavailable for new invitations.
- The system operates as a single-organization deployment (not multi-tenant).
- Email delivery for invitations relies on an external email service already available in the environment.
- The predefined deployment Admin is configured via environment variable or deployment configuration file only for first bootstrap. After an active Admin exists, the bootstrap configuration may be removed; changing it does not rotate or replace the existing Admin.
- Avatar images are saved by the application on a durable deployment volume and served only to authenticated users without a third-party storage service.
- Suspended accounts retain their data; suspension is reversible by an Admin.

## Clarifications

### Session 2026-08-18

- Q: What governance decision applies to the email dependency and permanent account deletion? → A: Nodemailer is explicitly approved for SMTP delivery; permanent account deletion is removed, and Admins may only suspend or reinstate accounts.
- Q: How should Member-management and role changes behave when Admin restrictions or concurrent requests conflict? → A: Allow only atomic Member-targeting mutations, reject every Admin-targeting action, use current account state, and serialize conflicts so at least one active Admin always remains.
- Q: What measurement boundaries should make profile performance, invitation timing, interaction counts, and recovery outcomes objectively testable? → A: Use production-equivalent percentile timing, explicit start and end events, control-activation counting, and 100% pass criteria for security-state recovery flows.
- Q: How should invitation, email-delivery, concurrent-registration, and forced-reset failures recover without weakening security or misleading users? → A: Permit safe resend, report only provider-accepted invitations as sent, degrade email features without blocking core access, preserve anti-enumeration, enforce atomic registration, and use an expiring restricted forced-reset gate.
- Q: What non-functional baseline should govern accessibility, credential security, abuse prevention, profile privacy, stateless invitations, and avatar handling? → A: Apply a production baseline: WCAG 2.2 AA, protected purpose-bound credentials, quantified rate limits, authenticated team-only profile disclosure, explicit non-revocation warnings, validated private avatars, and coordinated backups.
- Q: When exactly should a password-reset link become valid and expire? → A: It becomes valid when the reset request is accepted and expires exactly 60 minutes later; it is invalid at or after the expiry timestamp.
- Q: What normative lockout threshold, duration, reset conditions, and configurability should apply? → A: Default to 5 consecutive failures and 15 minutes, allow positive deployment-time values, reset the count after a successful login or lockout expiry, and preserve an unexpired lockout through password reset, suspension, or reinstatement.
- Q: When must suspension, promotion, forced reset, password reset, and profile updates take effect, and what happens to existing sessions? → A: Commit before reporting success and enforce on the next protected request or profile read; revoke sessions for suspension and password-related security changes, preserve sessions for promotion and profile edits, and require current account data for every authorization check.
- Q: What length, character, whitespace, and normalization rules should apply to names, phone numbers, Slack handles, and email addresses? → A: Use bounded canonical forms: normalized international names, bounded printable phone free text, lowercase Slack handles without `@`, and trimmed lowercase ASCII email addresses without provider-specific alias rewriting.
- Q: How should an Admin reinstate a suspended Member? → A: Restore active status only; preserve the password, temporary-lockout state, and forced-password-reset flag.
- Q: What session lifetime and renewal policy should apply after a successful login? → A: Use a fixed 2-hour session, extended to 21 days when Remember Me is selected, with no automatic renewal.
- Q: After a Member is permanently deleted, may the same email address be registered again? → A: Superseded on 2026-08-18: account deletion was removed; suspended accounts retain their canonical email and cannot be re-registered.
- Q: How should deployment bootstrap behave after the initial Admin has already been created? → A: Create only on an empty database, preserve all existing accounts on repeat deployment, fail if existing data has no active Admin, and rotate credentials only through the password-reset flow.
- Q: How should the missing FR-008 identifier be handled? → A: Keep FR-008 retired with an explicit stateless-invitation rationale so existing references remain stable.
- Q: How should case, surrounding whitespace, and provider aliases be handled when invited, registered, and reset-request email addresses are compared? → A: Apply FR-049 canonicalization in every flow; treat provider aliases as distinct addresses.
- Q: What ownership and link behavior should apply while an account is suspended? → A: Retain canonical-email ownership, reject invitations, and allow password reset without reinstatement.
- Q: What should happen when avatar replacement fails after processing or writing begins? → A: Fail the whole save, preserve prior profile state, and remove the candidate file.
- Q: How should removing an avatar behave when the profile has no avatar? → A: Succeed as a no-op with no data change or error.
- Q: What should happen when multiple valid invitations for one unregistered canonical email are used concurrently? → A: Create exactly one account; all losing attempts return email-in-use and create nothing.

### Session 2026-08-17

- Q: Must invitation records be stored server-side? → A: No. Invitations are stateless tokens; validity is checked at registration time against expiry and email availability only. No server-side invitation state is persisted.
- Q: Can an Admin send multiple invitations to the same unregistered email? → A: Yes. Since no invitation state is tracked, the only pre-send account constraint is that no registered account, active or suspended, owns the canonical email.
- Q: Can an invitation be revoked after it is sent? → A: No. Revocation is not supported; an invitation link remains usable until it expires or the email address becomes registered.

### Session 2026-08-16

- Q: When an invited user follows the registration link, how do they establish their login password? → A: User sets their own password in the invite registration form (single step)
- Q: When a user follows an invitation link to complete registration, which profile fields must they fill in on that single registration form? → A: First Name and Last Name only at registration; Avatar, Phone Number, and Slack Handle are optional and can be set later via profile editing.
- Q: Where should avatar image files be stored and what backend mechanism should handle them? → A: Local filesystem; served via a static file route by the application server — no third-party object storage.
- Q: What file formats and maximum file size should the system accept for avatar uploads? → A: JPEG and PNG only, maximum 5 MB; uploads outside these constraints are rejected with a specific error before persisting.
- Q: In the user directory listing, which profile fields should be visible per row vs. reserved for the full profile detail view? → A: Directory list shows Avatar, First Name, Last Name, and Role; full profile detail additionally shows Phone Number and Slack Handle.
- Q: Should Phone Number be stored and validated in a specific format, or accepted as free-text? → A: Free-text with no phone-format enforcement, subject only to the shared normalization, 50-character limit, and control-character rejection rules.
- Q: Should avatar-specific scenarios form a separate user story or be added to User Story 4? → A: Separate User Story 8 — Profile Picture Management (Priority P8) covering upload, rejection, and removal.
- Q: Should users be able to remove their avatar entirely, returning to a default no-avatar state? → A: Yes — users can remove their avatar; the profile returns to a default no-avatar state.
- Q: Should users be able to reset a forgotten password themselves, or does an Admin handle password resets on their behalf? → A: Self-service — user requests a password-reset email from the login page, follows the link, and sets a new password
- Q: When a suspended user tries to log in, should the error message explicitly tell them their account is suspended, or show a generic "invalid credentials" response? → A: Explicit — "Your account has been suspended. Contact your administrator."
- Q: Should repeated failed login attempts trigger a temporary account lockout to protect against brute-force attacks? → A: Yes — temporary lockout after N consecutive failures, auto-unlocks after the lockout period
- Q: Should an Admin be able to force a password reset on any Member account — requiring the Member to set a new password on their next login? → A: Yes — Admin can force a reset; Member must change password before accessing the system
