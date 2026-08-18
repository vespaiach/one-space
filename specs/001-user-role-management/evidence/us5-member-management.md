# US5 Member Management Evidence

**Status**: Local automated and rendered-browser checks passed; full HTTPS multi-session timing remains pending.

PostgreSQL suites passed suspend/reinstate/forced-reset transitions, credential revocation, retained password state, Admin-target rejection, login timing-safe failure behavior, lockout threshold/exact unlock, suspended precedence, fixed sessions, restricted reset completion, and absence of any account-deletion mutation. Component tests passed eligible controls, explicit suspended/locked messages, and confirmation focus/return.

In the local browser, the Admin completed suspend and reinstate in two activations each. The committed status and success announcement were visible on the next render; suspended state removed Edit and promotion while retaining the profile. Logout rejected the prior session path, and invalid login moved focus to the generic error output.

The browser exercise used one local process. It does not prove live HTTPS cookies, distributed concurrency, or the two-minute forced-reset completion target.
