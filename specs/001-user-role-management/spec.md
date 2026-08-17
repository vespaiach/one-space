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

---

### User Story 2 - Initial Admin Account Setup (Priority: P2)

Before any users exist, the system needs at least one Admin. An operator configures the initial Admin credentials during deployment. That Admin can then log in and begin inviting users.

**Why this priority**: The entire invitation flow depends on at least one Admin account existing. Deployment-time setup must work before any other scenario can be tested.

**Independent Test**: Can be fully tested by deploying the system with a predefined Admin configuration, logging in with those credentials, and confirming Admin-level access is available.

**Acceptance Scenarios**:

1. **Given** a fresh deployment with a predefined Admin configuration, **When** the configured Admin credentials are used to log in, **Then** the user gains Admin-level access.
2. **Given** a fresh deployment without a predefined Admin configuration, **When** the system starts, **Then** the system rejects startup or emits a clear error indicating no Admin is configured.

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

1. **Given** a logged-in user on their own profile edit page, **When** they update their First Name or Last Name and save, **Then** the changes are saved and immediately reflected in the user directory and full profile view.
2. **Given** a logged-in user, **When** they submit a profile update with First Name or Last Name left blank, **Then** the system rejects the submission with a specific error indicating those fields are required.
3. **Given** a logged-in user, **When** they save a Phone Number or Slack Handle field with any value or leave it blank, **Then** the value is accepted and saved without format validation.
4. **Given** a logged-in user, **When** they view their own profile edit form, **Then** the Role field is displayed as read-only and the form provides no way to change it.
5. **Given** a logged-in user, **When** they attempt to edit another user's profile through the self-edit interface, **Then** the system rejects the action.

---

### User Story 5 - Admin Member Account Management (Priority: P5)

An Admin can edit, suspend, or permanently delete any Member account. A suspended account cannot log in. Deletion is permanent.

**Why this priority**: Administrative control over Members is essential for compliance and access governance, but depends on Members existing first.

**Independent Test**: Can be tested by an Admin suspending a Member account and verifying the Member can no longer log in.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they update any of a Member's profile fields — First Name, Last Name, Phone Number, or Slack Handle — and save, **Then** the Member's profile immediately reflects the Admin's changes.
2. **Given** a logged-in Admin, **When** they suspend a Member account, **Then** the account is marked suspended and the Member cannot log in until reinstated.
3. **Given** a suspended Member, **When** they attempt to log in, **Then** they are denied with an explicit message stating their account is suspended and directing them to contact their administrator.
4. **Given** a logged-in Admin, **When** they permanently delete a Member account, **Then** the account is removed and cannot be recovered.
5. **Given** a logged-in Member, **When** they attempt to perform Admin management actions, **Then** the system rejects those actions.
6. **Given** a logged-in Admin, **When** they trigger a forced password reset on a Member account, **Then** the Member is required to set a new password the next time they log in before accessing any other part of the system.

---

### User Story 6 - Promote Member to Admin (Priority: P6)

An existing Admin can elevate any Member to the Admin role, granting them full administrative privileges.

**Why this priority**: Role promotion is important for team growth but is an infrequent operation that depends on Members and Admin management already working.

**Independent Test**: Can be tested by promoting a Member to Admin and verifying the promoted user can then perform Admin actions such as inviting new users.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they promote a Member to Admin, **Then** the Member's role changes to Admin and they immediately gain Admin-level access.
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

---

### Edge Cases

- What happens when an invitation link expires before the user signs up? The link is rejected and the recipient must request a new invitation from an Admin.
- What if an Admin attempts to delete or suspend the only remaining Admin account? The system must prevent this to ensure at least one Admin always exists.
- What happens to pending invitations sent by an Admin whose account is deleted? Pending invitations remain valid until they expire or are accepted.
- What if an Admin tries to invite an email address that already has an account? The system rejects the invitation with a clear message.
- What if the invitee submits a password that does not meet the required strength criteria? The registration form rejects the submission and prompts them to choose a stronger password before the account is created.
- What if a user requests multiple password resets in quick succession? Only the most recently issued reset link is valid; prior links are invalidated.
- What if a suspended user successfully resets their password? Their password is updated but the account remains suspended; they cannot log in until an Admin reinstates them.
- What happens when an account is temporarily locked due to failed login attempts? The user is shown a message indicating the account is temporarily locked and when they may try again; the lockout lifts automatically after the lockout period.
- Does a failed login attempt against a suspended account count toward the lockout threshold? No — the suspended-account rejection fires before credential checking, so the counter is not incremented.
- What if a user uploads an avatar in an unsupported format or exceeding 5 MB? The system rejects the upload before saving anything and returns a specific error message indicating which constraint was violated; the existing avatar (if any) is unchanged.
- What if a user removes their avatar when they have never uploaded one? The system treats the remove action as a no-op; the profile continues to display the default no-avatar state with no error.
- What if a Member with a forced password reset tries to navigate to the app before resetting? They are blocked at login and redirected to a password-change screen; no other page is accessible until the reset is complete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support exactly two user roles: Admin and Member.
- **FR-002**: The system MUST allow a single initial Admin account to be configured at deployment time without requiring an invitation.
- **FR-003**: Admins MUST be able to send an invitation email to any email address not already associated with an account.
- **FR-004**: New users MUST only be able to register by following a valid, unexpired invitation link; self-registration without an invitation MUST be rejected.
- **FR-004a**: The invitation registration form MUST collect the invitee's First Name, Last Name, and chosen password in a single step; no temporary password or secondary email is issued. Avatar, Phone Number, and Slack Handle are not required at registration and may be set later via profile editing.
- **FR-004b**: The system MUST enforce minimum password strength requirements and reject registration if the chosen password does not meet them, with a specific error message.
- **FR-005**: All newly registered users MUST be automatically assigned the Member role upon completing registration.
- **FR-006**: The system MUST reject registration attempts where the invitation link has expired or the invited email address is already registered.
- **FR-007**: The system MUST reject invitation attempts for email addresses that already have an active account.
- **FR-009**: Any logged-in user (Admin or Member) MUST be able to view the profile of any other user in the system, regardless of role.
- **FR-010**: Any logged-in user MUST be able to edit and save changes to their own personal profile.
- **FR-011**: The system MUST prevent users from editing another user's profile through the self-edit interface.
- **FR-012**: Admins MUST be able to edit the profile information of any Member account.
- **FR-013**: Admins MUST be able to suspend any Member account, immediately preventing that Member from logging in.
- **FR-014**: Admins MUST be able to permanently delete any Member account; deleted accounts MUST be unrecoverable.
- **FR-015**: The system MUST reject login attempts from suspended accounts with an explicit message stating the account is suspended and directing the user to contact their administrator; this message MUST be distinct from an invalid-credentials error.
- **FR-016**: Admins MUST be able to promote any Member to the Admin role, granting them full administrative privileges immediately.
- **FR-017**: The system MUST prevent the deletion or suspension of the last remaining Admin account to ensure at least one Admin always exists.
- **FR-018**: Members MUST NOT be able to perform any Admin-only actions (invite users, manage Member accounts, promote roles).
- **FR-019**: Any user MUST be able to request a password-reset email from the login page by providing their registered email address.
- **FR-020**: The system MUST send a unique, time-limited, single-use password-reset link to the user's registered email address upon request.
- **FR-021**: The system MUST reject password-reset requests for unknown email addresses without revealing whether the address exists (generic confirmation response to prevent account enumeration).
- **FR-022**: When a new password-reset link is issued, any previously issued and unused reset links for that account MUST be invalidated.
- **FR-023**: A suspended user who resets their password MUST still be denied login; password reset does not lift a suspension.
- **FR-024**: The system MUST temporarily lock a user account after a defined number of consecutive failed login attempts, preventing further login attempts for a fixed period.
- **FR-025**: The system MUST automatically unlock a temporarily locked account once the lockout period has elapsed, with no Admin intervention required.
- **FR-026**: When a login attempt is blocked due to a temporary lockout, the system MUST inform the user that the account is temporarily locked and indicate when they may try again.
- **FR-027**: Admins MUST be able to flag any Member account as requiring a password reset.
- **FR-028**: A Member flagged for a forced password reset MUST be prompted to set a new password immediately upon their next login; no other part of the system MUST be accessible until the reset is completed.
- **FR-029**: Once the Member successfully sets a new password, the forced-reset flag MUST be cleared and normal access restored.
- **FR-030**: A User Profile MUST include the following fields: First Name (required), Last Name (required), Role (read-only, system-assigned), Avatar (optional profile picture), Phone Number (optional free-text, no format enforced), and Slack Handle (optional).
- **FR-031**: The Role field MUST be read-only in all profile view and edit interfaces; it MUST only change via Admin-initiated promotion (FR-016) or initial system assignment.
- **FR-032**: The user directory listing MUST display Avatar, First Name, Last Name, and Role for each user. The full profile detail view MUST additionally display Phone Number and Slack Handle. Any logged-in user MUST be able to access both views for any user in the system.
- **FR-033**: A user MUST be able to update their own First Name, Last Name, Avatar, Phone Number, and Slack Handle; the Role field MUST NOT be editable by the user themselves. A user MUST also be able to remove their avatar, returning the profile to a default no-avatar state.
- **FR-034**: An Admin MUST be able to view and override the First Name, Last Name, Avatar, Phone Number, and Slack Handle of any Member account.
- **FR-035**: Avatar uploads MUST be restricted to JPEG and PNG formats with a maximum file size of 5 MB; uploads exceeding these constraints MUST be rejected with a specific error message before the file is persisted.

### Key Entities

- **User Account**: Represents a registered user; has a role (Admin or Member), an email address, a status (active, suspended), a password-reset-required flag, and a creation timestamp.
- **User Profile**: The personal details associated with a User Account. Fields: First Name (required), Last Name (required), Role (read-only, system-assigned Admin or Member), Avatar (optional profile picture linked to the user's account; absent by default), Phone Number (optional), Slack Handle (optional); owned by one User Account.
- **Invitation Link**: A time-limited token embedded in a registration URL; contains the recipient's email address and an expiry timestamp. Validity is assessed at registration time by verifying the link has not expired and the email address is not yet registered. No server-side state is stored for invitations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can send an invitation and a recipient can complete registration in under 3 minutes from receiving the email.
- **SC-002**: 100% of successful registrations originate from valid, unexpired invitation links — no account can be created without one.
- **SC-003**: Admins can complete any account management action (edit, suspend, delete, promote) within 3 user interactions from the user list.
- **SC-004**: All user profile views load within 2 seconds under normal operating conditions.
- **SC-005**: The system enforces role boundaries such that no Member can trigger or complete any Admin-only action, verified by attempting all Admin actions as a Member.
- **SC-006**: The system is never left without at least one active Admin account; all attempts to remove the last Admin are rejected with a clear error.

## Assumptions

- Invitation links expire after 7 days (standard industry practice for email invitations).
- Invitation links are stateless and require no server-side storage; an invitation is valid as long as it has not expired and the recipient's email address is not yet registered.
- Multiple invitation links may be sent to the same unregistered email address; no duplicate-invitation check is enforced since no pending-invitation state is tracked.
- Invitation links cannot be revoked; expiry and email-already-registered are the only invalidation conditions.
- Admins cannot demote other Admins back to Member; role promotion is one-way in this version.
- Admins cannot edit, suspend, or delete other Admin accounts; Admin management actions apply to Members only.
- A deleted Member account and all associated profile data are permanently removed with no soft-delete or recovery mechanism.
- The system operates as a single-organization deployment (not multi-tenant).
- Email delivery for invitations relies on an external email service already available in the environment.
- The predefined deployment Admin is configured via environment variable or deployment configuration file, not through the application UI.
- Avatar images are saved by the application and served directly to users' browsers without a third-party storage service.
- Suspended accounts retain their data; suspension is reversible by an Admin.
- Temporary login lockout triggers after 5 consecutive failed attempts and lifts automatically after 15 minutes (standard defaults; adjustable at deployment time).

## Clarifications

### Session 2026-08-17

- Q: Must invitation records be stored server-side? → A: No. Invitations are stateless tokens; validity is checked at registration time against expiry and email availability only. No server-side invitation state is persisted.
- Q: Can an Admin send multiple invitations to the same unregistered email? → A: Yes. Since no invitation state is tracked, the only pre-send constraint is that the email must not already have an active account.
- Q: Can an invitation be revoked after it is sent? → A: No. Revocation is not supported; an invitation link remains usable until it expires or the email address becomes registered.

### Session 2026-08-16

- Q: When an invited user follows the registration link, how do they establish their login password? → A: User sets their own password in the invite registration form (single step)
- Q: When a user follows an invitation link to complete registration, which profile fields must they fill in on that single registration form? → A: First Name and Last Name only at registration; Avatar, Phone Number, and Slack Handle are optional and can be set later via profile editing.
- Q: Where should avatar image files be stored and what backend mechanism should handle them? → A: Local filesystem; served via a static file route by the application server — no third-party object storage.
- Q: What file formats and maximum file size should the system accept for avatar uploads? → A: JPEG and PNG only, maximum 5 MB; uploads outside these constraints are rejected with a specific error before persisting.
- Q: In the user directory listing, which profile fields should be visible per row vs. reserved for the full profile detail view? → A: Directory list shows Avatar, First Name, Last Name, and Role; full profile detail additionally shows Phone Number and Slack Handle.
- Q: Should Phone Number be stored and validated in a specific format, or accepted as free-text? → A: Free-text, no format enforcement — any string accepted.
- Q: Should avatar-specific scenarios form a separate user story or be added to User Story 4? → A: Separate User Story 8 — Profile Picture Management (Priority P8) covering upload, rejection, and removal.
- Q: Should users be able to remove their avatar entirely, returning to a default no-avatar state? → A: Yes — users can remove their avatar; the profile returns to a default no-avatar state.
- Q: Should users be able to reset a forgotten password themselves, or does an Admin handle password resets on their behalf? → A: Self-service — user requests a password-reset email from the login page, follows the link, and sets a new password
- Q: When a suspended user tries to log in, should the error message explicitly tell them their account is suspended, or show a generic "invalid credentials" response? → A: Explicit — "Your account has been suspended. Contact your administrator."
- Q: Should repeated failed login attempts trigger a temporary account lockout to protect against brute-force attacks? → A: Yes — temporary lockout after N consecutive failures, auto-unlocks after the lockout period
- Q: Should an Admin be able to force a password reset on any Member account — requiring the Member to set a new password on their next login? → A: Yes — Admin can force a reset; Member must change password before accessing the system
