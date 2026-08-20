# Server Action Contracts: Create Project

**Feature**: `007-create-project` | **Phase**: 1 | **Date**: 2026-08-18

Every Server Action is a mutation boundary. It authenticates, authorizes current DB state, validates all inputs, commits effects, and only then redirects or returns a result. Client-supplied role, session identity, and key availability are never trusted.

Expected business failures return a discriminated, field-safe result object. Secrets, raw exceptions, and database internals are never returned.

## `app/actions/projects.ts`

### `createProject(formData)`

**Inputs**: `name`, `key`, `description`, `color`, `startDate`, `endDate` (optional), `memberIds` (zero or more user UUIDs; optional, defaults to empty).

**Order**:

1. Call `requireAdmin()`. Reject with a 401/redirect if the session is invalid; reject with a 403 result if the session belongs to a non-admin. Capture the authenticated admin's `userId` for use in steps 4 and 5.

2. Extract and trim all string inputs. Validate:
   - `name`: non-empty after trim; 1–255 characters.
   - `key`: matches `/^[A-Z0-9]{2,6}$/` after uppercasing the input. Return a field error if the format is invalid.
   - `description`: non-empty after trim; maximum 10 000 characters (soft cap to prevent abuse).
   - `color`: one of the twelve allowed token keys (`red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink`). Return a field error for any other value.
   - `startDate`: valid `YYYY-MM-DD` string; must parse as a real calendar date.
   - `endDate`: when present, valid `YYYY-MM-DD` string; must be strictly after `startDate` (string comparison is sufficient for ISO 8601 dates; both are validated to be real dates first).
   - `memberIds`: must be an array of strings (may be empty); each element must be a valid UUID format. Silently filter out any ID equal to the authenticated admin's own `userId` (prevents self-membership). Any remaining ID that does not correspond to an existing user row is silently dropped (race condition: user deleted between selection and submit).

3. Check key uniqueness: query `projects` for a row with the given `key`. If found, return a field error for `key`: "This key is already in use. Choose a different one."

4. Open a database transaction. Within the transaction:
   a. Insert one row into `projects` with all validated values plus `created_by` set to the authenticated admin's `userId` and `created_at` / `updated_at` set to the current timestamp. Capture the new `project.id`.
   b. For each valid `userId` in the filtered `memberIds` list, insert one row into `project_members` with `project_id = project.id`, `user_id = userId`, `created_at = now()`.
   Commit. If any insert fails, roll back the entire transaction — no partial state is persisted.

5. Invalidate any cached reads covering the project list.

6. Redirect to `/projects`.

**Errors**: Each failing field returns an independent message in the result object:

| Field | Condition | Message |
|---|---|---|
| `name` | Blank or over 255 chars | "Project name is required" / "Project name must be 255 characters or fewer" |
| `key` | Invalid format | "Key must be 2–6 uppercase letters or digits (e.g., PROJ, MKT1)" |
| `key` | Already in use | "This key is already in use. Choose a different one." |
| `description` | Blank | "Description is required" |
| `description` | Over 10 000 chars | "Description must be 10 000 characters or fewer" |
| `color` | Not in the 12-color allowed set | "Select a color from the palette" |
| `startDate` | Missing or invalid | "A valid start date is required" |
| `endDate` | Not after startDate | "End date must be after the start date" |

`memberIds` validation errors (self-submission, non-existent user) are silently corrected rather than rejected — the form does not surface a field error for these cases.

**No partial effects**: If validation fails before the transaction opens, no rows are written. If the transaction fails, both the `projects` and `project_members` inserts are rolled back.

**Audit**: No separate audit event is required for project creation in this feature (no security-sensitive operation). A future audit trail feature may add one.

**Cache and redirect**: On success, `revalidatePath('/projects')` is called before `redirect('/projects')`. The redirect ensures the admin immediately sees the new project in the list (SC-004).
