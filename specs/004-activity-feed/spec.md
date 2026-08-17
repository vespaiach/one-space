# Feature Specification: Activity Feed

**Feature Branch**: `004-activity-feed`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "the app must record activities around project and issues, mimicking 'Comments and activity' Trello's board and card"

## Clarifications

### Session 2026-08-16

- Q: Should issue-level events (created, status changed, assignee changed) appear in the project activity feed? → A: No. Project feed shows only project-level changes (name, description, road map updates, etc.) and comments posted on the project. Issue events belong exclusively to the issue feed.
- Q: Which project-level field changes should be automatically recorded as system events in the project activity feed? → A: Name, description, road map, and member add/remove.
- Q: Should members be able to comment on both issues and projects, and can they @mention other members? → A: Yes to both. Comments are allowed on issues and projects. @mentioning a project member highlights their name in the rendered comment.
- Q: When a member is @mentioned in a comment, should that member receive an in-app notification? → A: Yes — the mentioned member receives an in-app notification linking to the comment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Activity Feed on an Issue (Priority: P1)

A team member opens an issue and scrolls through its complete history: automated system entries showing when the issue was created, when its status changed, when it was reassigned — plus any comments left by colleagues. Everything is sorted newest-first and shows who did what and when.

**Why this priority**: The feed is the central feature; without read access there is no value from any other story.

**Independent Test**: Navigate to any issue detail page and confirm a chronological list of activity entries is displayed, each showing an author, timestamp, and content.

**Acceptance Scenarios**:

1. **Given** an issue with at least one automated event and one comment, **When** a user opens the issue detail page, **Then** a feed appears listing all entries in reverse-chronological order (newest first), each displaying the author name, relative or absolute timestamp, and entry content.
2. **Given** a brand-new issue with no comments, **When** a user opens it, **Then** the feed shows at least the "issue created" system event.
3. **Given** an issue with more than 50 activity entries, **When** a user opens it, **Then** the feed loads the most recent entries immediately and provides a way to load older entries without degrading page responsiveness.

---

### User Story 2 - View Activity Feed on a Project (Priority: P2)

A project manager opens a project and sees a feed of everything that has happened to the project itself: the project name was renamed, the description was updated, the road map was changed, a team member was added. Comments posted directly on the project also appear. Issue-level events (issue created, status changed, etc.) do NOT appear here — they belong exclusively to the issue activity feed.

**Why this priority**: Project-level visibility gives managers a clear audit trail of changes made to the project itself, distinct from the noise of individual issue updates.

**Independent Test**: Navigate to a project page and confirm a feed displaying only project-scoped activities is shown (project field changes and comments on the project); no issue-level events appear.

**Acceptance Scenarios**:

1. **Given** a project whose name was changed, **When** a user opens the project activity view, **Then** a system entry such as "Project renamed from 'Old Name' to 'New Name'" appears in the feed.
2. **Given** a project whose description was updated, **When** a user opens the project activity view, **Then** a system entry recording the description change appears in the feed.
3. **Given** a member is added to or removed from a project, **When** a user views the project activity feed, **Then** a system entry such as "Member Alice added" or "Member Bob removed" appears in the feed.
4. **Given** a user posts a comment directly on the project, **When** another user views the project activity feed, **Then** the comment appears attributed to the correct author.
5. **Given** an issue within a project has its status changed, **When** a user views the project activity feed, **Then** that issue status change does NOT appear in the project feed (it appears only in the issue's own feed).

---

### User Story 3 - Post a Comment (Priority: P3)

A developer leaves a comment on an issue or directly on a project explaining context or a decision. They can type `@` followed by a name to mention a specific team member, which highlights that member's name in the rendered comment. The comment appears immediately in the appropriate activity feed for all team members to read.

**Why this priority**: Comments are the primary human-authored content in the feed; they enable asynchronous collaboration. @mentions make it easy to draw a specific person's attention.

**Independent Test**: Submit a comment (with an @mention) on an issue and on a project page, and confirm both appear in their respective activity feeds attributed to the submitting user, with the mentioned member's name visually highlighted.

**Acceptance Scenarios**:

1. **Given** an authenticated user on an issue or project page, **When** they type a non-empty comment and submit, **Then** the comment appears at the top of the feed within 2 seconds, showing the user's name and the current timestamp.
2. **Given** a user tries to submit an empty comment, **When** they click submit, **Then** the action is blocked and an inline message tells them the comment cannot be empty.
3. **Given** a user submits a comment containing potentially harmful markup, **When** it is displayed in the feed, **Then** it renders as plain text without executing any scripts or injecting unexpected structure.
4. **Given** a user types `@` followed by a project member's name while composing a comment, **When** the comment is submitted and rendered, **Then** the mentioned member's name appears visually highlighted (e.g., as a styled mention tag) in the comment body, and that member receives an in-app notification linking to the comment.

---

### User Story 4 - Edit or Delete Own Comment (Priority: P4)

A developer realizes their comment has a typo or is no longer relevant and wants to fix or remove it.

**Why this priority**: Editing and deletion protect comment quality but are not blocking for the core activity-recording value.

**Independent Test**: Edit a previously posted comment and confirm the updated text appears in the feed; delete a comment and confirm it is removed from the feed.

**Acceptance Scenarios**:

1. **Given** a user views their own comment in the feed, **When** they choose to edit it and save, **Then** the feed shows the updated text and a visible "edited" indicator on that entry.
2. **Given** a user views their own comment, **When** they choose to delete it, **Then** the comment is removed from the feed and a confirmation is requested before the deletion is executed.
3. **Given** a user views another user's comment, **When** they view its options, **Then** no edit or delete controls are available for that entry.

---

### User Story 5 - Automated Activity Recording on Issue Changes (Priority: P1)

Whenever an issue status, assignee, or priority changes, the system automatically creates an activity entry so the history is complete without requiring manual input from anyone.

**Why this priority**: Automated recording is what makes the feed a reliable audit trail; it must fire on every meaningful state change.

**Independent Test**: Change an issue's status and confirm a new system-generated entry appears in that issue's feed without any user posting a comment.

**Acceptance Scenarios**:

1. **Given** a user changes an issue's status from "In Progress" to "Done", **When** the change is saved, **Then** the issue's feed immediately gains a new system entry reading approximately "Status changed from In Progress to Done" attributed to the acting user.
2. **Given** a user reassigns an issue to another team member, **When** the change is saved, **Then** a system entry appears recording who was the previous assignee and who is the new assignee.
3. **Given** a user changes an issue's priority, **When** the change is saved, **Then** a system entry records the old and new priority values.
4. **Given** an issue is first created, **When** creation completes, **Then** a system entry "Issue created" is recorded with the creator's identity.

---

### Edge Cases

- What happens when a user who posted a comment is later removed from the system? The comment remains in the feed attributed to the original user's display name (preserved at write time); their name is shown as "Deleted User" if not resolvable.
- What happens when a member mentioned via @mention is later removed from the project or the system? The mention highlight remains with the display name preserved at write time; it does not become a broken link.
- What if a comment body exceeds a reasonable length limit? The system rejects submissions over 10,000 characters with a clear message indicating the limit.
- What if an automated event fails to record due to a transient system error? The state change still completes; the missing activity entry is a non-blocking degradation. The error is logged internally.
- How are concurrent comments from multiple users ordered? Entries are ordered by server-assigned timestamp, not client submission time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a reverse-chronological activity feed on each issue detail view, showing all activity entries associated with that issue.
- **FR-002**: System MUST display a reverse-chronological activity feed on each project view, showing only project-level activity entries (project field changes and comments posted on the project). Issue-level events MUST NOT appear in the project activity feed.
- **FR-003**: System MUST allow any authenticated user to post a text comment on an issue or project.
- **FR-003b**: System MUST allow a commenter to mention another project member by typing `@` followed by the member's name. Mentioned member names MUST be visually highlighted in the rendered comment.
- **FR-016**: System MUST send an in-app notification to any member @mentioned in a comment. The notification MUST link directly to the comment in which the mention appeared.
- **FR-004**: System MUST reject comment submissions that are empty or exceed 10,000 characters, returning a clear user-facing message.
- **FR-005**: System MUST sanitize all comment content to prevent injection of executable code or unexpected markup before persisting or displaying it.
- **FR-006**: System MUST automatically record a system activity entry when an issue is created, identifying the creator. This entry is recorded in the issue's feed only.
- **FR-006b**: System MUST automatically record a system activity entry in the project feed when any of the following project-level fields change: project name, project description, road map, or project members (add or remove). The entry MUST capture the previous and new values (or the added/removed member) and the acting user.
- **FR-007**: System MUST automatically record a system activity entry when an issue's status changes, capturing the previous and new status values and the acting user.
- **FR-008**: System MUST automatically record a system activity entry when an issue's assignee changes, capturing the previous and new assignee and the acting user.
- **FR-009**: System MUST automatically record a system activity entry when an issue's priority changes, capturing the previous and new priority values and the acting user.
- **FR-010**: System MUST allow a user to edit the text of their own comment; edited comments MUST display a visible "edited" indicator in the feed.
- **FR-011**: System MUST allow a user to delete their own comment after confirming the action; deleted comments MUST be removed from the feed.
- **FR-012**: System MUST prevent users from editing or deleting comments authored by other users (non-admin role).
- **FR-013**: Each activity entry MUST store and display: the entry type (comment or system event), the author (user or "System"), a human-readable description or content body, and a timestamp.
- **FR-014**: System MUST paginate the activity feed so that loading an entity with a large number of entries does not degrade the user experience.
- **FR-015**: System MUST visually distinguish system-generated event entries from user-authored comment entries in the feed.

### Key Entities

- **Activity**: A single record in the feed tied to a parent entity (project or issue). Attributes: type (comment | system_event), author reference, textual content or description, timestamp, and parent entity reference.
- **Comment**: An Activity of type `comment`; content is the user-supplied text body (validated and sanitized). Supports edit and delete operations by the original author.
- **System Event**: An Activity of type `system_event` auto-generated by the platform when a tracked state change occurs. Includes a human-readable description capturing the before and after values (e.g., "Status changed from Open to In Progress").
- **Project**: An existing entity that can have Activities attached to it.
- **Issue**: An existing entity that can have Activities attached to it; the primary context for system events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A posted comment appears in the activity feed within 2 seconds of submission under normal conditions.
- **SC-002**: 100% of tracked issue state changes (create, status, assignee, priority) result in a corresponding system activity entry being recorded.
- **SC-003**: The activity feed for any project or issue loads and becomes interactive within 3 seconds, even when the entity has 500 or more activity entries.
- **SC-004**: 0% of submitted comment content containing executable code or markup reaches the display layer in an unescaped form.
- **SC-005**: Users can locate any historical activity entry for a project or issue by scrolling or paginating through the feed without requiring a search query.
- **SC-006**: 99% or more of valid comment submissions complete successfully (non-empty, within character limit, user authenticated).
- **SC-007**: When a member is @mentioned in a comment, that member's in-app notification is delivered within 5 seconds of the comment being posted under normal conditions.

## Assumptions

- Only authenticated users can view the activity feed or post comments; unauthenticated access is out of scope.
- Automated event recording covers four issue-level triggers: create, status change, assignee change, and priority change. Additional triggers (e.g., due date change, label change) are out of scope for this iteration.
- Project feeds are strictly scoped to project-level events: changes to project name, description, road map, or members (add/remove), and comments posted directly on the project. Issue-level events (create, status change, assignee change, priority change) are recorded only in the respective issue's feed and never bubble up to the project feed.
- Comment editing is permitted at any time after posting with no time-window restriction.
- The feed is scoped to individual projects and issues; there is no global cross-entity activity feed in this iteration.
- When a user account is deleted, their prior activity entries remain visible with the display name preserved at write time or shown as "Deleted User" if the name is no longer resolvable.
- Admins have the same edit/delete permissions as the original comment author (they can edit or delete any comment).
- The existing authentication and user management system provides user identity; this feature does not introduce new auth mechanisms.
