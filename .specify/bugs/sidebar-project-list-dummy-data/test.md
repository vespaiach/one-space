# Bug Verification: Sidebar project list uses hardcoded dummy data instead of the database

- **Slug**: sidebar-project-list-dummy-data
- **Tested**: 2026-08-21
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Static inspection confirms the hardcoded `PROJECTS` constant and its dummy project names are completely gone from `app/(shell)/layout.tsx`, replaced by a call to `listSidebarProjectsForUser(db, session.userId)`. All added and pre-existing automated tests pass fresh. The original reproduction steps from the assessment (log in, load a page under `(shell)`, visually inspect the rendered sidebar) were **not** executed end-to-end in a browser — the user opted for the lighter, non-mutating verification path — so per this skill's guardrails the result is recorded as `partial` rather than `verified`, even though every check performed came back clean.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Live login + browser inspection of rendered sidebar | not-run | Skipped by user choice — would require seeding the dev database (`onespace_db`) and starting the dev server, which the user declined to mutate for this verification. |
| Static reproduction check | `rg "PROJECTS\|Website Redesign\|Mobile App v2\|Brand Refresh\|SEO Campaign\|Ops & Roadmap" app/(shell)/layout.tsx` | pass | Zero matches — the dummy constant and its fake project names no longer exist in the layout file. |
| Static wiring check | `rg "listSidebarProjectsForUser\|session.userId" app/(shell)/layout.tsx` | pass | Confirms the real, session-scoped query is what now feeds `<Shell projects={...}>`. |
| New / updated tests | `DATABASE_URL_TEST=... vitest run tests/integration/projects/sidebar-project-list.test.ts` | pass | 3/3 new tests pass: membership scoping + color/issueCount, zero-issue count, historical/non-member exclusion. |
| Regression suite | `DATABASE_URL_TEST=... vitest run tests/integration/projects` | pass | 11 files / 58 tests pass, including `project-membership-access.test.ts` (the pre-existing membership-read contract this fix reused). |
| Lint | `npx biome check lib/db/queries/projects.ts "app/(shell)/layout.tsx"` | pass | No issues. |
| Type-check | `npx tsc --noEmit` | pass | No errors. |

## Output Excerpts

```
Test Files  11 passed (11)
     Tests  58 passed (58)
```

```
Checked 2 files in 3ms. No fixes applied.
```

## Residual Risks

- No live browser/session-level reproduction was performed, so the exact end-to-end rendering (real cookies, real Shell client-side hydration, real StyleX output) is unverified in this pass — the risk is judged low given the query is unit/integration-tested and the layout wiring is a one-line prop pass-through, but it is not zero.
- Confirmed in the assessment and unchanged here: the `project_members` vs `project_memberships` table split means members added at project-creation time still won't appear via this (correct) query — that's a pre-existing, separate bug, not introduced or fixed by this change.
- Whether archived projects should visually differ in the sidebar remains an open product question; current behavior includes them undecorated, consistent with `/projects`.

## Recommendation

Hold at "close, pending a quick manual smoke-check" rather than a full close: the code-level evidence (dummy data provably removed, correct membership-scoped query wired in and tested, full regression suite green, lint/type-check clean) is strong, but because the literal browser reproduction from the assessment was intentionally skipped, log in as a real member once in the actual app and confirm the sidebar shows their real projects before considering this fully closed.
