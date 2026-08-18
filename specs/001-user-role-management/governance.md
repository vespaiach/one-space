# Governance Decisions: User Role and Account Management

**Feature**: `001-user-role-management`
**Decision date**: 2026-08-18
**Decision authority**: Feature owner

## GOV-001 — Nodemailer approval

**Status**: Approved

The feature may add `nodemailer` for SMTP delivery of invitation and password-reset emails.

- **Purpose**: Submit transactional email through the deployment's existing SMTP service.
- **Built-in alternative**: None. Node.js does not provide an SMTP email client.
- **Scope limit**: This approval covers Nodemailer only; any additional email package or hosted provider SDK requires separate approval under Constitution Principle IV.
- **Reason**: Invitation registration and self-service password reset require email delivery, and SMTP avoids coupling the application to a provider-specific SDK.

## GOV-002 — Suspension-only account lifecycle

**Status**: Approved

Permanent account deletion is not part of this feature. The application must not expose or execute account deletion for any role. Admins may suspend and reinstate Member accounts; suspended accounts retain their canonical email and profile data for possible reinstatement.

Because accounts are not deleted, no deleted-account legal-retention exception or restoration reconciliation policy is required. Coordinated encrypted database and avatar backups are retained for 30 days under FR-062.

## GOV-003 — Sharp approval request

**Status**: Pending feature-owner approval

The plan proposes adding `sharp` as a direct dependency to implement FR-061 image decoding, dimension and animation checks, metadata removal, aspect-preserving resize, and JPEG/PNG re-encoding.

- **Purpose**: Reconstruct untrusted avatar bytes into a bounded, non-animated output before persistence.
- **Built-in alternative**: None. Node.js does not provide JPEG/PNG decoding or encoding.
- **Why Next.js is insufficient**: Next.js currently installs `sharp` transitively for its own image pipeline, but a transitive dependency is not a stable application import contract and cannot replace a declared, reviewed dependency.
- **Scope limit**: Use is isolated to `lib/avatar/processor.ts`; no image editing features are approved.

Implementation MUST NOT add or import `sharp` until this decision is explicitly changed to Approved.

## GOV-004 — axe-core approval request

**Status**: Pending feature-owner approval

The plan proposes adding `axe-core` as a development dependency for SC-016 automated accessibility checks.

- **Purpose**: Scan rendered authentication, profile, Admin, and forced-reset UI and report WCAG findings with impact severity.
- **Built-in alternative**: Testing Library and jsdom provide DOM behavior but no WCAG rules engine or critical/serious finding classification.
- **Scope limit**: Test-only use under `tests/accessibility/`; manual keyboard, screen-reader, focus, zoom, and error-identification checks remain required.

Implementation MUST NOT add `axe-core` until this decision is explicitly changed to Approved.

## GOV-005 — Nodemailer TypeScript declarations approval request

**Status**: Pending feature-owner approval

The approved Nodemailer package does not publish bundled TypeScript declarations. The plan proposes adding `@types/nodemailer` as a development dependency so the SMTP adapter remains fully typed under the constitution's strict TypeScript and no-`any` requirements.

- **Purpose**: Compile-time types for the already-approved Nodemailer runtime API.
- **Built-in alternative**: None. TypeScript and Node.js do not provide Nodemailer declarations.
- **Rejected workaround**: A handwritten partial ambient module would duplicate a third-party API, drift independently, and weaken review of SMTP options/results.
- **Scope limit**: Development/compilation only; it adds no runtime email implementation or provider SDK.

Implementation MUST NOT add `@types/nodemailer` until this decision is explicitly changed to Approved.
