# Page Contracts: Create Project

**Feature**: `007-create-project` | **Phase**: 1 | **Date**: 2026-08-18

Every page is a Next.js App Router Server Component. Authorization is always performed server-side; the UI never acts as the authorization boundary for the action it invokes.

## Shared UI Contract

- All styles use StyleX with values from `@/styles/tokens.stylex` (including the new `projectColors`); no raw CSS values or color literals in components.
- Every field has a programmatic label and an associated inline error target. A validation summary links to the first failing field and receives focus after a failed submission.
- Error states never rely on color alone; they include an icon or text indicator alongside any color change.
- The form is fully keyboard operable. Focus moves predictably: initial focus to the project name field; after a failed submit, focus moves to the validation summary.

## `GET /projects/new`

**File**: `app/(shell)/projects/new/page.tsx`

**Access**:

- No valid session cookie: redirect `/login`.
- Valid session for a non-admin user: return HTTP 403 (or redirect to a permission-denied page).
- Valid admin session: render the project creation form.

Authorization calls `requireAdmin()` from `lib/auth/` before any data load or render. The shell layout wrapping this route group handles the nav chrome; this page renders only the creation form content.

**Displays** (all within the shell):

| Control | Type | Required | Notes |
|---|---|---|---|
| Project Name | Text input | Yes | Auto-generates key on blur; clearing after manual key edit does not reset the key |
| Project Key / ID | Text input | Yes | Pre-filled by auto-generation; editable; shows live format hint `2–6 uppercase letters/digits` |
| Description | Textarea | Yes | Accepts raw markdown; static hint text lists supported elements (bold, italic, headings, lists, links, code) |
| Color | Swatch picker | Yes | Twelve color swatches from the hardcoded `projectColors` palette (red, coral, orange, amber, yellow, lime, green, teal, sky, blue, purple, pink); selected swatch is visually highlighted |
| Start Date | Date input | Yes | Native `<input type="date">` |
| End Date | Date input | No | Native `<input type="date">`; shown with an "(optional)" label |
| Submit | Button | — | "Create Project"; disabled while submission is in progress |

**Key auto-generation behavior** (Client Component `CreateProjectForm`):

1. On name field blur: if the key field has not been manually edited by the user, call `generateProjectKey(name)` and set the key field value.
2. Once the user manually edits the key field, a dirty flag is set; subsequent name changes do not overwrite the key.
3. The key is uppercased automatically on input (the component enforces uppercase display; the action validates the format).
4. Key availability is not checked client-side — the action handles conflict detection and returns an error if the chosen key exists.

**Submit**: `createProject`. On success, the action redirects to `/projects` (the project list). On failure, the action returns a discriminated error result and the form re-renders with per-field error messages.

**Admin control visibility**: This page is entirely inaccessible to non-admin users. The "New Project" button or link that leads here is rendered only for admin sessions in the shell navigation; direct URL access is blocked at the page boundary.
