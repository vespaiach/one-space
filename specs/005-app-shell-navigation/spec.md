# Feature Specification: App Shell Navigation

**Feature Branch**: `005-app-shell-navigation`

**Created**: 2026-08-16

**Status**: Draft

**Input**: User description: "app shell should has top bar and left side nav. Top bar has project name, a quick nav to switch task view by: status (kanban board), by assignees, by priority; a text box for search issues by it title. Side nav has project navigation, project setting if admin logged in, roadmap, project view detail, milestones, notifications, users menu"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core App Shell Layout (Priority: P1)

A user opens the application and sees the persistent app shell — a top bar across the top and a left side navigation panel — providing consistent wayfinding across all pages.

**Why this priority**: The app shell is the foundational chrome of the product. Without it, no other navigation or view-switching is possible. Every other story depends on this shell existing.

**Independent Test**: Can be tested by loading any project page and verifying that both the top bar and the side nav are visible and structurally correct with their expected elements present.

**Acceptance Scenarios**:

1. **Given** a user navigates to any project page, **When** the page loads, **Then** the top bar is displayed across the full width of the viewport containing the project name, task view switcher, and search box.
2. **Given** a user navigates to any project page, **When** the page loads, **Then** the left side navigation panel is displayed vertically along the left edge containing all applicable navigation items.
3. **Given** a user is on any page, **When** they scroll the main content area, **Then** the top bar and side nav remain fixed in place.

---

### User Story 2 - Task View Switching (Priority: P1)

A user wants to quickly switch between different ways of viewing project tasks — by status (kanban board), by assignees, or by priority — without leaving the current project context.

**Why this priority**: Task view switching is a core interaction advertised in the top bar. It directly supports the primary workflow of managing work items and must be immediately accessible.

**Independent Test**: Can be tested by clicking each of the three view options in the top bar and confirming the main content area updates to reflect the selected view mode.

**Acceptance Scenarios**:

1. **Given** a user is in any task view, **When** they select "By Status" in the top bar quick nav, **Then** the main content displays the kanban board view grouped by issue status.
2. **Given** a user is in any task view, **When** they select "By Assignees" in the top bar quick nav, **Then** the main content displays issues grouped by their assigned user.
3. **Given** a user is in any task view, **When** they select "By Priority" in the top bar quick nav, **Then** the main content displays issues grouped by priority level.
4. **Given** a user has selected a view, **When** the view is active, **Then** the corresponding nav item in the quick nav is visually highlighted to indicate the active selection.

---

### User Story 3 - Issue Search by Title (Priority: P2)

A user needs to quickly find a specific issue by typing part of its title into the search box in the top bar without navigating to a separate search page.

**Why this priority**: Search is a high-frequency action that improves navigation efficiency. It is secondary to the core shell layout but critical for usability at scale.

**Independent Test**: Can be tested independently by typing in the search box and verifying that matching issues appear, without requiring any other feature beyond basic issue data existing.

**Acceptance Scenarios**:

1. **Given** a user clicks the search box in the top bar, **When** they type a partial issue title, **Then** matching issues are shown in a results list beneath the search box within 1 second.
2. **Given** search results are displayed, **When** the user clicks a result, **Then** they are navigated to that issue's detail page.
3. **Given** the user types a string that matches no issue title, **When** results are loaded, **Then** an empty state message is shown indicating no results found.
4. **Given** the user clears the search box, **When** it becomes empty, **Then** the results list is dismissed.

---

### User Story 4 - Side Nav Primary Navigation (Priority: P2)

A user uses the left side navigation to move between the major sections of a project: the project overview, roadmap, project view detail, milestones, and notifications.

**Why this priority**: The side nav is the primary wayfinding mechanism for the project. Users must be able to reach all major areas of the product from it reliably.

**Independent Test**: Can be tested by clicking each side nav item and confirming the correct section is loaded in the main content area.

**Acceptance Scenarios**:

1. **Given** a user is logged in and viewing a project, **When** they click any side nav item (project navigation, roadmap, project view detail, milestones, notifications, users menu), **Then** the corresponding section loads in the main content area.
2. **Given** a user navigates to a section, **When** the section is active, **Then** the corresponding side nav item is visually highlighted.
3. **Given** a user opens the users menu item, **When** it is clicked, **Then** user-related options (profile, account settings, logout) are accessible from that entry point.

---

### User Story 5 - Admin-Only Project Settings (Priority: P3)

An admin user sees a "Project Settings" item in the side nav that is not visible to non-admin users, allowing them to access project configuration.

**Why this priority**: Role-based visibility is a security and UX concern but does not block core navigation for most users. It can be independently implemented and verified without affecting other nav items.

**Independent Test**: Can be tested by logging in as an admin and verifying the item is present, then logging in as a non-admin and verifying it is absent.

**Acceptance Scenarios**:

1. **Given** an admin user is logged in and viewing any project page, **When** the side nav renders, **Then** the "Project Settings" item is visible in the side nav.
2. **Given** a non-admin user is logged in and viewing any project page, **When** the side nav renders, **Then** the "Project Settings" item is not present in the side nav.
3. **Given** an admin clicks "Project Settings" in the side nav, **When** the link is followed, **Then** the project configuration page loads.

---

### Edge Cases

- What happens when a project name is very long? The top bar must truncate it gracefully without breaking the layout of adjacent elements.
- What happens when there are no issues matching the search query? An empty state must be shown rather than a blank or broken results area.
- What happens when a non-admin user accesses the project settings URL directly? The system must prevent unauthorized access and display an appropriate error or redirect.
- What happens when the side nav is viewed on a narrow viewport? The nav must remain accessible (collapsible or scrollable) without obscuring main content.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display a persistent top bar on all project pages containing: the active project name, a task view quick-nav with three options (By Status, By Assignees, By Priority), and a text search box.
- **FR-002**: The application MUST display a persistent left side navigation panel on all project pages containing: project navigation, roadmap, project view detail, milestones, notifications, and a users menu entry.
- **FR-003**: The side nav MUST display a "Project Settings" entry only when the currently logged-in user has the admin role for the project.
- **FR-004**: Selecting a task view option in the top bar quick-nav MUST update the main content area to display the corresponding view (kanban by status, grouped by assignee, or grouped by priority) and visually mark the selected option as active.
- **FR-005**: The search box MUST filter and display issues whose titles contain the entered text, returning results within 1 second of the user stopping input.
- **FR-006**: Clicking a search result MUST navigate the user to that issue's detail page.
- **FR-007**: Clearing the search box MUST dismiss the results list.
- **FR-008**: Clicking any side nav item MUST navigate the user to the corresponding project section and visually mark that item as active.
- **FR-009**: The top bar and side nav MUST remain fixed (non-scrolling) as the user scrolls the main content area.
- **FR-010**: The top bar project name MUST truncate with an ellipsis when it exceeds the available display width, preserving layout integrity.

### Key Entities

- **Project**: The active project being viewed; provides its name to the top bar and governs which navigation items are shown based on the current user's role within it.
- **User**: The currently authenticated person; their role (admin or non-admin) controls the visibility of the Project Settings nav item.
- **Issue**: A work item with a title; the primary data searched via the top bar search box and grouped in each task view.
- **Task View**: A mode of displaying issues — by status (kanban), by assignees, or by priority — selectable via the top bar quick nav.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between the three task views in under 2 seconds from a cold page load.
- **SC-002**: The search box returns visible results within 1 second of the user pausing input, for projects with up to 10,000 issues.
- **SC-003**: Non-admin users never see the Project Settings item; admin users always see it — verified across all test accounts with no exceptions.
- **SC-004**: The app shell (top bar + side nav) is present and functional on 100% of project pages with no layout breakage at standard desktop viewport widths (1024px and above).
- **SC-005**: 90% of users can reach any major project section via the side nav within 2 clicks from any starting page, without consulting documentation.

## Assumptions

- The application targets desktop viewport widths (1024px and above) as the primary supported breakpoint for the app shell; mobile/responsive layout is out of scope for this feature.
- Users are already authenticated when the app shell is displayed; the shell does not handle login or onboarding flows.
- Role information (admin vs. non-admin) for the current user is available from the existing authentication/session context without an additional network request.
- The search operates within the scope of the currently active project only; cross-project search is out of scope.
- The "users menu" in the side nav is a navigation entry point (linking to user-related pages such as profile or account settings); it is not a dropdown at this stage.
- Notifications in the side nav link to a notifications page; real-time badge counts are a separate feature and are out of scope here.
- The three task views (by status, by assignees, by priority) represent views that are already implemented or will be built as part of the referenced kanban feature (003-issue-kanban-board); this feature only provides the switching chrome.
