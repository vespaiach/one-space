# Dependency Governance: Create Project

**Feature**: `007-create-project` | **Date**: 2026-08-18

This file records all third-party dependency approvals for this feature. Approvals are durable and survive plan rewrites.

## Approved Dependencies

| Package | Version constraint | Purpose | Approved by | Date | Scope |
|---|---|---|---|---|---|
| `marked` | `^15.0.0` or latest stable | Convert stored markdown description text to safe HTML for the project detail view (AC 4, FR-006) | Project owner (nta.toan@gmail.com) | 2026-08-18 | Rendering path only; must be paired with HTML sanitization before `dangerouslySetInnerHTML` |

## Sanitization Requirement

`marked`'s HTML output **must** be sanitized before passing to `dangerouslySetInnerHTML`. Acceptable approaches:

1. Configure `marked` with `{ mangle: false, headerIds: false }` and pass output through `DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] })`.
2. Use `marked`'s built-in renderer hooks to strip disallowed elements at parse time.

Permitted HTML elements (matching FR-006's supported markdown): `<strong>`, `<em>`, `<h1>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<li>`, `<a href>` (safe URLs only), `<code>`, `<pre>`, `<p>`, `<br>`.

## Pending / Rejected

None.
