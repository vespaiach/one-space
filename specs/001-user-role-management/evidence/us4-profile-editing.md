# US4 Profile Editing Evidence

**Status**: Local PostgreSQL, component, and rendered-browser checks passed.

Three integration tests passed normalization, self/Admin-target authorization, immutable role, atomic invalid-input rejection, bounded audit data, and next-read state. Component coverage passed read-only role plus Save/Cancel rendering.

In the local browser, an Admin edited an active Member. The committed profile immediately displayed `+1 317 555 0100` and the normalized Slack handle `@member.example`. The role remained read-only. A later browser check confirmed suspended Members no longer expose the Edit link, while the action independently reauthorizes current state.

Field-specific text validation focus remains part of the open manual accessibility matrix; avatar-specific linked errors are covered under US8.
