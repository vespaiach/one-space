# Data Model: Create Project

**Feature**: `007-create-project` | **Phase**: 1 | **Date**: 2026-08-18

## Entity Overview

| Entity | PostgreSQL table | Purpose |
|---|---|---|
| Project | `projects` | A named, color-coded unit of work with a unique short key, markdown description, and date boundaries |
| Project Membership | `project_members` | Junction table associating users with a project; rows may be created at project-creation time or added later |

## `projects`

| Field | Type / constraint | Meaning |
|---|---|---|
| `id` | UUID primary key | Stable project identifier |
| `key` | `varchar(6)`, unique, not null | 2–6 uppercase alphanumeric characters; immutable after insert |
| `name` | `varchar(255)`, not null | Human-readable project name; 1–255 characters after trim |
| `description` | `text`, not null | Raw markdown source; 1 character minimum after trim |
| `color` | `varchar(20)`, not null | One of the twelve `projectColors` token keys: `red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink` |
| `start_date` | `date`, not null | Project start boundary in `YYYY-MM-DD` format |
| `end_date` | `date`, nullable | Optional project end boundary; must be strictly after `start_date` when present |
| `created_by` | UUID FK → `users.id` ON DELETE RESTRICT, not null | Admin who created the project |
| `created_at` | `timestamptz`, not null, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz`, not null, default `now()` | Last modification timestamp |

**Indexes**:
- `UNIQUE (key)` — enforces FR-005 uniqueness across all projects with no conditions; the constraint holds regardless of any future project status (including archived rows), satisfying the "including archived ones" requirement without a partial index.
- Primary key on `id`.

**Key immutability**: The `key` column has no application-level update path. No Server Action or query function exposes a key-change operation. The database constraint alone is not sufficient — enforcement is in the application boundary.

### Validation Rules

| Field | Rule |
|---|---|
| `key` | Must match `/^[A-Z0-9]{2,6}$/` after uppercasing; must be unique in `projects` (checked in action before insert) |
| `name` | Trim Unicode whitespace; 1–255 characters; must not be blank after trim |
| `description` | Trim; 1 character minimum after trim; no maximum enforced at DB level (text column); application may impose a soft cap (e.g., 10 000 characters) to prevent abuse |
| `color` | Must be one of the twelve allowed token keys: `red`, `coral`, `orange`, `amber`, `yellow`, `lime`, `green`, `teal`, `sky`, `blue`, `purple`, `pink` |
| `start_date` | Must be a valid `YYYY-MM-DD` string; must be a real calendar date |
| `end_date` | When present: must be a valid `YYYY-MM-DD` string; must be strictly after `start_date` (i.e., `end_date > start_date`) |

### State Transitions

The `projects` table has no application-managed status column in this feature. All rows created by this feature are implicitly active. Future archiving support will add a status column via a separate migration.

```text
key: [set at creation] → immutable
end_date: null (open-ended project) or date value (bounded project)
```

## `project_members`

| Field | Type / constraint | Meaning |
|---|---|---|
| `project_id` | UUID FK → `projects.id` ON DELETE CASCADE, not null | The project the user belongs to |
| `user_id` | UUID FK → `users.id` ON DELETE RESTRICT, not null | The user added to the project |
| `created_at` | `timestamptz`, not null, default `now()` | When the membership was established |

**Primary key**: composite `(project_id, user_id)` — a user may belong to a given project at most once; duplicate inserts are rejected by the constraint.

**Indexes**:
- Composite primary key on `(project_id, user_id)` covers project-to-member lookups.
- Single-column index on `user_id` — enables reverse lookup (all projects a user belongs to) without a full-table scan.

**Cascade behavior**: `ON DELETE CASCADE` on `project_id` ensures membership rows are removed if the project is deleted. `ON DELETE RESTRICT` on `user_id` prevents user deletion while project memberships exist — a membership must be explicitly removed before the user can be deleted.

**Atomicity**: Rows in `project_members` are inserted within the same database transaction as the parent row in `projects`. If any membership insert fails, the entire transaction rolls back (no orphan project or partial membership state).

### Validation Rules

| Field | Rule |
|---|---|
| `project_id` | Must reference an existing `projects.id` row (enforced by FK) |
| `user_id` | Must reference an existing `users.id` row that is not the creating admin's own ID (enforced in the Server Action before insert) |

## `projectColors` Token Extension

New `defineVars` group added to `styles/tokens.stylex.ts` with the 12-color hardcoded palette:

```typescript
export const projectColors = stylex.defineVars({
  red:    "oklch(0.5656 0.1608 34.09)",
  coral:  "oklch(0.6300 0.1550 30.00)",
  orange: "oklch(0.6396 0.1221 54.97)",
  amber:  "oklch(0.7200 0.1132 72.89)",
  yellow: "oklch(0.8100 0.1400 95.00)",
  lime:   "oklch(0.7200 0.1300 130.00)",
  green:  "oklch(0.6050 0.0591 141.65)",
  teal:   "oklch(0.5880 0.0851 195.00)",
  sky:    "oklch(0.6500 0.0900 230.00)",
  blue:   "oklch(0.5259 0.0603 247.43)",
  purple: "oklch(0.5432 0.1084 305.31)",
  pink:   "oklch(0.6800 0.1300 350.00)",
});
```

**Usage**: Components import `projectColors` from `@/styles/tokens.stylex` and reference `projectColors[colorKey]` in `stylex.create`. The stored `color` string (e.g., `"red"`) is used as the index key. No raw color literal appears in any component.

## Drizzle Schema

**File**: `lib/db/schema/projects.ts`

The schema exports a `projects` table definition using Drizzle's `pgTable`. Fields map directly to the column definitions above. The `key` column is declared `varchar(6).notNull().unique()`. The `end_date` column is declared `.references` to nothing (it is a date, not a FK) and is nullable. `created_by` references `users.id` with `onDelete: 'restrict'`.

The schema index (`lib/db/schema/index.ts`) exports `* from './projects'` and `* from './project-members'` alongside existing exports.

**File**: `lib/db/schema/project-members.ts`

The schema exports a `projectMembers` table definition using Drizzle's `pgTable`. `project_id` is declared `.references(() => projects.id, { onDelete: 'cascade' })`. `user_id` is declared `.references(() => users.id, { onDelete: 'restrict' })`. The composite primary key is declared via `primaryKey({ columns: [projectMembers.projectId, projectMembers.userId] })`.

## Environment Inputs

No new environment variables are required for this feature. The existing `DATABASE_URL` and `DATABASE_URL_TEST` cover the new table.
