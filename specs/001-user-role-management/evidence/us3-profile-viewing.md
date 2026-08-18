# US3 Profile Viewing Evidence

**Status**: Local automated and rendered-browser checks passed; production caching and HTTPS checks remain pending.

The isolated PostgreSQL read-model suite passed deterministic directory/detail reads, suspended-account retention, absent optional fields, and unknown IDs. Component tests passed exact directory/profile disclosure, default-avatar rendering, optional-field omission, and referenced-file fallback.

In the local in-app browser, an authenticated Admin opened the directory and a Member profile. The pages displayed names, role, status, default avatar, and only populated optional fields. The unauthenticated avatar boundary returned `401`; unit coverage verifies a detail-free body and `Cache-Control: private, no-store`.

This does not claim a live HTTPS reverse-proxy or shared-cache exercise.
