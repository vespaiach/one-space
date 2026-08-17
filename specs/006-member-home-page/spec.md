# Feature Specification: Member Home Page

**Feature Branch**: `006-member-home-page`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "Need a member home page, where to display: recent issues, latest assignments, top notifications & mention, recent projects, issues to due, recent comments"

## Clarifications

### Session 2026-08-16

- Q: Should the home page include a metrics summary section showing counts of in-progress issues, assignments due this week, and incomplete assignments? → A: Yes — display three counters: (1) in-progress count, (2) due-this-week count (hidden when zero), (3) not-done assignments count.
- Q: Where on the home page should the metrics summary section be displayed? → A: Horizontal summary bar at the top of the page, spanning full width above all widgets.
- Q: Should "this week" in the "Due this week" metric mean the current calendar week or a rolling 7-day window? → A: Current calendar week — Monday 00:00 through Sunday 23:59.
- Q: Should clicking a metric counter navigate the member to a filtered list of the corresponding issues? → A: Yes — each counter is a clickable link to the issue list pre-filtered to that metric's scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Activity at a Glance (Priority: P1)

A logged-in member lands on the home page and immediately sees their most important work items: issues due soon, unread notifications and mentions, and recent assignments — all in a single view without navigating to separate sections.

**Why this priority**: This is the core value proposition of the home page. It eliminates the need to hunt across multiple sections to stay on top of urgent work.

**Independent Test**: Can be tested by logging in as a member who has assigned issues with due dates and pending notifications; the home page must display those items without any additional navigation.

**Acceptance Scenarios**:

1. **Given** a member is logged in, **When** they navigate to the home page, **Then** they see a full-width metrics bar at the top followed by widgets for: due issues, notifications & mentions, recent assignments, recent issues, recent projects, and recent comments.
2. **Given** a member has overdue issues, **When** they view the home page, **Then** overdue issues appear prominently in the "Issues Due" widget with a visual indicator distinguishing them from upcoming ones.
3. **Given** a member has unread mentions, **When** they view the home page, **Then** unread mentions appear at the top of the "Notifications & Mentions" widget with an unread indicator.

---

### User Story 2 - Act on Due and Assigned Issues (Priority: P2)

A member uses the home page to quickly identify and act on issues that need attention — those assigned to them and those approaching or past their due date.

**Why this priority**: The home page should reduce friction for taking action, not just provide information. Members need one-click access to open an issue from the home page.

**Independent Test**: Can be tested by assigning several issues to a member, setting due dates, and verifying that each item in the widgets links directly to the issue detail page.

**Acceptance Scenarios**:

1. **Given** a member has issues assigned to them, **When** they view the "Latest Assignments" widget, **Then** they see the most recently assigned issues listed with title, project, and due date (if set).
2. **Given** a member clicks an issue in any home page widget, **When** the click action fires, **Then** they are taken directly to that issue's detail page.
3. **Given** a member has more issues than the widget can display, **When** they view the widget, **Then** a "View all" link is visible that navigates to the full filtered list.

---

### User Story 3 - Stay Updated via Notifications and Mentions (Priority: P2)

A member uses the "Notifications & Mentions" widget on the home page to review and respond to updates that specifically involve them, without visiting a separate notifications center.

**Why this priority**: Mentions and direct notifications are time-sensitive; surfacing them on the home page keeps members responsive.

**Independent Test**: Can be tested by having another user mention the member in a comment, then verifying the mention appears in the home page widget before the member opens the notifications center.

**Acceptance Scenarios**:

1. **Given** another user mentions the member in a comment, **When** the member views the home page, **Then** the mention appears in the "Notifications & Mentions" widget.
2. **Given** a member has both notifications and direct mentions, **When** they view the widget, **Then** mentions are visually distinguished from general notifications.
3. **Given** a member clicks a notification or mention, **When** the click action fires, **Then** they are navigated to the relevant issue or comment.

---

### User Story 4 - Track Recent Activity (Priority: P3)

A member uses the home page to catch up on recent activity across issues and comments they are involved with, providing context without requiring them to browse individual projects.

**Why this priority**: Useful for orientation after absence or end-of-day review, but less critical than acting on due items or notifications.

**Independent Test**: Can be tested independently by verifying that recently created/updated issues appear in "Recent Issues" and recently posted comments appear in "Recent Comments" widgets.

**Acceptance Scenarios**:

1. **Given** issues have been recently created or updated, **When** the member views the home page, **Then** the "Recent Issues" widget shows the most recently active issues the member has access to, in reverse-chronological order.
2. **Given** comments have been recently posted on issues the member follows or is assigned to, **When** the member views the home page, **Then** the "Recent Comments" widget shows snippets of those comments with author and issue context.
3. **Given** the member has access to multiple projects, **When** they view the home page, **Then** the "Recent Projects" widget shows the projects they have most recently interacted with.

---

### Edge Cases

- What happens when a member has no data yet (new account, no assignments, no projects)? Each widget MUST display an empty-state message that guides the member toward their first action; the metrics bar MUST show zero counts (except "Due this week" which is hidden when zero).
- What happens when a member clicks a metric counter? They MUST be navigated to the issue list pre-filtered to that metric's scope (e.g., clicking the "In Progress" counter shows only their in-progress issues).
- What happens when a member's session expires while viewing the home page? They MUST be redirected to the login page when they interact with any widget.
- How does the system handle a member who is a member of many projects with thousands of issues? Each widget MUST limit displayed items to a defined maximum (e.g., 5–10 most recent) and always provide a "View all" escape hatch.
- What happens if real-time data is unavailable? Each widget MUST display the last known data with a stale indicator, rather than showing an error or blank state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home page MUST be accessible only to authenticated members; unauthenticated visitors MUST be redirected to the login page.
- **FR-002**: The home page MUST display a full-width horizontal metrics bar at the top of the page (above all widgets) showing three counters for the logged-in member: (1) number of issues currently in an "In Progress" status assigned to them, (2) number of assigned issues due within the current calendar week (Monday 00:00 through Sunday 23:59) — only shown when the count is greater than zero, and (3) number of assigned issues not yet in a completed/done status. Each counter MUST be a clickable link that navigates to the issue list pre-filtered to that metric's scope.
- **FR-003**: The home page MUST display a "Recent Issues" widget showing the most recently created or updated issues the member has access to, ordered by most-recent-first.
- **FR-004**: The home page MUST display a "Latest Assignments" widget showing issues currently assigned to the member, ordered by assignment date (most recent first).
- **FR-005**: The home page MUST display a "Notifications & Mentions" widget showing the member's unread and recent notifications, with direct mentions visually distinguished from general notifications.
- **FR-006**: The home page MUST display a "Recent Projects" widget showing the projects the member has most recently interacted with.
- **FR-007**: The home page MUST display an "Issues Due" widget showing issues assigned to the member that are due within the next 7 days or are overdue, ordered by due date ascending (most urgent first).
- **FR-008**: The home page MUST display a "Recent Comments" widget showing the most recent comments posted on issues the member is assigned to or is following.
- **FR-009**: Each widget MUST limit displayed items to a maximum of 10 entries and provide a "View all" link navigating to the full filtered list.
- **FR-010**: Every issue, comment, notification, and project item displayed on the home page MUST be a clickable link that navigates the member directly to the relevant detail page.
- **FR-011**: Each widget MUST display a meaningful empty-state message when no relevant data exists for the member.
- **FR-012**: Overdue issues in the "Issues Due" widget MUST be visually marked as overdue, distinct from upcoming due items.
- **FR-013**: Unread notifications and mentions MUST be visually indicated as unread within the "Notifications & Mentions" widget.
- **FR-014**: The home page layout MUST be responsive and usable across desktop and mobile screen sizes.

### Key Entities

- **Member**: An authenticated user with a workspace role; the actor who views the home page.
- **Issue**: A trackable work item belonging to a project; has attributes including title, assignee(s), due date, status, and associated comments.
- **Assignment**: The relationship between a member and an issue indicating that issue is assigned to them.
- **Notification**: An event-triggered alert directed at a member (e.g., status changes, due-date warnings).
- **Mention**: A specific type of notification created when another user references the member (e.g., `@username`) in a comment or issue description.
- **Project**: A container for issues; members belong to projects and have visibility scoped to their membership.
- **Comment**: A text entry posted by a member on an issue thread.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A member can navigate to the home page and identify their most urgent due issue within 10 seconds of page load.
- **SC-002**: The home page loads and displays all widgets within 3 seconds under normal network conditions.
- **SC-003**: 90% of members completing a usability test can locate a specific widget (e.g., "Notifications & Mentions") without guidance.
- **SC-004**: Zero issues or comments invisible to the member (due to permissions) appear in any home page widget.
- **SC-005**: Members with no data in a widget see a clear empty-state message in 100% of cases; no blank or error-only states are permitted.
- **SC-006**: Clicking any item on the home page navigates the member to the correct detail page within 1 second in 99% of cases.

## Assumptions

- Members are assumed to be authenticated via the existing authentication system; no new auth mechanism is introduced.
- The home page is scoped to the individual member's own data (their assignments, mentions, etc.) — it is not a team-wide or admin dashboard.
- "Recent" is defined as activity within the last 30 days unless a widget's content set is smaller than 10 items, in which case the most recent 10 items regardless of date are shown.
- "Issues Due" covers items due within the next 7 days plus any already overdue, ordered by due date ascending.
- The maximum number of items shown per widget is 10; this value may be made configurable in a future iteration but is fixed for this release.
- Project visibility follows the existing role and permission model; no new permission rules are introduced by this feature.
- Mobile support is in scope; native app support is out of scope for this release.
- Real-time push updates to widgets are out of scope; the page reflects data at load time with an option for the member to manually refresh.
