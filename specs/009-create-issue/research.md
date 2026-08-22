# Research: Create Issue

**Feature**: `009-create-issue` | **Phase**: 0 | **Date**: 2026-08-20

## Decision: Status is a fixed five-value enum, not a per-project columns table

**Decision**: Model status as a PostgreSQL enum `issue_status` with exactly five values — `backlog`, `todo`, `in_progress`, `done`, `canceled` — defaulting to `backlog`.

**Rationale**: The spec's clarification session fixed the status set at these five values, matching both `.specify/GLOSSARY.md` naming and the `status` StyleX token scale already defined in `styles/tokens.stylex.ts`. Board/column customization (`003-issue-kanban-board`) is discontinued and removed, so nothing in this feature's scope requires a per-project, addable/renameable/deletable column list. A fixed enum also makes FR-017 ("if the selected status column no longer exists at submission time, reject") vacuously true: every value in the fixed set always exists, so there is no code path where a submitted status becomes invalid.

**Alternatives considered**: A `board_columns` table scoped per project (as `003-issue-kanban-board` would have required) — rejected as unnecessary complexity now that customization is out of scope; it would also need seeding logic, ordering, and delete-guard rules with no feature left to exercise them.

## Decision: Priority is a fixed five-value enum

**Decision**: Model priority as a PostgreSQL enum `issue_priority` with values `none`, `low`, `medium`, `high`, `urgent`, defaulting to `none` ("No Priority").

**Rationale**: Matches FR-009/FR-010 and the `priority` StyleX token scale already defined in the codebase. A type-safe enum enforces "exactly one priority level" at the database layer, not just in application code.

**Alternatives considered**: Free-text priority — rejected, it has no validation and no natural default.

## Decision: Labels are project-scoped with case-insensitive uniqueness, resolved via insert-or-reuse

**Decision**: A `labels` table scoped by `project_id`, with a unique index on `(project_id, lower(name))`. Creating an issue with a typed label name that doesn't already exist inserts a new label using `ON CONFLICT DO NOTHING`, then re-selects by the same case-insensitive key if the insert reports a conflict, guaranteeing exactly one label row exists per name per project even under concurrent identical submissions (Edge Case: two users typing the same new label name at once).

**Rationale**: Directly satisfies FR-011–FR-013 and the concurrency edge case without needing an application-level lock; PostgreSQL's unique index does the serialization.

**Alternatives considered**: Optimistic check-then-insert without a unique index — rejected, it re-introduces the race the edge case explicitly calls out.

## Decision: Label color is assigned automatically by cycling a fixed 6-color palette

**Decision**: When a label is created, its color is chosen from the six tokens already defined in the `label` StyleX token scale (`design`, `bug`, `content`, `research`, `infra`, `a11y`), cycling by the project's current label count at creation time (`palette[count % palette.length]`).

**Rationale**: Matches the "Team Works" design mockup's own label-color cycling logic (`palette[(customLabels.length)%palette.length]`) exactly, and reuses tokens that already exist rather than inventing new colors — required by the Technology Stack gate (no raw color literals in components). The spec does not ask the creator to choose a label color, so auto-assignment is the minimal solution.

**Alternatives considered**: Letting the creator pick a color per label — rejected as scope the spec never requested (FR-012 only asks for a name).

## Decision: Assignee is validated against current project membership at submission time

**Decision**: The Server Action re-reads project membership for the selected assignee at submission time (not from client-submitted form state) via the same `project_memberships`-based query the project page already uses. If the assignee is no longer an active member, the issue is created unassigned and the creator is notified inline, per FR-016 — the whole submission is not rejected.

**Rationale**: Directly implements FR-016 and the corresponding edge case; reuses `getProjectAccessByKey`'s membership pattern instead of introducing a new authorization mechanism.

**Alternatives considered**: Rejecting the whole submission when the assignee is stale — rejected, contradicts FR-016 explicitly.

## Decision: Basic markdown is rendered with the already-approved `marked` dependency, restricted by a custom renderer

**Decision**: Implement `lib/markdown/render.ts` using `marked` (governance-approved 2026-08-18 for description-markdown rendering; see `specs/007-create-project/governance.md` and `specs/009-create-issue/governance.md`), configured with a custom `marked.Renderer` that implements only the five elements FR-004 lists — bold, italics, links, bulleted/numbered lists, and headings — and renders every other node type (images, code, blockquotes, tables, raw HTML, fenced code) as plain escaped text instead of its tag. Link `href` values are additionally checked against an allowed-scheme list (`http:`, `https:`, `mailto:`, or a relative path) before being emitted; anything else is rendered as plain text. The function is reusable both by the in-form Write/Preview toggle and by a future issue-view feature.

**Rationale**: `marked` is already an approved dependency for this exact class of problem (converting stored markdown to safe HTML), so using it here is reuse of an existing approval, not a new one (see governance.md for the scope note). Restricting the renderer to emit only FR-004's five elements satisfies FR-005 without adding a second dependency (e.g., DOMPurify) — `007-create-project`'s own governance record offers "use marked's built-in renderer hooks to strip disallowed elements at parse time" as an acceptable alternative to a paired sanitizer, and that is the path taken here. A hand-rolled regex parser was considered and rejected: `007-create-project`'s research explicitly found that non-trivial and fragile to edge cases, and reusing a maintained, already-approved library is the more robust and less speculative choice.

**Alternatives considered**: A hand-rolled escape-then-transform regex parser (avoids installing `marked` at all) — rejected; duplicates work the codebase already resolved via governance approval, and is more fragile than using the real parser's AST. `marked` + `DOMPurify` pair — rejected; DOMPurify was left "pending approval" in the original governance record, and the renderer-hook approach avoids needing it.

## Decision: "Visible within one second" (SC-007) is satisfied by synchronous commit, not a push layer

**Decision**: The issue insert commits in one transaction; any project member's next read (e.g., navigating to or refreshing a future issue list) reflects it immediately. No WebSocket, polling, or queue is introduced by this feature.

**Rationale**: This feature does not include a live board or list view to push updates into — that belongs to a future feature. Introducing live-push infrastructure here would be speculative work beyond what's asked.

**Alternatives considered**: A WebSocket/live-update channel — rejected as out of scope; nothing in this feature consumes it yet.

## Decision: A minimal "New issue" entry point is added to the existing project page

**Decision**: `app/(shell)/projects/[projectKey]/page.tsx` (currently a placeholder) gets one link to `/projects/{projectKey}/issues/new`.

**Rationale**: FR-001 requires members to be able to create an issue "within" a project; without any entry point the page is unreachable through normal navigation. This is the minimum addition to the existing placeholder page needed to make the feature usable, not a board rebuild.

**Alternatives considered**: Building a full board/list view first — rejected, that is `003-issue-kanban-board`'s discontinued scope, not this feature's.

## Decision: Human-readable Issue Key is out of scope for this feature

**Decision**: Issues are identified internally by a UUID primary key. No project-scoped sequential number or `{PROJECT_KEY}-{n}` display key is generated by this feature.

**Rationale**: The spec's Key Entities section for Issue does not list an issue key/number among its fields; adding one would be scope beyond what was asked. A future issue-listing or issue-detail feature can add a sequential number via its own migration when it needs one.

**Alternatives considered**: Generating the key now to avoid a future migration — rejected; it is speculative work for a feature that doesn't exist yet, and the glossary's Issue Key concept is not exercised by anything in this spec.

No unresolved `NEEDS CLARIFICATION` markers remain.
