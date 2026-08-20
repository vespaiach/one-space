# Implementation Plan: Create Project

**Branch**: `007-create-project` | **Date**: 2026-08-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-create-project/spec.md`

## Summary

Implement an admin-only project creation flow with a validated form collecting five required fields (key/id, name, description, color, start date), one optional field (end date), and an optional multi-select member picker. The project key auto-generates from the name on first name-field blur using a first-letters algorithm with single-word character padding; it is fully editable before save and immutable after. The member picker is pre-loaded at Server Component render time (all users except the creating admin) and filtered client-side; selected user IDs are submitted and persisted atomically in a database transaction alongside the project insert. Markdown rendering of the stored description requires an approved third-party library (`marked`); all other capabilities reuse existing stack primitives.

## Technical Context

**Language/Version**: TypeScript 5.x strict mode; React 19.2; Next.js 16.3 App Router; Node.js 20

**Primary Dependencies**:
- Existing: `next`, `react`, `drizzle-orm`, `postgres`, `@stylexjs/stylex`, `vitest`, `@testing-library/react`, `@biomejs/biome`
- Approval required before implementation: `marked` for markdown-to-safe-HTML conversion for the description field display ([Dependency Gate](#dependency-gate))

**Storage**: New PostgreSQL `projects` table and `project_members` junction table added via Drizzle ORM; both exported from schema index. The `createProject` action uses a Drizzle transaction to insert both tables atomically.

**Testing**: Vitest unit tests for key-generator utility and validation helpers; real isolated PostgreSQL integration tests for the `createProject` action (including member insertion and transaction rollback scenarios); Testing Library component tests for form interactivity (key blur trigger, manual-edit freeze, member picker search, chip dismissal)

**Target Platform**: Existing Linux Docker Compose stack (Traefik + Next.js container + PostgreSQL)

**Project Type**: Full-stack Next.js web application (Server Components, Server Actions); no new Route Handlers

**Performance Goals**: SC-001 — admin completes creation in under 90 seconds; SC-004 — created project appears in list within 2 seconds of successful submission

**Constraints**: No new dependencies without governance approval; `marked` approved 2026-08-18 (must be paired with HTML sanitization); key is immutable after save; color is restricted to the 12-color hardcoded `projectColors` token palette (red, coral, orange, amber, yellow, lime, green, teal, sky, blue, purple, pink)

**Scale/Scope**: Single instance, ~20 users, low volume — identical to 001

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle / Gate | Pre-design | Design response |
|---|---|---|
| I. Component-Driven Architecture | PASS | Form, key input, color picker swatch, and date inputs are focused Client Components co-located with the creation page until reused elsewhere |
| II. Input Validation & Security | PASS | Server Action re-authenticates and re-authorizes current DB state, validates key format and uniqueness, compares dates, constrains color to the allowed token set, and rejects malformed input before insert |
| III. Simplicity Over Cleverness | PASS | Native HTML date inputs; key algorithm is pure string manipulation; no client state beyond form dirty-key tracking; no date library |
| IV. Dependency Minimization | **PASS** | `marked` approved by project owner (2026-08-18) for markdown-to-safe-HTML conversion of the description field; no other new dependencies required |
| V. Test-Driven Development | PASS | Every task must begin with a failing test mapped to its FR or AC identifier |
| VI. Zero Inline Comments | PASS | Intent communicated through structure and naming; no in-body explanations |
| VII. Strict Cleanliness | PASS | `npm run verify` and all tests must pass; no dead code or unused imports |
| Technology Stack | PASS | Next.js App Router, strict TypeScript, PostgreSQL, React Compiler, Biome, StyleX |
| StyleX token compliance | PASS | New `projectColors` vars added to `tokens.stylex.ts`; all component styles reference tokens |

### Dependency Gate

| Package | Purpose | Built-in alternative | Status |
|---|---|---|---|
| `marked` | Convert stored markdown description text to safe HTML for the project detail view (AC 4, FR-006); must be paired with an HTML sanitizer (e.g., `DOMPurify` or `marked`'s built-in sanitization options) | Node.js has no markdown parser; hand-rolling H1–H3, bold, italic, ordered/unordered lists, links, inline code, and fenced code blocks is non-trivial and fragile | **Approved 2026-08-18** |

**Pre-design gate result**: All design artifacts are fully specified. `marked` is approved. Implementation may proceed including the markdown rendering path.

## Phase 0: Research Outcome

[research.md](research.md) resolves:
- Admin auth guard reuse pattern from 001
- Key auto-generation algorithm and edge-case handling
- Project color palette token strategy
- Markdown rendering dependency decision
- Native date input approach

No `NEEDS CLARIFICATION` markers remain.

## Phase 1: Design Outcome

- [data-model.md](data-model.md) defines the `projects` table, `project_members` junction table, `projectColors` token extension, field validation rules, and uniqueness constraints.
- [contracts/pages.md](contracts/pages.md) defines the admin-only creation page: access guard, displayed controls (including member picker), member picker pre-load and client-side search behavior, key auto-generation behavior, and post-create redirect.
- [contracts/server-actions.md](contracts/server-actions.md) defines the `createProject` mutation boundary in full, including `memberIds` input, silent filtering rules, and transactional insert.
- [quickstart.md](quickstart.md) defines runnable validation scenarios for all user stories and SC-001–SC-006.

### Requirement-to-Design Traceability

| Requirement area | Normative IDs | Primary design artifacts |
|---|---|---|
| Admin-only access | FR-001, User Story 5 | pages contract (`requireAdmin` guard), server action (`requireAdmin` call) |
| Required fields + rejection | FR-002, FR-004, FR-009 | server action validation, data model NOT NULL constraints |
| Key format, uniqueness, immutability | FR-005, FR-010, Clarifications Q1–Q4 | key-generator utility, data model UNIQUE index, server action key validation |
| Markdown description input | FR-006, User Story 1 AC 4 | data model (text column), server action (length/content bounds), dependency gate (marked) |
| Color palette | FR-002 (color required) | `projectColors` tokens, color-picker component |
| Date validation | FR-003, FR-007, User Story 2 | server action date comparison, data model date columns |
| Immediate accessibility | FR-008, SC-004 | post-creation redirect to project list |
| Inline validation errors | FR-009, SC-003 | server action discriminated result, form error display per field |
| Member picker — pre-load + search | FR-011, User Story 3 AC 1 | pages contract (Server Component user query), `CreateProjectForm` (in-memory filter) |
| Member picker — atomic save | FR-011, SC-006 | server action transaction, `project_members` Drizzle schema |
| Member picker — access control | FR-012 | server action `requireAdmin()` call (same guard as overall action) |

## Project Structure

### Documentation

```text
specs/007-create-project/
├── plan.md              ← this file
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── pages.md
    └── server-actions.md
```

### Source Code

```text
app/
├── (shell)/
│   └── projects/
│       └── new/
│           └── page.tsx              # Admin-only creation page (Server Component; queries users for picker)
└── actions/
    └── projects.ts                   # createProject Server Action (transaction: projects + project_members)

components/
└── projects/
    └── create-project-form.tsx       # Client Component — form interactivity, member picker, key auto-gen

lib/
├── db/
│   └── schema/
│       ├── projects.ts               # Drizzle schema for projects table
│       └── project-members.ts        # Drizzle schema for project_members junction table
└── projects/
    └── key-generator.ts              # Pure key generation and conflict algorithm

styles/
└── tokens.stylex.ts                  # Extended with projectColors defineVars

tests/
├── unit/
│   └── projects/
│       ├── key-generator.test.ts
│       └── create-project-validation.test.ts
└── integration/
    └── projects/
        └── create-project.test.ts    # Includes member insertion and transaction rollback scenarios
```

**Structure Decision**: The Server Action owns the full mutation boundary (auth, validation, transactional insert of `projects` + `project_members`, cache invalidation, redirect). The page is a Server Component that calls `requireAdmin()` before rendering and queries all users (excluding the authenticated admin) to pass as props to `CreateProjectForm`. `CreateProjectForm` is a Client Component responsible for key auto-generation interactivity, color picker state, field dirty tracking, and member picker in-memory search and chip state. The key generator is extracted to a pure utility for independent testing.
