# Profile Performance Evidence

**Status**: Harness implemented; SC-004 not executed.

`tests/performance/profile-navigation.mjs` launches headless Chrome through CDP, requires 20 unique profile URLs and 10 authenticated session tokens, excludes and records one cold navigation, runs 100 profile navigations at concurrency 10, waits for text plus avatar/default readiness, reports p95 and count under two seconds, and fails below 95 passing samples.

This environment did not have a production-equivalent deployment, 20 stable fixture users, or 10 independent authenticated sessions. No SC-004 timing result is claimed.
