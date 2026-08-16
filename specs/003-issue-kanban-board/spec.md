# Feature Specification: Issue & Kanban Board

**Feature Branch**: `003-issue-kanban-board`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Issue & task management, A kanban board with columns and draggable cards. Issues carry titles, descriptions, assignees, priorities, labels, and comments. Card moves are live — teammates viewing the same board see updates within about a second. Quick query issues/tasks by assignees, labels, priorities"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Move Issues on the Board (Priority: P1)

A team member opens a project's kanban board to see all issues organized in named columns. They drag a card from "In Progress" to "Done" and all teammates currently viewing the same board see the move reflected on their screens within one second.

**Why this priority**: The core value of a kanban board is visualizing work status and enabling quick status updates. Without this, no other feature delivers meaningful value.

**Independent Test**: Open the board with at least one issue in any column. Drag a card to another column. Verify the card appears in the new column at the target position. Open a second browser session on the same board and verify the move is reflected there within one second without refreshing.

**Acceptance Scenarios**:

1. **Given** a board with multiple columns and issues, **When** a user drags a card to a different column, **Then** the card appears in the target column at the dropped position
2. **Given** two users viewing the same board, **When** User A moves a card, **Then** User B sees the card in its new column within one second without any manual refresh
3. **Given** a board with ordered cards in a column, **When** a user drags a card between two existing cards in that column, **Then** the card is inserted at the intended position and all other cards shift accordingly

---

### User Story 2 - Create and Edit Issues (Priority: P2)

A team member creates a new issue on the board, filling in a title, description, assignees, priority, and labels. Later, they open the same issue to update the priority and add another assignee.

**Why this priority**: Issues are the primary data unit — without creating and editing them, the board has no content to manage.

**Independent Test**: Create a new issue with all fields populated. Verify it appears as a card in the first column. Edit the issue and change the priority. Verify the updated priority is reflected on the card immediately.

**Acceptance Scenarios**:

1. **Given** a board, **When** a user creates an issue with title, description, one or more assignees, a priority level, and one or more labels, **Then** a card appears in the first column with all fields saved correctly
2. **Given** an existing issue, **When** a user edits the title, description, assignees, priority, or labels and saves, **Then** the card on the board immediately reflects the updated values
3. **Given** an issue creation form, **When** a user submits with an empty title, **Then** the system rejects the submission and prompts the user to provide a required title
4. **Given** an existing issue, **When** a user deletes it, **Then** the card is removed from the board and the issue is no longer accessible

---

### User Story 3 - Filter Issues by Assignee, Label, or Priority (Priority: P3)

A team member wants to see only the issues assigned to them. They select their name from the assignee filter and the board narrows to show only their cards across all columns.

**Why this priority**: Filtering enables team members to focus on their own work and quickly assess workload without leaving the board view.

**Independent Test**: Create issues with different assignees, labels, and priorities. Filter by a specific assignee and verify only that person's cards are visible across all columns. Apply a label filter on top and verify only issues matching both criteria appear. Clear all filters and verify all issues reappear.

**Acceptance Scenarios**:

1. **Given** a board with issues of mixed assignees, **When** a user filters by a specific assignee, **Then** only cards assigned to that person are shown across all columns
2. **Given** a board with issues of mixed labels, **When** a user filters by one or more labels, **Then** only cards carrying all selected labels are shown
3. **Given** a board with issues of mixed priorities, **When** a user filters by a priority level, **Then** only cards with that priority are shown
4. **Given** active filters, **When** a user clears all filters, **Then** all issues reappear on the board across all columns
5. **Given** active filters and a live board, **When** another user moves a card that no longer matches the active filter, **Then** that card disappears from the filtered view within one second

---

### User Story 4 - Manage Board Columns (Priority: P4)

A project owner or admin customizes the board by adding a "Review" column between "In Progress" and "Done", and renames "Backlog" to "Todo".

**Why this priority**: Different projects have different workflows. Column customization lets each project adapt its board to the relevant process rather than being constrained to a fixed set of stages.

**Independent Test**: Add a new column with a custom name. Verify issues can be dragged into it. Rename an existing column (including a default column). Verify the name updates without affecting the cards inside. Attempt to delete a default column ("Backlog", "In Progress", or "Done") and verify the system prevents it. Attempt to delete a non-default column that contains issues and verify the system requires those issues to be moved or deleted first.

**Acceptance Scenarios**:

1. **Given** a board, **When** a project owner or admin adds a new column with a name, **Then** the column appears on the board and accepts card drops
2. **Given** an existing column, **When** a project owner or admin renames it, **Then** all cards in that column remain and the column displays the new name immediately
3. **Given** an empty non-default column, **When** a project owner or admin deletes it, **Then** the column is removed from the board
4. **Given** a non-default column containing issues, **When** a project owner or admin attempts to delete it, **Then** the system prompts for confirmation and requires all issues in that column to be moved or deleted before the column can be removed
5. **Given** a default column ("Backlog", "In Progress", or "Done"), **When** a project owner or admin attempts to delete it, **Then** the system rejects the action and informs the user that default columns cannot be deleted

---

### User Story 5 - Comment on Issues (Priority: P5)

A developer opens an issue card to review its details and adds a comment asking for clarification. A teammate who opens the same issue later sees the full comment thread in chronological order.

**Why this priority**: Comments enable asynchronous discussion tied directly to the relevant issue, reducing context-switching to external communication tools.

**Independent Test**: Open an issue detail view. Submit a comment. Verify it appears in the thread with the author's name and timestamp. Open the same issue in a separate user session and verify both sessions display the comment. Delete the comment from the original session and verify it disappears from the thread.

**Acceptance Scenarios**:

1. **Given** an issue detail view, **When** a user submits a non-empty comment, **Then** the comment appears in the issue's thread with the author's name and the submission timestamp
2. **Given** an issue with existing comments, **When** any user opens the issue, **Then** all comments are displayed in chronological order
3. **Given** a comment the current user authored, **When** they edit it and save, **Then** the comment thread reflects the updated text (with an indication it was edited)
4. **Given** a comment the current user authored, **When** they delete it, **Then** the comment is removed from the thread
5. **Given** an issue comment form, **When** a user attempts to submit an empty comment, **Then** the system rejects the submission

---

### Edge Cases

- What happens when two users simultaneously drag the same card to different columns? (Last confirmed write wins; the card settles at the server-confirmed position and any conflicting client is updated within one second)
- What happens when a user loses network connectivity mid-drag? (The card reverts to its previous column and the user is notified that the move could not be saved)
- What happens when a column is renamed while another user is viewing it? (The renamed column updates on the other user's screen within one second, consistent with the live-update requirement)
- How does filtering interact with real-time updates? (Cards that no longer match active filters after a move are removed from the filtered view within one second)
- What happens when the filtered assignee or label has no matching issues? (Columns remain visible but appear empty; a "No results for current filters" message is shown)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display issues as draggable cards organized in named, ordered columns on a board view
- **FR-002**: Users MUST be able to move cards between columns and reorder cards within a column by dragging and dropping; the resulting order MUST be persisted
- **FR-003**: All users actively viewing the same board MUST see card position changes reflected within one second of the change being confirmed by the server
- **FR-004**: Each issue MUST carry: a required title, an optional description, zero or more assignees, exactly one priority level (Critical / High / Medium / Low), zero or more labels, and a comment thread
- **FR-005**: Users MUST be able to create a new issue directly from the board; the new issue MUST appear in the first column by default
- **FR-006**: Users MUST be able to open an issue card to view and edit all of its fields (title, description, assignees, priority, labels)
- **FR-007**: Users MUST be able to add comments to any issue; users MUST be able to edit and delete their own comments
- **FR-008**: Users MUST be able to filter the board by one or more assignees, one or more labels, and a priority level; multiple filters MUST be combinable and applied simultaneously
- **FR-009**: Filtered board views MUST update in real time as cards are moved or edited by any team member, consistent with FR-003
- **FR-010**: Project owners and admins MUST be able to add, rename, and reorder columns on a board; columns MUST be reorderable by dragging the column header directly on the board; all such changes MUST be reflected on all active viewers' screens within one second, consistent with FR-003
- **FR-011**: Project owners and admins MUST be able to delete a non-default column only after all issues within it have been moved to another column or deleted; the column removal MUST propagate to all active viewers within one second
- **FR-015**: The three default columns ("Backlog", "In Progress", "Done") MUST NOT be deletable; they MAY be renamed by project owners and admins
- **FR-012**: The system MUST reject issue creation or editing submissions when the title field is empty
- **FR-013**: The system MUST reject comment submissions when the comment body is empty
- **FR-014**: When a card move cannot be confirmed due to a connectivity failure, the card MUST revert to its previous column and the user MUST be shown an error notification

### Key Entities

- **Board**: Belongs to a project; contains an ordered list of columns; identified by a name
- **Column**: Named container within a board; maintains an ordered sequence of issues; can be created, renamed, reordered, and deleted (when empty)
- **Issue**: The primary work item; carries a required title, optional description, zero or more assignees, exactly one priority level, zero or more labels, and a comment thread; belongs to exactly one column at a time
- **Label**: A named tag applied to issues; scoped to a board; reusable across multiple issues on that board
- **Comment**: A text entry attached to an issue; carries author identity, body text, and creation timestamp; editable and deletable by the authoring user

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All team members viewing the same board see card position updates within one second of a move being confirmed by the server
- **SC-002**: A user can create a fully populated issue (all fields filled) and have it appear on the board in under 30 seconds from opening the creation form
- **SC-003**: Applying any filter (assignee, label, or priority) narrows the visible cards in under one second
- **SC-004**: Failed card moves due to network loss revert visually and surface a notification to the user within three seconds of failure detection
- **SC-005**: The board remains data-consistent when two users simultaneously move different cards (no cards lost, no duplicate positions)
- **SC-006**: 95% of first-time users can locate and apply a filter without assistance in their first session

## Clarifications

### Session 2026-08-16

- Q: Which project role(s) should be allowed to add, rename, reorder, and delete columns on a board? → A: Project owner / admin role only
- Q: Should column operations (add, rename, reorder) be reflected live on the screens of other users currently viewing the same board, within one second? → A: Yes — all column operations propagate live within one second
- Q: Should default columns be deletable, and what is the minimum column constraint? → A: Default columns ("Backlog", "In Progress", "Done") can be renamed but never deleted; also corrected default column names from "To Do" to "Backlog"
- Q: How should column reordering be performed — by dragging on the board or through a settings panel? → A: Drag column headers directly on the board
- Q: Who can create, rename, and delete labels on a board? → A: Project owners and admins only

## Assumptions

- Users are authenticated through the existing user-management system (from 001-user-role-management); unauthenticated users cannot access any board
- Each board belongs to a single project (from 002-project-management); boards are not shared across projects
- Boards are initialized with three default columns: "Backlog", "In Progress", and "Done"; project owners and admins may customize columns after creation
- A user may be assigned to an issue regardless of whether they are a member of the board's project; project-level access restrictions on assignees are out of scope for this feature
- Label management (create, rename, delete labels for a board) is performed within board settings by project owners and admins only; deleting a label removes it from all issues that carry it on that board
- Real-time updates apply only to users actively viewing the board in an open session; background push notifications and email alerts are out of scope for this feature
- Mobile browser support is in scope; native mobile application support is out of scope for v1
- Issue file attachments are out of scope for this feature
- Bulk operations (moving or editing multiple cards simultaneously) are out of scope for v1
- Issue linking (blocking/blocked-by relationships between issues) is out of scope for this feature
