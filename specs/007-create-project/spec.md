# Feature Specification: Create Project

**Feature Branch**: `007-create-project`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "only admin can create a project. A project has name, description, color, start date, end date, key/id (short for easy to memorize). key/id, name, description, color, start date are required. Description field supports basic markdown"

## Clarifications

### Session 2026-08-18

- Q: When the auto-generated key already exists in the system, how should the system respond? → A: Auto-append a number suffix (e.g., "MC" → "MC2") and let admin edit freely.
- Q: If the project name is a single word, the first-letter algorithm yields fewer than 2 characters — how should the system handle this? → A: Use the first N characters of the name until the minimum length is met (e.g., "Marketing" → "MA").
- Q: When should the key field auto-generate — on every name keystroke, or once on name blur and then frozen once the admin edits it manually? → A: Generate once on name field blur; once the admin edits the key manually, stop auto-updating it.
- Q: Can the project key be edited after the project has been created, or is it locked once saved? → A: Locked immediately after creation — it cannot be changed post-save.
- Q: What specific colors make up the predefined project color palette, and how many are there? → A: 12 hardcoded colors: red, coral, orange, amber, yellow, lime, green, teal, sky, blue, purple, pink.
- Q: Is the `/projects` list page (FR-008 redirect target) specified in this feature or a cross-feature dependency? → A: Cross-feature dependency — assumed to exist; out of scope for this spec.
- Q: Does the newly created project appear highlighted in the list, or simply present in default order? → A: Simply present in default list order — no special highlight or indicator.
- Q: Are exact validation error message texts specified in the spec or defined elsewhere? → A: Canonical error texts are defined in contracts/server-actions.md; FR-009 references that contract as the authoritative source.
- Q: What does the system display on a server-side DB insert failure (not a validation error)? → A: A generic inline form-level message ("Something went wrong. Please try again.") without resetting field values.
- Q: Is the 10,000 character limit on the description field captured in the functional requirements? → A: Yes — added to FR-006.
- Q: What does the system display if markdown rendering fails at runtime (e.g., malformed stored content)? → A: Show the description as raw markdown plaintext — the safest fallback, preserving content readability.
- Q: When the auto-generated key matches an existing key, should the form suggest a conflict-free alternative client-side, or should the server return a field error after submit? → A: Server-side error only — the form presents the generated key as-is without a client-side uniqueness check; if the submitted key is already in use the server action returns a field-level error.

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
5. **Given** a project creation form, **When** the admin enters "Marketing Campaign" in the name field and tabs away, **Then** the key field auto-populates with "MC".

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
3. **Given** a logged-in non-admin user, **When** they attempt to directly call the `createProject` server action (e.g., via a crafted request bypassing the UI), **Then** the action returns an unauthorized result and no project row is inserted.

---

### Edge Cases

- What happens when the key/id contains lowercase letters or special characters?
- What happens when the description contains unsupported markdown (e.g., raw HTML, images)?
- How does the system handle a project key that is valid in format but duplicates an archived project's key?
- What happens if a user's admin role is revoked while they have the creation form open?
- What happens if the admin's session expires while the creation form is open and they then submit? → The server action's `requireAdmin()` rejects the expired session; the admin is redirected to the login page and no project data is saved.
- What happens if two admins simultaneously submit with the same auto-generated key (race condition)? → The database's `UNIQUE` constraint on `key` ensures exactly one insert succeeds; the concurrent request receives the uniqueness violation mapped to the standard field error: "This key is already in use. Choose a different one."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only users with the admin role MUST be permitted to create a project; all other roles MUST be denied access to project creation.
- **FR-002**: The project creation form MUST collect the following required fields: key/id, name, description, color, start date. The color field MUST be a swatch selection from the 12-color hardcoded palette: red, coral, orange, amber, yellow, lime, green, teal, sky, blue, purple, pink.
- **FR-003**: The project creation form MUST offer the following optional field: end date.
- **FR-004**: The system MUST reject submission if any required field (key/id, name, description, color, start date) is missing or blank.
- **FR-005**: The project key/id MUST be unique across all projects (including archived ones) and conform to a short, memorable format: 2–6 uppercase alphanumeric characters (e.g., `PROJ`, `MKT1`). Once a project is saved, its key is immutable and MUST NOT be editable by any user role.
- **FR-006**: The description field MUST support basic markdown: bold, italic, headings (H1–H3), unordered and ordered lists, inline links, inline code, and fenced code blocks. The description MUST NOT exceed 10,000 characters after trimming. If markdown rendering fails at runtime, the system MUST display the raw markdown source as plaintext rather than showing an error or blank.
- **FR-007**: The system MUST reject an end date that is on or before the start date.
- **FR-008**: A successfully created project MUST be immediately accessible to the creating admin.
- **FR-009**: The system MUST display actionable validation errors for each failing field when a submission is rejected. Canonical error message texts are defined in `contracts/server-actions.md` and are the authoritative reference. If a server-side exception occurs (e.g., DB insert failure unrelated to validation), the system MUST display a generic form-level message ("Something went wrong. Please try again.") without resetting any field values.
- **FR-010**: The project key/id MUST be editable by the admin before submission but MUST default to an auto-suggestion derived from the project name using the following algorithm: (1) take the first letter of each word, uppercased; (2) if the result is fewer than 2 characters, append leading characters from the first word until the minimum length of 2 is reached (e.g., "Marketing" → "MA"); (3) truncate to 6 characters. The auto-generated key is presented to the admin as-is, without a client-side uniqueness check. If the submitted key is already in use, the server action MUST return a field-level validation error; the admin must choose a different key.

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

- Key/id is auto-generated when the admin leaves the project name field (on blur). The algorithm: take the first letter of each word uppercased; if the result is fewer than 2 characters, pad with leading characters from the first word (e.g., "Marketing" → "MA"); truncate to 6 characters. Once the admin manually edits the key field, auto-generation stops — the field is no longer overwritten by name changes.
- Basic markdown for description covers: bold (`**`), italic (`*`), headings (`#`, `##`, `###`), unordered lists (`-`), ordered lists (`1.`), inline links (`[text](url)`), inline code (`` ` ``), and fenced code blocks (` ``` `). Raw HTML and image embeds are out of scope. All other markdown syntax (strikethrough, tables, footnotes, task lists) is unsupported and is treated as literal text or stripped during rendering.
- Color is selected from a hardcoded palette of 12 project colors (not a free-form hex input): `red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink`. The palette is fixed in the implementation and is not configurable by users or admins.
- Admin role is as defined in the user role management feature (001-user-role-management).
- Archived projects' keys remain reserved and cannot be reused for new projects.
- End date is always optional; a project may be open-ended.
- The `/projects` list page is an existing or future feature outside the scope of this spec. This feature treats it as a known cross-feature dependency and assumes it exists as a valid redirect destination after project creation.
- After successful creation, the new project appears in the project list in default sorted order — no special highlight, badge, or visual indicator is applied to the newly created entry.
- FR-008's "immediately accessible" refers to the server redirect executing synchronously on action success — no extra delay is added. SC-004's 2-second target is a separately measurable performance criterion covering the time from submit to the new project appearing in the rendered list.
- SC-003's guarantee that required-field errors are surfaced before the request reaches the server applies to blank/format checks only. Key uniqueness requires a database query and is reported in the server action's response — this is not a violation of SC-003.
- Validation errors appear inline per field simultaneously after a failed submit. Focus moves to the validation summary, which links to the first failing field.
- The key auto-generation triggers on any `blur` event from the project name input — whether the admin tabs, clicks elsewhere, or switches windows. All are treated identically.
- Any `change` event on the key input (typing, pasting, or browser autofill) counts as a manual edit and sets the dirty flag, disabling further auto-generation from name changes.
- SC-001's 90-second completion target assumes a standard modern browser, no exceptional network latency, and a project list under 100 existing entries.
- SC-004's 2-second window is measured from the admin clicking Submit to the `/projects` list page rendering with the new project visible.
- SC-005 is verified by rendering descriptions containing each element enumerated in FR-006 and confirming the expected HTML output: `<strong>`, `<em>`, `<h1>`–`<h3>`, `<ul>/<li>`, `<ol>/<li>`, `<a>`, `<code>`, `<pre><code>`.
- Navigating away from the creation form with unsaved data silently discards all entered values — no browser confirm dialog is shown.
- After a failed validation, all previously entered field values (name, key, description, color, dates) are retained in the form; the admin does not need to re-enter unchanged fields.
- Key generation is name-length-agnostic: the first-letter algorithm and 6-character truncation produce a valid key regardless of how long the project name is.
- No lower bound is imposed on the start date — a project may be created retroactively with a past start date.
- The color swatch picker is keyboard-navigable: arrow keys move focus between swatches (roving tabindex), Enter or Space selects the focused swatch, and Tab moves focus out of the swatch group.
- Each color swatch is announced to screen readers by its color name (e.g., `aria-label="amber"`). The currently selected swatch has `aria-checked="true"` (radio group) or `aria-pressed="true"` (toggle button).
- The keyboard focus order across the creation form is: Project Name → Project Key → Description → Color picker (first swatch, then arrow-key navigation within) → Start Date → End Date → Submit.
- CSRF protection is provided by Next.js Server Actions' built-in origin verification. Explicit rate limiting is not required — the form is admin-only and usage volume is negligible.
- The key format hint ("2–6 uppercase letters/digits") is rendered in a `<span>` with a unique `id` referenced by `aria-describedby` on the key input, so screen readers announce the constraint when the field receives focus.
- Markdown rendering via `marked` runs server-side in a Server Component. The HTML output is sanitized before passing to `dangerouslySetInnerHTML` — via `marked`'s built-in sanitization options or `DOMPurify` — permitting only the HTML elements corresponding to the supported syntax in FR-006.
