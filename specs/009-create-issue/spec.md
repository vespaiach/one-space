# Feature Specification: Create Issue

**Feature Branch**: `009-create-issue`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "admin and member of a project can create new issues for that project. A new issue has: title; description (support basic markdown); status (column) pick from a list (default are backlog, in-progress, done); priority: urgent, high, medium, low, no priority; pick or create (inline) a label; pick an assignee or assign to me"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New Issue with Minimum Details (Priority: P1)

A project member opens their project and creates a new issue by typing only a title. The issue is saved immediately, placed in the project's first status column, given no priority, no labels, and no assignee.

**Why this priority**: Capturing work quickly with the least friction is the core value of issue creation. Every other detail (description, priority, labels, assignee) enriches this baseline but the feature has no value without it.

**Independent Test**: Can be fully tested by a project member submitting a new issue with only a title filled in, then verifying it is saved, appears in the project's first column, and shows No Priority, no labels, and no assignee.

**Acceptance Scenarios**:

1. **Given** a logged-in user who is a member of a project (Admin or Member role), **When** they submit a new issue with only a title, **Then** the issue is created, appears in the project's first status column, and defaults to No Priority with no labels and no assignee.
2. **Given** an issue-creation form, **When** the user submits it with an empty or whitespace-only title, **Then** the system rejects the submission and prompts for a required title.
3. **Given** a logged-in user who is not a member of the target project, **When** they attempt to create an issue for that project, **Then** the system rejects the action and no issue is created.

---

### User Story 2 - Choose Status and Priority at Creation (Priority: P2)

A project member creating an issue picks a specific status column (e.g., "In Progress" instead of the default "Backlog") and a priority level (e.g., "High") before saving.

**Why this priority**: Letting the creator set status and priority upfront avoids an immediate follow-up edit and lets urgent work be flagged and placed correctly from the start.

**Independent Test**: Can be fully tested by creating an issue while selecting a non-default column and a specific priority level, then verifying the saved issue reflects both choices.

**Acceptance Scenarios**:

1. **Given** an issue-creation form for a project, **When** the user opens the status field, **Then** they see the project's current list of columns, including the defaults "Backlog", "Todo", "In Progress", "Done", and "Canceled".
2. **Given** an issue-creation form, **When** the user selects a status column and submits, **Then** the created issue is placed in that column.
3. **Given** an issue-creation form, **When** the user selects a priority level from Urgent, High, Medium, Low, or No Priority and submits, **Then** the created issue carries that priority.
4. **Given** an issue-creation form, **When** the user submits without selecting a priority, **Then** the created issue defaults to No Priority.

---

### User Story 3 - Add a Formatted Description (Priority: P3)

A project member writes a multi-paragraph description using basic markdown — bold text, a bulleted list, and a link — while creating an issue, and later views the issue to confirm the formatting renders correctly.

**Why this priority**: Descriptions carry the detailed context of a work item. Basic formatting improves readability but the issue is still usable without it, making this lower priority than capturing and classifying the issue itself.

**Independent Test**: Can be fully tested by creating an issue with a description containing bold text, a list, and a link, then opening the issue and verifying each element renders as formatted rather than as raw markdown syntax.

**Acceptance Scenarios**:

1. **Given** an issue-creation form, **When** the user enters a description using bold, italic, a bulleted or numbered list, a heading, and a link, **Then** the saved issue displays each element with its corresponding formatting when viewed.
2. **Given** an issue-creation form, **When** the user leaves the description empty and submits, **Then** the issue is created with no description.
3. **Given** an issue-creation form, **When** the user enters raw HTML or script content in the description, **Then** the system stores and renders it as inert text rather than executing it.

---

### User Story 4 - Assign the Issue (Priority: P4)

A project member creates an issue and assigns it to a specific teammate by picking them from the project's member list, or uses an "Assign to me" shortcut to assign it to themselves in one action.

**Why this priority**: Assignment routes work to the right person, but an issue is still a valid, trackable item without one, so this ranks below the fields that define what the issue is.

**Independent Test**: Can be fully tested by creating one issue assigned via the member picker and another using "Assign to me", then verifying each issue shows the intended assignee.

**Acceptance Scenarios**:

1. **Given** an issue-creation form, **When** the user opens the assignee field, **Then** they see the list of the project's members to choose from.
2. **Given** an issue-creation form, **When** the user selects a project member as assignee and submits, **Then** the created issue is assigned to that member.
3. **Given** an issue-creation form, **When** the user selects "Assign to me" and submits, **Then** the created issue is assigned to the currently logged-in user.
4. **Given** an issue-creation form, **When** the user submits without selecting an assignee, **Then** the issue is created unassigned.

---

### User Story 5 - Apply or Create Labels Inline (Priority: P5)

A project member creating an issue picks one or more existing labels from the project's label list, or types a brand-new label name and creates it on the spot without leaving the issue-creation form. Each applied label appears as its own chip that can be removed individually before submitting.

**Why this priority**: Labels aid categorization and filtering but are the most optional field on an issue, so this rounds out the feature last.

**Independent Test**: Can be fully tested by creating one issue applying two existing labels, and another by typing a label name that doesn't yet exist and confirming it is created and applied alongside an existing label, then verifying the new label is available for selection on the next issue creation.

**Acceptance Scenarios**:

1. **Given** an issue-creation form, **When** the user opens the label field, **Then** they see the project's existing labels available to select.
2. **Given** an issue-creation form, **When** the user selects an existing label and submits, **Then** the created issue carries that label.
3. **Given** an issue-creation form, **When** the user selects more than one existing label before submitting, **Then** the created issue carries every selected label, each shown and removable independently of the others.
4. **Given** an issue-creation form, **When** the user types a label name that does not already exist for the project and submits, **Then** a new label with that name is created, applied to the issue (in addition to any other labels already selected), and becomes available for selection on future issues in that project.
5. **Given** an issue-creation form, **When** the user types a label name that matches an existing label for the project (ignoring letter case), **Then** the system applies the existing label instead of creating a duplicate.
6. **Given** an issue-creation form, **When** the user submits without selecting or creating any label, **Then** the issue is created with no labels.

---

### Edge Cases

- What happens when a user who is a member of one project attempts to create an issue for a different project they don't belong to? The system rejects the action and no issue is created.
- What happens when the selected status column is deleted by another user between opening the form and submitting? The submission is rejected and the user is prompted to choose a current column.
- What happens when the selected assignee is removed from the project between opening the form and submitting? The submission proceeds with the issue created unassigned, and the user is notified the chosen assignee was no longer a project member.
- What happens when two users simultaneously type the same new label name (case-insensitive) for the same project? Exactly one label is created; both issues end up carrying the same label record.
- What happens when the title or description exceeds a reasonable maximum length? The system rejects the submission and indicates the field that is too long.
- What happens when a project has had all its non-default columns removed and only defaults remain? The status field still lists "Backlog", "Todo", "In Progress", "Done", and "Canceled" for selection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow any user who is a member of a project — regardless of whether their system role is Admin or Member — to create a new issue within that project.
- **FR-002**: The system MUST reject issue-creation attempts by users who are not members of the target project, without exposing that project's data to them.
- **FR-003**: Every issue MUST require a non-empty title; the system MUST reject creation submissions with a blank or whitespace-only title.
- **FR-004**: The system MUST allow an optional description on issue creation and MUST support basic markdown formatting — bold, italics, links, bulleted and numbered lists, and headings — rendered accordingly when the issue is viewed.
- **FR-005**: The system MUST sanitize issue descriptions so that raw HTML or script content is never executed when rendered.
- **FR-006**: The system MUST let the creator select a status for the new issue from the project's current list of board columns.
- **FR-007**: When no status is explicitly selected, the system MUST default the new issue to the project's first status column.
- **FR-008**: Every project's board MUST offer "Backlog", "Todo", "In Progress", "Done", and "Canceled" as selectable default status columns, consistent with existing kanban board behavior.
- **FR-009**: The system MUST let the creator select exactly one priority level for the new issue from: Urgent, High, Medium, Low, or No Priority.
- **FR-010**: When no priority is explicitly selected, the system MUST default the new issue to No Priority.
- **FR-011**: The system MUST let the creator apply zero or more labels to the new issue by selecting from existing labels already defined for the project; each applied label MUST be independently removable before submission.
- **FR-012**: The system MUST let the creator create a new label, by name, directly from the issue-creation form, and apply it to the issue being created — in addition to any other labels already selected — without a separate navigation step.
- **FR-013**: When a typed label name matches an existing label for the project (case-insensitively), the system MUST apply the existing label rather than creating a duplicate.
- **FR-014**: The system MUST let the creator select at most one assignee for the new issue from the project's current members, or leave it unassigned.
- **FR-015**: The system MUST provide an "Assign to me" action that sets the assignee to the currently authenticated creator without requiring the creator to locate themselves in the member list.
- **FR-016**: If the selected assignee is no longer a project member at submission time, the system MUST create the issue unassigned and notify the creator rather than rejecting the whole submission.
- **FR-017**: If the selected status column no longer exists at submission time, the system MUST reject the submission and prompt the creator to choose a current column.
- **FR-018**: Upon successful creation, the system MUST persist the issue's title, description, status, priority, labels, and assignee, and the issue MUST be immediately visible to all members of the project.

### Key Entities

- **Issue**: The work item being created; belongs to exactly one project; has a required title, an optional markdown-formatted description, exactly one status (column), exactly one priority level (Urgent, High, Medium, Low, or No Priority), zero or more labels, at most one assignee, a creator, and a creation timestamp.
- **Label**: A named tag scoped to a project; created either ahead of time or inline during issue creation; reusable across issues in that project; unique per project ignoring letter case; an issue may carry any number of labels.
- **Project Member**: The association between a user (Admin or Member role) and a project that grants them permission to create issues for that project; sourced from existing project-membership records.
- **Status (Column)**: A named stage on the project's board that an issue can be placed in at creation; every project has at least the default set — "Backlog", "Todo", "In Progress", "Done", "Canceled".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A project member can create a fully-specified issue (title, description, status, priority, labels, and assignee) in under one minute.
- **SC-002**: A project member can create a minimal issue (title only) in under ten seconds.
- **SC-003**: 100% of issue-creation attempts by non-project-members are rejected with no project or issue data exposed.
- **SC-004**: 100% of issue-creation submissions with a blank title are rejected before any data is saved.
- **SC-005**: A creator can apply a brand-new label — alongside any number of other labels already selected — without leaving the issue-creation flow, and that label is available for selection on the very next issue created for the same project.
- **SC-006**: Selecting "Assign to me" completes assignee selection in a single action, with no search or scrolling required.
- **SC-007**: A newly created issue is visible to all other project members within one second of creation.
- **SC-008**: When status or priority are left unselected, 100% of created issues default to the project's first column and No Priority respectively.

## Clarifications

### Session 2026-08-20

- Q: Which set of status columns should the issue-creation status picker offer? → A: Match the design mockup's five statuses — Backlog, Todo, In Progress, Done, Canceled.
- Q: Should a new issue support more than one label at once, or only a single label? → A: Zero or more labels, matching the design's multi-select chip picker with individually removable labels.
- Q: When the creator leaves the priority field untouched, what should the new issue's priority default to? → A: No Priority (confirmed as originally specified).
- Q: Should this spec continue to reference `003-issue-kanban-board` as a comparison point? → A: No — that spec is being discontinued and removed; all references to it are removed from this spec.

## Assumptions

- Project membership determines who may create issues: consistent with `001-user-role-management` and `002-project-management`, both system Admins and system Members must be explicit members of a project to create issues in it; a system Admin who is not a member of a given project cannot create issues there.
- A project's board and its five default columns ("Backlog", "Todo", "In Progress", "Done", "Canceled") already exist before an issue can be created.
- Priority uses the five-level model — Urgent, High, Medium, Low, No Priority — defined in `.specify/GLOSSARY.md`.
- Each issue carries zero or more labels but at most one assignee at creation time; the single-assignee rule matches the glossary's single-assignee definition and the singular phrasing of the feature request.
- "Basic markdown" covers bold, italics, links, bulleted/numbered lists, and headings; advanced extensions such as tables, embedded images, and raw HTML are out of scope.
- Any project member (Admin or Member role) may create a new label inline while creating an issue; broader label management (renaming or deleting labels) is governed by existing project rules and is out of scope for this feature.
- Editing or deleting an issue after it is created, commenting, attachments, and issue linking are out of scope for this feature, which covers creation only.
- Real-time propagation of a newly created issue to other viewers follows the same one-second behavior already established for the project's board.
