# Dependency Governance: Create Issue

**Feature**: `009-create-issue` | **Date**: 2026-08-20

This file records third-party dependency decisions for this feature. Approvals are durable and survive plan rewrites.

## Reused Approvals

| Package | Version constraint | Purpose | Original approval | Reuse scope for this feature |
|---|---|---|---|---|
| `marked` | `^15.0.0` or latest stable | Convert stored issue-description markdown to safe HTML | Approved by project owner (nta.toan@gmail.com), 2026-08-18, recorded in `specs/007-create-project/governance.md` (scoped there to the project detail view) | Reused here for issue-description rendering — same capability, same package, no new install approval required. Configured with a custom `marked.Renderer` restricted to FR-004's five elements (bold, italics, links, lists, headings); every other node type renders as plain escaped text. `DOMPurify` is deliberately not added — the restrictive renderer satisfies FR-005 without a second dependency, consistent with the "renderer hooks" alternative the original governance record already permits. |

`marked` is not yet present in `package.json` as of this plan; this feature is the first to actually add it as a dependency, exercising the 2026-08-18 approval rather than requesting a new one.

## Pending / Rejected

- `DOMPurify` — not added. See Reused Approvals above for rationale.

## No New Dependencies Requested

No other third-party package is introduced by this feature.
