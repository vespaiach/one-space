# Research: Create Project

**Feature**: `007-create-project` | **Phase**: 0 | **Date**: 2026-08-18

## 1. Admin Auth Guard Reuse

**Decision**: Call the existing `requireAdmin()` helper from `lib/auth/` in both the Server Component page and the `createProject` Server Action. The pattern is identical to the guard used by admin-restricted pages and actions in 001.

**Rationale**: The 001 research established that every protected boundary must call an authoritative guard that hashes the cookie, loads the current session and user row, and checks role. The UI never being the authorization boundary. The same guard function covers this feature with no modification.

**Alternatives considered**:

- Middleware-only guard: rejected for the same reason as 001 — middleware cannot be the sole authorization boundary for reachable Server Actions.
- Separate admin check in the form: rejected — client components cannot be trusted for authorization.

**Local reference**: `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`

## 2. Key Auto-Generation Algorithm

**Decision**: Implement a pure `generateProjectKey(name: string): string` function in `lib/projects/key-generator.ts` using the following algorithm:

1. Split name on whitespace into words.
2. Take the first Unicode letter/digit of each word, uppercased.
3. If the resulting string is fewer than 2 characters, append characters from the first word (uppercased) until 2 characters are reached.
4. Strip any character that is not ASCII alphanumeric (`[A-Z0-9]`).
5. Truncate to 6 characters.
6. If the result is empty (e.g., name contains only symbols), return `"PROJ"` as a safe fallback.

Conflict resolution is handled by the server action: if the submitted key already exists in the database, the action returns a field-level validation error ("This key is already in use. Choose a different one."). No suffix increment is performed — the admin edits the key and resubmits. The client presents the auto-generated key as-is without a uniqueness check.

**Rationale**: The algorithm is deterministic, pure, and independently testable with no I/O. Conflict detection belongs in the action because it requires a database read. A simple error-and-retry approach keeps the server action logic minimal and gives the admin explicit control over the final key value.

**Alternatives considered**:

- Numeric suffix increment (MC → MC2 → MC3): considered but rejected — it required either a client-side pre-load of all existing keys or a server-side search loop, adding complexity for an edge case that occurs rarely in practice.
- Truncation of full name (e.g., "MARKET"): rejected per clarification — first letters of each word is the specified algorithm; single-word pad is the specified fallback.

## 3. Project Color Palette

**Decision**: Add a `projectColors` `defineVars` group to `styles/tokens.stylex.ts`. The palette is a hardcoded set of 12 colors evenly distributed around the color wheel for maximum mutual distinctiveness at swatch size:

| Token | Value | Visual |
|---|---|---|
| `red` | `oklch(0.5656 0.1608 34.09)` | terracotta red |
| `coral` | `oklch(0.6300 0.1550 30.00)` | warm coral |
| `orange` | `oklch(0.6396 0.1221 54.97)` | burnt orange |
| `amber` | `oklch(0.7200 0.1132 72.89)` | warm amber |
| `yellow` | `oklch(0.8100 0.1400 95.00)` | golden yellow |
| `lime` | `oklch(0.7200 0.1300 130.00)` | yellow-green |
| `green` | `oklch(0.6050 0.0591 141.65)` | sage green |
| `teal` | `oklch(0.5880 0.0851 195.00)` | teal |
| `sky` | `oklch(0.6500 0.0900 230.00)` | sky blue |
| `blue` | `oklch(0.5259 0.0603 247.43)` | slate blue |
| `purple` | `oklch(0.5432 0.1084 305.31)` | violet |
| `pink` | `oklch(0.6800 0.1300 350.00)` | rose pink |

The `color` column in `projects` stores the token key name (e.g., `"red"`). Components map the stored key to its token at render time via a `projectColors[color]` lookup. No raw color literal appears in any component — only token references.

**Rationale**: Adding tokens to `tokens.stylex.ts` is an extension of the design system, not a new dependency. Storing the token key name (not the raw value) in the database decouples the palette's visual appearance from the stored data; a future token update propagates to all existing projects automatically.

**Alternatives considered**:

- Free-form hex input: rejected by the spec assumption explicitly.
- Reusing existing `colors.*` tokens: rejected — semantic role tokens (e.g., `destructive`) should not be repurposed as project identity colors; a dedicated palette is cleaner.
- Storing raw oklch in the database: rejected — color values in the DB would require a migration if the palette changes.

## 4. Markdown Rendering

**Decision**: Flag `marked` as a required dependency pending governance approval. Until approval is granted, the description is stored and displayed as plain text. The creation form captures and stores the raw markdown string regardless of approval status — the approval gates only the HTML render path.

**Rationale**: The spec mandates markdown rendering (FR-006, AC 4). No built-in Node.js or Next.js API parses markdown. `marked` is the lightest option (zero runtime dependencies, CommonMark-compatible, MIT license). Hand-rolling a parser covering H1–H3, bold, italic, both list types, inline links, inline code, and fenced code blocks is non-trivial and fragile to edge cases.

When `marked` is approved, the rendering path is: `marked.parse(description)` on the server (in the project detail Server Component), then rendered via `dangerouslySetInnerHTML` with output sanitized by `DOMPurify` (also pending approval as a pair dependency) or by configuring `marked`'s sanitizer options to strip unsafe HTML.

**Alternatives considered**:

- `micromark` + `mdast-util-*` plugins: more modular but requires more packages for the same feature surface — worse for Principle IV.
- `remark` + `rehype`: full AST pipeline, large dependency surface — overkill for basic markdown.
- Custom regex-based parser: rejected for robustness reasons; would require its own test suite comparable in size to `marked` itself.

**Status**: `marked` approved by project owner on 2026-08-18. HTML sanitization must be configured via `marked`'s built-in `sanitize` option or a paired `DOMPurify` call on the rendered output before it reaches `dangerouslySetInnerHTML`.

## 5. Date Input Handling

**Decision**: Use native `<input type="date">` elements for both start date and end date. The value attribute is `YYYY-MM-DD` (ISO 8601 date string). Date comparison validation runs in the Server Action: `endDate >= startDate` is rejected (FR-007 requires end date strictly after start date, i.e., `endDate > startDate`).

**Rationale**: Native date inputs are supported by all modern browsers and require zero additional code. Drizzle ORM's `date()` column type maps to a JavaScript string in `YYYY-MM-DD` format for PostgreSQL `date` columns — no conversion library needed.

**Alternatives considered**:

- Date-picker library: rejected — no spec requirement for calendar UI; native input satisfies SC-001 (under 90 seconds); avoids a new dependency.
- JavaScript `Date` object comparison: usable but unnecessary — string comparison of `YYYY-MM-DD` is lexicographically equivalent and avoids timezone issues introduced by `new Date()`.
