# Feature Specification: Add Project Members

**Feature Branch**: `008-add-project-members`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "admin can add members to projects. After adding a member to project, system will send a notification to that member, and that member will be member of the project immeditely."

## Clarifications

### Session 2026-08-18

- Q: When an Admin successfully adds a user, when must the in-app Notification record be created? → A: Create the Project Membership, unread Notification, and Project activity entry atomically before reporting success.
- Q: Which active accounts may an Admin add as Project members? → A: Any active Admin or Member account may be added; system role and Project Membership remain separate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Adds a Member to a Project (Priority: P1)

An Admin selects an eligible user from a Project's membership controls and adds that user to the Project. The new project membership takes effect immediately, so the added user can access the Project according to its current status as soon as the Admin sees confirmation.

**Why this priority**: Immediate membership is the core business outcome. Without it, an Admin cannot grant a user access to a private Project.

**Independent Test**: Add an active user to an active Project as an Admin, then verify the user appears in the Project's member list and can open the Project without waiting or taking another action.

**Acceptance Scenarios**:

1. **Given** an active Project, a logged-in Admin, and an active user who is not assigned to that Project, **When** the Admin adds the user, **Then** exactly one project membership is created, the user appears in the Project's member list, and the user can immediately open the Project.
2. **Given** an active Project and a user who has just been added, **When** that user opens or refreshes their Project list, **Then** the Project appears and can be opened without requiring the user to sign out, sign in again, accept an invitation, or wait for an approval.
3. **Given** an archived Project and an eligible user who is not assigned to it, **When** an Admin adds the user, **Then** the user immediately becomes a project member and receives the same read-only access that existing members have for an archived Project.
4. **Given** a logged-in Member, **When** they attempt to add any user to a Project, **Then** the action is rejected, no project membership is created, and no membership notification or activity entry is generated.
5. **Given** an active Admin who is not assigned to a Project, **When** they open that Project's membership controls, **Then** they can manage Project Membership because Admin authority is system-wide.
6. **Given** an active Admin or Member account that is not assigned to a Project, including the acting Admin's account, **When** an Admin adds that account, **Then** the account receives the same Project Membership behavior defined for every eligible user.

---

### User Story 2 - Added Member Receives a Notification (Priority: P1)

A user added to a Project receives an in-app notification that identifies the Project and the Admin who added them. The notification links directly to the Project so the user can begin participating immediately.

**Why this priority**: Immediate access has limited value if the user does not know it was granted. The notification closes the communication loop and gives the recipient a direct next action.

**Independent Test**: Add an active user to a Project, open that user's in-app notifications, and verify an unread notification links to the correct Project and identifies who added the user.

**Acceptance Scenarios**:

1. **Given** an Admin successfully adds a user to a Project, **When** the membership is confirmed, **Then** the added user receives one unread in-app notification naming the Project and the Admin who added them.
2. **Given** an added user has received the notification, **When** the user selects it, **Then** the correct Project opens and the notification is handled according to the application's existing read/unread behavior.
3. **Given** the Project is archived when the user is added, **When** the user opens the notification, **Then** the archived Project opens in read-only mode.
4. **Given** any membership, Notification, or Project activity write cannot be completed, **When** the add action finishes, **Then** the entire action fails, none of the three records is created, and the Admin receives a safe retry message.

---

### User Story 3 - Admin Sees Safe, Actionable Add-Member Results (Priority: P2)

An Admin can distinguish users who may be added from users who are already assigned or ineligible. If an add request cannot be completed, the Admin receives a clear explanation and the existing Project membership remains unchanged.

**Why this priority**: Clear eligibility and failure behavior prevent duplicate membership, misleading confirmation, and accidental access changes.

**Independent Test**: Attempt to add an existing project member, a suspended user, and a user whose eligibility changes during submission; verify each attempt is rejected clearly without duplicate records or notifications.

**Acceptance Scenarios**:

1. **Given** a user is already assigned to a Project, **When** an Admin attempts to add the same user again, **Then** the system reports that the user is already a project member and creates no additional membership, notification, or activity entry.
2. **Given** a suspended user, **When** an Admin attempts to add that user to a Project, **Then** the action is rejected with an eligibility message and no Project Membership is created.
3. **Given** two Admins submit an add request for the same user and Project at nearly the same time, **When** both requests finish, **Then** exactly one project membership, one membership notification, and one Project activity entry exist.
4. **Given** a user's eligibility changes after the Admin selects them but before the add action completes, **When** the Admin submits the action, **Then** eligibility is checked again, the add is rejected, and the Admin is told to refresh the eligible-user list.

### Edge Cases

- A user already assigned to the Project is not added twice and does not receive a duplicate notification.
- Concurrent add requests for the same user and Project produce one project membership, one notification, and one Project activity entry.
- A user who becomes suspended after selection but before completion is rejected based on their current status.
- Adding a user to an archived Project grants immediate read-only access; it does not reactivate the Project or grant write access.
- A failure while creating the Project Membership, Notification, or Project activity entry rolls back all three records and does not report success.
- A failed or unauthorized add attempt does not reveal private Project information to the selected user.
- If the Admin's session expires or is revoked before the add completes, the action is rejected and no membership side effects occur. Admin demotion and suspension remain prohibited by the account-management feature.
- If the Project changes between active and archived while the add completes, the Project Membership still succeeds and access follows the Project's current status whenever the user accesses it.
- If no eligible users remain, membership controls state that all active accounts are already assigned; suspended and already assigned accounts remain distinguishable but unavailable.
- A previously removed user may be added again; the new membership period creates one new unread Notification and one new Project activity entry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only an authenticated, active Admin MUST be able to add a user to a Project. This system-wide authority applies to every Project regardless of whether the acting Admin is a Project member.
- **FR-002**: The system MUST allow an Admin to choose from active, existing Admin or Member accounts that are not already assigned to the selected Project, including the acting Admin's own account.
- **FR-003**: At submission and before commit, the system MUST revalidate the acting Admin's current session and active Admin role, the selected user's active account status, the Project's existence, and the absence of an active Project Membership.
- **FR-004**: A successful add action MUST atomically create exactly one Project Membership, one unread membership Notification, and one Project activity entry; all three records MUST commit or roll back together.
- **FR-005**: The Project Membership, Notification, and Project activity entry MUST be committed before the system confirms success to the Admin.
- **FR-006**: Once success is confirmed, the added user MUST be able to access the Project without accepting an invitation, starting a new session, or waiting for an approval.
- **FR-007**: The added user's permissions MUST follow the Project's current status whenever access is evaluated: the view and edit permissions defined by feature 002 for an active Project, and the read-only permissions defined by feature 002 for an archived Project.
- **FR-008**: A successful add action MUST create exactly one unread in-app notification for the added user.
- **FR-009**: The membership Notification MUST identify the Project and the Admin who added the user, state that the user was added, and link directly to the Project using the Project's current key.
- **FR-010**: The unread membership Notification MUST be available to the added user's next authenticated Notification read immediately after the add action reports success; live push to an already-open page is not required.
- **FR-011**: If any Project Membership, Notification, or Project activity write fails, the system MUST roll back the entire add action, report no success, and provide the Admin a safe retry message.
- **FR-012**: A successful add action MUST create one Project activity entry identifying the added user, the acting Admin, and when the membership was added.
- **FR-013**: Repeated or concurrent attempts within the same active membership period MUST result in no more than one Project Membership, one membership Notification, and one Project activity entry. A re-add after removal begins a new membership period and creates one new Notification and activity entry.
- **FR-014**: An attempt to add an already assigned user MUST be rejected with a clear message and MUST NOT create additional side effects.
- **FR-015**: An attempt to add a suspended or nonexistent user MUST be rejected with a clear message and MUST NOT create a Project Membership, Notification, or activity entry. Active and suspended are the only account statuses in scope.
- **FR-016**: A failed or unauthorized add attempt MUST leave all existing Project memberships unchanged and MUST NOT notify the selected user.
- **FR-017**: Membership controls MUST present active non-members as eligible and MUST present already assigned and suspended accounts as unavailable with a text reason; when no eligible user remains, the controls MUST show an explanatory empty state.
- **FR-018**: Membership controls MUST support keyboard-only completion, persistent labels, visible focus, programmatic help and error associations, non-color-only eligibility reasons, and announced pending, success, and error states.
- **FR-019**: Membership controls MUST remain usable at 200% zoom and narrow mobile widths without losing member identity, eligibility reasons, controls, or status messages.
- **FR-020**: Membership and Notification reads MUST expose only the minimum data required for the current Admin or recipient; unauthorized outcomes MUST NOT disclose Project, roster, candidate, account-status, or Notification details.
- **FR-021**: An unexpected add-member failure MUST create one operator-visible diagnostic event containing the failure category and time but no session token, email address, submitted form body, or private Project content.

### Key Entities

- **Project**: A collection of related issues/tasks with a current status that determines whether project members have normal or read-only access.
- **User**: An existing account that holds the Admin or Member role and has either active or suspended status.
- **Project Membership**: The association assigning one user to one Project. It records the Project, assigned user, acting Admin, and time added, and it grants access according to the Project's current status.
- **Notification**: An in-app alert directed to the added user. It records the recipient, Project, acting Admin, membership event, creation time, read status, and destination.
- **Project Activity Entry**: The Project history record of the membership addition, identifying the added user, acting Admin, and time of the action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 19 of 20 first-attempt usability sessions, conducted across at least 5 representative participants acting as Admins, complete the add-member flow without guidance or a recoverable user error.
- **SC-002**: In at least 19 of those 20 sessions, elapsed time from membership controls becoming usable until committed success is shown is under 30 seconds; all application and network wait time during the action is included.
- **SC-003**: In 100% of successful add-member scenarios, the added user can access the Project on the first authenticated Project read started after success is shown to the Admin.
- **SC-004**: In at least 99 of 100 successful add operations, the recipient's first authenticated Notification read started within 5 seconds after Admin success includes exactly one unread membership Notification.
- **SC-005**: In 100% of destination scenarios covering active, archived, and renamed Projects, selecting the membership Notification opens the Project at its current key and applies its current access status.
- **SC-006**: In 100% of a required rejection matrix covering no session, expired or revoked session, Member actor, malformed identifiers, unknown Project, unknown user, suspended user, existing membership, and injected transaction failure, no unintended Project Membership, Notification, or Project activity entry is created and no private data is disclosed.
- **SC-007**: Across at least 20 synchronized pairs of concurrent submissions and 20 repeated post-success submissions, every case retains exactly one active Project Membership, one membership Notification, and one Project activity entry for the membership period.
- **SC-008**: Every initial, pending, success, validation-error, duplicate, suspended-user, unexpected-error, archived-Project, and no-eligible-user state satisfies FR-018 and FR-019 in keyboard, status-announcement, 200%-zoom, and narrow-width review.
- **SC-009**: In 100% of injected unexpected-failure scenarios, exactly one operator-visible diagnostic event is recorded and contains none of the data prohibited by FR-021.

## Assumptions

- "Notification" means the application's existing in-app Notification shown in the member home page and related notification views. Email, Slack, SMS, and other external messages are out of scope.
- Project Membership is separate from the system-wide Admin and Member roles. Any active Admin or Member account, including the acting Admin, may be assigned to a Project; the Admin role determines who may perform the add action.
- User invitation, account registration, role changes, suspension, and reinstatement remain governed by the existing user role and account management feature and are out of scope here.
- This feature covers adding one user per submitted action. Bulk membership changes are out of scope.
- Project removal, membership-role customization, notification preference controls, and notification deletion are out of scope.
- Feature 001 is authoritative for active/suspended account state and current-session authorization; features 002/007 are authoritative for Project existence, privacy, current key, and active-versus-archived access; feature 004 is authoritative for Project activity presentation; feature 006 is authoritative for Notification ordering and read/unread behavior.
- Membership, Notification, and Project activity records are one atomic success unit; no asynchronous partial-success or delayed-delivery state is in scope.
- Normal conditions for SC-001–SC-004 mean a valid active Admin session, a Project with no injected infrastructure fault, no more than 20 accounts in the workspace, and membership controls ready for input; all action processing and network wait time after submission remains included.
- The workspace is limited to fewer than approximately 20 accounts, so bulk add and required candidate search are out of scope.
- This feature introduces no external integration, import/export format, rate limit, localization requirement, or feature-specific regulatory requirement.
