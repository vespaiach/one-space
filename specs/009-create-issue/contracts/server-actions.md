# Contract: Server Actions

**Feature**: `009-create-issue` | **Phase**: 1

## `createIssue`

**Location**: `app/actions/issues.ts`

**Signature**: `createIssue(_prevState: CreateIssueResult, formData: FormData): Promise<CreateIssueResult>`

Matches the existing `createProject` / `addProjectMember` Server Action shape in this codebase (`useActionState`-compatible: previous state in, typed result out).

### Input (`FormData` fields)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectKey` | string | yes | Resolves to a project via the same lookup the project page uses |
| `title` | string | yes | Trimmed; 1–255 chars |
| `description` | string | no | ≤10,000 chars; raw markdown source |
| `status` | one of the five `issue_status` values | no | Defaults to `backlog` when absent |
| `priority` | one of the five `issue_priority` values | no | Defaults to `none` when absent |
| `labelIds[]` | string[] (UUIDs) | no | Existing labels selected in the picker |
| `newLabelNames[]` | string[] | no | Label names typed and created inline; each 1–50 chars |
| `assigneeId` | string (UUID) | no | Selected assignee, or absent for unassigned; `"me"` shorthand also accepted from the "Assign to me" control |

### Output (`CreateIssueResult`)

```ts
type CreateIssueResult =
  | { error: "forbidden" }
  | { error: "not_found" }
  | { fieldErrors: Partial<Record<"title" | "description" | "status" | "priority" | "labels", string>> }
  | null; // null = success; the action redirects on success, mirroring createProject
```

On success the action redirects to the created issue's project page (there is no issue-detail page in this feature's scope) and, if the requested assignee was no longer an active project member, appends a query flag the page reads to show an inline notice — no separate "warning" variant is added to `CreateIssueResult` because the whole submission still succeeds.

### Authorization order

1. `requireSession()` — reject as `error: "forbidden"` equivalent (unauthenticated) if no session, matching the existing `AuthorizationError` pattern in `lib/auth/guards.ts`.
2. Resolve `projectKey` → project; if it doesn't exist, return `error: "not_found"` without revealing whether the key ever existed (matches FR-002's "without exposing that project's data").
3. Check active `project_memberships` for `(project.id, session.userId)`; if absent, return `error: "forbidden"`.
4. Only after authorization passes: validate fields, resolve/create labels, validate assignee, insert.

### Atomic side effects

All writes (label insert-or-reuse, issue insert, `issue_labels` inserts) happen inside one `db.transaction(...)` call, per the Create-Issue Transaction in [data-model.md](../data-model.md). No side effect (including a newly-created label) is committed if the issue insert fails.

### Expected errors

| Condition | Result |
|-----------|--------|
| No session | `forbidden` |
| Project key doesn't resolve, or requester isn't a current member | `forbidden` (project existence is not distinguished from membership absence, per FR-002) |
| Blank/too-long title, too-long description, invalid status/priority value, over-long label name | `fieldErrors` with the specific field(s) |
| Requested assignee no longer an active member at submission time | Not an error — issue is created unassigned; success path carries a flag for the inline notice (FR-016) |
