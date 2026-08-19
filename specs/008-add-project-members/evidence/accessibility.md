# Add Project Members Accessibility Review

**Task**: T043
**Date**: 2026-08-19
**Tester**: Codex
**Browser**: Codex in-app browser, Chromium-based
**Application**: local Next.js 16.3.1 development server over self-signed HTTPS
**Viewports**: default browser viewport and 320 × 640 CSS pixels
**Assistive technology**: browser semantic DOM/accessibility snapshot plus axe-core 4.13.0; no physical screen reader session

## Obtained findings

- The membership page exposed logical level-one and level-two headings, named `Current members` and `Add a member` regions, a persistent native-select label, disabled text reasons, and polite/assertive live status semantics.
- The active and archived Project pages exposed the correct status context. The archived page stated that new members receive read-only access.
- A committed add refreshed the roster, reset the select, exposed the unread Notification, and announced success.
- Live review found that committed success originally left focus on the document body after disabling the submit button. The form now intentionally focuses the polite success output; re-test observed `OUTPUT`, `aria-live="polite"`, the exact success text, and an empty reset select.
- Live 320 × 640 review found a native-select intrinsic-width overflow. Investigation found that the PostCSS extractor omitted `styles/**/*.stylex.ts`, leaving all token variables undefined. The extractor now includes `styles/**`, and the select uses the shared zero-min-width token. Re-test measured `scrollWidth=310` at `innerWidth=320`, no horizontal overflow, and both select and submit control inside the viewport.
- The archived 320 × 640 state also had no horizontal overflow, retained its label, and rendered the suspended reason as text.
- A live stale-eligibility submission produced an assertive error without horizontal overflow.
- Automated axe and structural coverage passed for initial, pending, success, validation, duplicate, suspended, unexpected, archived, and no-eligible states. Color contrast remains outside jsdom axe capability and was disabled in that automated run.

## Not obtained

- The in-app browser automation surface did not advance the native select/button focus or activate form submission through synthetic Tab/Enter keypresses. Native semantics and automated focus assertions passed, but an end-to-end physical-keyboard session was not obtained.
- Browser zoom shortcuts did not change the in-app browser's zoom level. A 320 CSS-pixel reflow check covers the effective layout width of a 640-pixel viewport at 200%, but this is not evidence of a real 200% browser-zoom session.
- No physical screen reader was available. Semantic accessibility snapshots and live-region attributes are not a substitute for VoiceOver, NVDA, or JAWS output.

## Gate status

T043 remains open because the required physical-keyboard, actual 200%-zoom, and named assistive-technology observations were not all obtained. No unavailable evidence is represented as a pass.
