<!--
Sync Impact Report
==================
Version change: 1.1.0 → 1.2.0
Added sections: None
Modified sections:
  - Technology Stack: StyleX added as the mandatory styling solution
Removed sections: None
Deferred TODOs: None
-->

# one-space Constitution

## Core Principles

### I. Modular Component Design

Files and components MUST be scoped to a single responsibility. Large, monolithic files MUST
be split into focused modules. Reusability and clarity take precedence over co-location
convenience.

### II. Input Validation & Security

All user-supplied input MUST be strictly validated and sanitized before it is processed or
persisted. Validation failures MUST be rejected at the boundary; sanitized values MUST NOT
be trusted until re-validated after any transformation.

### III. Simplicity Over Cleverness

Implementation MUST prefer straightforward, readable solutions over clever abstractions.
When two approaches solve the same problem, the one easier to reason about MUST be chosen.
Complexity requires explicit justification.

### IV. Dependency Minimization

Built-in language or framework features MUST be preferred over third-party libraries.
Installing a new third-party dependency MUST NOT occur without explicit team approval.
Approval requests MUST name the dependency, its purpose, and why a built-in alternative
is insufficient.

### V. Test-Driven Development (TDD)

All production code MUST be written using the Red-Green-Refactor cycle: write a failing
test first, write the minimal code to make it pass, then refactor for quality. No
production code may be written without a corresponding failing test written beforehand.

### VI. Code Self-Documentation & Zero Inline Comments

Code MUST communicate intent entirely through clear structure and intention-revealing
naming. Inline comments, block comments, and in-body explanations are prohibited. If a
comment feels necessary, the code MUST be restructured until the comment is not.

### VII. Strict Code Cleanliness & Dead Code Elimination

Dead code is prohibited. Unused imports, variables, functions, and unreachable code paths
MUST be removed before any commit. All code MUST pass configured linting and formatting
rules before being pushed.

## Technology Stack

This project MUST use the following technology stack. Deviations require explicit governance
approval and a constitution amendment before any alternative is introduced.

- **Framework**: Next.js (latest stable version) with the App Router. Pages Router is prohibited.
- **Language**: TypeScript in strict mode. All code MUST be fully typed; `any` is prohibited
  without a documented, team-approved exception committed alongside the usage.
- **Linting & Formatting**: Biome. All code MUST pass `biome check` before commit. ESLint and
  Prettier MUST NOT be introduced; Biome is the sole linter and formatter.
- **React Compiler**: Enabled. Manual `useMemo`, `useCallback`, and `React.memo` optimizations
  are prohibited unless the React Compiler explicitly cannot handle the case and a performance
  measurement justifies the exception.
- **Styling**: StyleX (stylexjs.com). All styles MUST be written with StyleX. CSS Modules,
  Tailwind, inline styles, and other CSS-in-JS libraries are prohibited. StyleX's atomic,
  compile-time approach is the sole styling mechanism.
- **Database**: PostgreSQL. No other relational or document database may be introduced without
  a constitution amendment.

## Quality Gates

Every contribution MUST satisfy the following gates before merging:

- All tests pass (unit and integration where applicable).
- `biome check` exits with code 0; no violations suppressed without documented justification.
- No unused imports, variables, or dead code paths present.
- Any new third-party dependency has documented, explicit approval.
- No inline or block comments present in application source files.
- All TypeScript types are explicit; `any` is prohibited per the Technology Stack section.

## Governance

This constitution supersedes all other documented practices and informal conventions.
Any amendment requires:

1. A written rationale explaining the change and its impact.
2. A version bump following semantic versioning:
   - **MAJOR**: backward-incompatible removal or redefinition of a MUST principle.
   - **MINOR**: new principle or section added, or materially expanded guidance.
   - **PATCH**: clarifications, wording fixes, or non-semantic refinements.
3. The `LAST_AMENDED_DATE` updated to the date of ratification.

All code reviews MUST verify compliance with this constitution. Violations of any MUST
principle are blocking and MUST be resolved before merge.

**Version**: 1.2.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-08-16
