# Feature Specification: User Role and Account Management

**Feature Branch**: `001-user-role-management`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Develop user role and account management with two user roles: Admin and Member."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invitation-Based User Registration (Priority: P1)

A new person cannot self-register. An Admin sends them an invitation email. The invitee follows the link, fills in their profile details, and completes registration. They are automatically assigned the Member role and can immediately log in.

**Why this priority**: This is the only entry point into the system. Without a working invitation and registration flow, no other feature is accessible.

**Independent Test**: Can be fully tested by having an Admin send an invitation, the recipient opening the link and completing sign-up, then verifying the new account appears as a Member in the user list.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** the Admin submits a valid email address to invite a user, **Then** an invitation email is sent to that address containing a unique, time-limited registration link.
2. **Given** a valid, unexpired invitation link, **When** the invitee opens the link and submits required profile information, **Then** a new account is created with the Member role and the invitation is marked as accepted.
3. **Given** an expired invitation link, **When** the invitee opens the link, **Then** the system informs them the link has expired and no account is created.
4. **Given** an already-accepted invitation link, **When** someone attempts to use it again, **Then** the system rejects the request and no duplicate account is created.
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

1. **Given** a logged-in Member, **When** they navigate to the user directory, **Then** they see a list of all Admin and Member accounts.
2. **Given** a logged-in Member, **When** they open any user's profile, **Then** they can view that profile's details without restriction.
3. **Given** a logged-in Admin, **When** they navigate to the user directory, **Then** they see the same full list including all roles.

---

### User Story 4 - Self-Profile Editing (Priority: P4)

Any logged-in user can update their own personal profile information (e.g., display name, contact details).

**Why this priority**: Self-service profile management is a basic user expectation and has no dependency on Admin actions.

**Independent Test**: Can be tested by a Member editing their own profile and confirming the updated values are saved and displayed.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing their own profile, **When** they submit updated personal information, **Then** the changes are saved and reflected immediately.
2. **Given** a logged-in user, **When** they attempt to edit another user's profile via the self-edit interface, **Then** the system rejects the action.
3. **Given** a user submitting invalid profile data (e.g., empty required fields), **When** they submit the form, **Then** the system rejects the submission with specific error messages.

---

### User Story 5 - Admin Member Account Management (Priority: P5)

An Admin can edit, suspend, or permanently delete any Member account. A suspended account cannot log in. Deletion is permanent.

**Why this priority**: Administrative control over Members is essential for compliance and access governance, but depends on Members existing first.

**Independent Test**: Can be tested by an Admin suspending a Member account and verifying the Member can no longer log in.

**Acceptance Scenarios**:

1. **Given** a logged-in Admin, **When** they edit a Member's profile information and save, **Then** the Member's profile reflects the Admin's changes.
2. **Given** a logged-in Admin, **When** they suspend a Member account, **Then** the account is marked suspended and the Member cannot log in until reinstated.
3. **Given** a suspended Member, **When** they attempt to log in, **Then** they are denied with a clear message indicating their account is suspended.
4. **Given** a logged-in Admin, **When** they permanently delete a Member account, **Then** the account is removed and cannot be recovered.
5. **Given** a logged-in Member, **When** they attempt to perform Admin management actions, **Then** the system rejects those actions.

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

### Edge Cases

- What happens when an invitation link expires before the user signs up? The link is rejected and the recipient must request a new invitation from an Admin.
- What if an Admin attempts to delete or suspend the only remaining Admin account? The system must prevent this to ensure at least one Admin always exists.
- What happens to pending invitations sent by an Admin whose account is deleted? Pending invitations remain valid until they expire or are accepted.
- What if an Admin tries to invite an email address that already has an account? The system rejects the invitation with a clear message.
- What if an Admin tries to invite an email address that already has a pending invitation? The system rejects the duplicate invitation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support exactly two user roles: Admin and Member.
- **FR-002**: The system MUST allow a single initial Admin account to be configured at deployment time without requiring an invitation.
- **FR-003**: Admins MUST be able to send an invitation email to any email address not already associated with an account or pending invitation.
- **FR-004**: New users MUST only be able to register by following a valid, unexpired invitation link; self-registration without an invitation MUST be rejected.
- **FR-005**: All newly registered users MUST be automatically assigned the Member role upon completing registration.
- **FR-006**: The system MUST reject registration attempts using an expired or already-accepted invitation link.
- **FR-007**: The system MUST reject invitation attempts for email addresses that already have an active account.
- **FR-008**: The system MUST reject duplicate invitations for email addresses that already have a pending invitation.
- **FR-009**: Any logged-in user (Admin or Member) MUST be able to view the profile of any other user in the system, regardless of role.
- **FR-010**: Any logged-in user MUST be able to edit and save changes to their own personal profile.
- **FR-011**: The system MUST prevent users from editing another user's profile through the self-edit interface.
- **FR-012**: Admins MUST be able to edit the profile information of any Member account.
- **FR-013**: Admins MUST be able to suspend any Member account, immediately preventing that Member from logging in.
- **FR-014**: Admins MUST be able to permanently delete any Member account; deleted accounts MUST be unrecoverable.
- **FR-015**: The system MUST reject login attempts from suspended accounts with a clear indication that the account is suspended.
- **FR-016**: Admins MUST be able to promote any Member to the Admin role, granting them full administrative privileges immediately.
- **FR-017**: The system MUST prevent the deletion or suspension of the last remaining Admin account to ensure at least one Admin always exists.
- **FR-018**: Members MUST NOT be able to perform any Admin-only actions (invite users, manage Member accounts, promote roles).

### Key Entities

- **User Account**: Represents a registered user; has a role (Admin or Member), an email address, a status (active, suspended), and a creation timestamp.
- **User Profile**: The personal details associated with a User Account (e.g., display name, bio, contact information); owned by one User Account.
- **Invitation**: A time-limited, single-use token sent to an email address; records the inviting Admin, recipient email, creation date, expiry date, and status (pending, accepted, expired, revoked).

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
- Admins cannot demote other Admins back to Member; role promotion is one-way in this version.
- Admins cannot edit, suspend, or delete other Admin accounts; Admin management actions apply to Members only.
- A deleted Member account and all associated profile data are permanently removed with no soft-delete or recovery mechanism.
- The system operates as a single-organization deployment (not multi-tenant).
- Email delivery for invitations relies on an external email service already available in the environment.
- The predefined deployment Admin is configured via environment variable or deployment configuration file, not through the application UI.
- Suspended accounts retain their data; suspension is reversible by an Admin.
