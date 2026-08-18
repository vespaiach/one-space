# Feature Specification: Create Project

**Feature Branch**: `007-create-project`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "only admin can create a project. A project has name, description, color, start date, end date, key/id (short for easy to memorize). key/id, name, description, color, start date are required. Description field supports basic markdown"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Creates a Project with Required Fields (Priority: P1)

An admin creates a new project by providing the mandatory information: a short unique key, a name, a markdown-formatted description, a color, and a start date. The project is created and immediately accessible to the admin.

**Why this priority**: Project creation is the entry point to all project activity — nothing else can happen until a project exists. This story establishes the core creation path with minimal but complete data.

**Independent Test**: Can be fully tested by an admin submitting the project creation form with only required fields filled and verifying the project appears in the project list.

**Acceptance Scenarios**:

1. **Given** a logged-in admin, **When** they submit a project creation form with a valid key, name, markdown description, color, and start date, **Then** the project is created and appears in the project list.
2. **Given** a project creation form, **When** the admin submits without filling a required field (key, name, description, color, or start date), **Then** submission is blocked and a clear error is shown for each missing field.
3. **Given** a project creation form, **When** the admin enters a key that already exists, **Then** submission is blocked and an error indicates the key is already in use.
4. **Given** a successfully created project, **When** the admin views it, **Then** the description renders with markdown formatting (bold, italic, headings, lists, links).

---

### User Story 2 - Admin Creates a Project with an End Date (Priority: P2)

An admin creates a project and additionally provides an end date to define the project's time boundary.

**Why this priority**: The end date adds useful context but is not required for the project to function. It enhances planning but depends on the core P1 story.

**Independent Test**: Can be fully tested by creating a project with a valid end date and verifying both dates are saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** a logged-in admin, **When** they create a project with an end date that is after the start date, **Then** the project is saved with both dates correctly recorded.
2. **Given** a project creation form, **When** the admin enters an end date that is before or equal to the start date, **Then** submission is blocked with a clear error.

---

### User Story 3 - Non-Admin Cannot Create a Project (Priority: P1)

A non-admin user (regular member or guest) has no ability to create a project. The creation path is entirely inaccessible to them.

**Why this priority**: Access control is a hard requirement stated explicitly. It must hold unconditionally before any other behavior is tested.

**Independent Test**: Can be fully tested by logging in as a non-admin user and verifying the project creation option is absent and any direct access attempt is denied.

**Acceptance Scenarios**:

1. **Given** a logged-in non-admin user, **When** they view the projects area, **Then** no project creation option or button is visible to them.
2. **Given** a logged-in non-admin user, **When** they attempt to directly access the project creation page, **Then** they are denied access with an appropriate error.

---

### Edge Cases

- What happens when the key/id contains lowercase letters or special characters?
- What happens when the description contains unsupported markdown (e.g., raw HTML, images)?
- How does the system handle a project key that is valid in format but duplicates an archived project's key?
- What happens if a user's admin role is revoked while they have the creation form open?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only users with the admin role MUST be permitted to create a project; all other roles MUST be denied access to project creation.
- **FR-002**: The project creation form MUST collect the following required fields: key/id, name, description, color, start date.
- **FR-003**: The project creation form MUST offer the following optional field: end date.
- **FR-004**: The system MUST reject submission if any required field (key/id, name, description, color, start date) is missing or blank.
- **FR-005**: The project key/id MUST be unique across all projects (including archived ones) and conform to a short, memorable format: 2–6 uppercase alphanumeric characters (e.g., `PROJ`, `MKT1`).
- **FR-006**: The description field MUST support basic markdown: bold, italic, headings (H1–H3), unordered and ordered lists, inline links, inline code, and fenced code blocks.
- **FR-007**: The system MUST reject an end date that is on or before the start date.
- **FR-008**: A successfully created project MUST be immediately accessible to the creating admin.
- **FR-009**: The system MUST display actionable validation errors for each failing field when a submission is rejected.
- **FR-010**: The project key/id MUST be editable by the admin before submission but MUST default to an auto-suggestion derived from the project name (e.g., first letters of name words, uppercased and truncated to 6 characters).

### Key Entities

- **Project**: Represents a unit of organized work. Key attributes: key/id (unique, short, uppercase alphanumeric), name, description (markdown-enabled text), color (visual identifier), start date, end date (optional).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can complete project creation with all required fields in under 90 seconds.
- **SC-002**: 100% of project creation attempts by non-admin users are blocked — no exceptions.
- **SC-003**: All required-field validation errors are surfaced inline on the form before submission reaches the server.
- **SC-004**: A newly created project appears in the project list within 2 seconds of successful submission.
- **SC-005**: The description markdown preview (if shown) renders correctly for all supported markdown elements.

## Assumptions

- Key/id is auto-suggested from the project name (e.g., "Marketing Campaign" → "MC") but is always editable before saving; format is 2–6 uppercase alphanumeric characters.
- Basic markdown for description covers: bold (`**`), italic (`*`), headings (`#`, `##`, `###`), unordered lists (`-`), ordered lists (`1.`), inline links (`[text](url)`), inline code (`` ` ``), and fenced code blocks (` ``` `). Raw HTML and image embeds are out of scope.
- Color is selected from a predefined palette of project colors (not a free-form hex input); the specific palette is defined by the design system.
- Admin role is as defined in the user role management feature (001-user-role-management).
- Archived projects' keys remain reserved and cannot be reused for new projects.
- End date is always optional; a project may be open-ended.
