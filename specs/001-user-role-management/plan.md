# Implementation Plan: User Role and Account Management

**Branch**: `001-user-role-management` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-user-role-management/spec.md`

## Summary

Invitation-only user registration with two roles (Admin, Member), self-service password reset, full profile management, and Admin account governance — all secured by opaque DB-backed sessions with configurable expiry and optional Remember Me extension. Session tokens are random, stored in PostgreSQL, and revocable on demand. Invitation and password-reset links carry an AES-256-GCM encrypted payload (email + expiry) with DB records tracking status for revocation and duplicate prevention.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js (latest stable, App Router); `pg` + `@types/pg` (PostgreSQL client); `nodemailer` (SMTP email)

**Storage**: PostgreSQL — four tables: `users`, `sessions`, `invitations`, `password_reset_tokens`

**Testing**: Jest configured via `next/jest` transformer; `jest-environment-node` for lib modules; `jest-environment-jsdom` for React components; real PostgreSQL database for integration tests (no DB mocking)

**Target Platform**: Linux server (single-instance deployment, no HA)

**Project Type**: Web application — Next.js full-stack (pages + server actions; no separate API service)

**Performance Goals**: Profile views load within 2 seconds (SC-004); full registration flow under 3 minutes (SC-001)

**Constraints**: Single server; ~20 users; no Redis or external cache; no horizontal scaling

**Scale/Scope**: Single team (~20 users), single workspace, small workload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Modular Component Design | PASS | Auth, session, invitation, password-reset, profile each in separate modules under `src/lib/` |
| II. Input Validation & Security | PASS | All inputs validated at the server action/route boundary; passwords hashed with `crypto.scrypt`; tokens use AES-256-GCM |
| III. Simplicity Over Cleverness | PASS | Opaque token over JWT; built-in `crypto` over third-party auth libraries; no abstraction layers beyond what the domain requires |
| IV. Dependency Minimization | CONDITIONAL PASS | Two new packages required — see table below |
| V. TDD | PASS | All production code must have a failing test written first |
| VI. Zero Inline Comments | PASS | No inline comments; intention-revealing naming throughout |
| VII. Dead Code Elimination | PASS | All unused imports/exports removed before commit |

**New dependencies requiring team approval (Constitution IV)**:

| Package | Purpose | Built-in Alternative | Why Insufficient |
|---------|---------|---------------------|-----------------|
| `pg`, `@types/pg` | PostgreSQL client (connection pool, parameterized queries) | `fetch` (no DB driver exists as built-in) | Node.js has no built-in relational DB driver |
| `nodemailer` | SMTP email delivery | None in Node.js standard library | Node.js has no built-in email capability; spec requires email for invitations and password reset |

**Post-design re-check**: Both packages approved as unavoidable. No other packages introduced. Gate: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-role-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/
    ├── pages.md         # UI page routes and their access rules
    ├── server-actions.md # Server action signatures and behavior contracts
    └── middleware.md    # Auth middleware route rules
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                         # Public routes — no session required
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx                # Invitation registration (token in URL)
│   │   └── reset-password/
│   │       └── page.tsx                # Password reset (token in URL)
│   ├── (shell)/                        # Protected routes — session required
│   │   ├── users/
│   │   │   ├── page.tsx                # User directory (all logged-in users)
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Full profile view
│   │   │       └── edit/
│   │   │           └── page.tsx        # Profile edit
│   │   └── admin/
│   │       └── invitations/
│   │           └── page.tsx            # Send invitation (Admin only)
│   └── actions/
│       ├── auth.ts                     # login, logout, register server actions
│       ├── invitations.ts              # sendInvitation server action
│       ├── password.ts                 # requestPasswordReset, completePasswordReset
│       └── users.ts                    # updateProfile, suspendUser, deleteUser, promoteUser, forcePasswordReset
├── lib/
│   ├── auth/
│   │   ├── session.ts                  # createSession, getSession, revokeSession
│   │   ├── password.ts                 # hashPassword, verifyPassword (scrypt)
│   │   └── guards.ts                   # requireSession, requireAdmin
│   ├── crypto/
│   │   └── token.ts                    # encryptToken, decryptToken, hashToken (AES-256-GCM + SHA-256)
│   ├── db/
│   │   ├── client.ts                   # pg Pool singleton
│   │   ├── users.ts                    # User table queries
│   │   ├── sessions.ts                 # Session table queries
│   │   ├── invitations.ts              # Invitation table queries
│   │   └── password-reset.ts           # Password reset token queries
│   ├── email/
│   │   └── sender.ts                   # Nodemailer SMTP wrapper (sendInvitationEmail, sendPasswordResetEmail)
│   └── validation/
│       ├── password.ts                 # validatePasswordComplexity
│       └── profile.ts                  # validateProfileFields
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ResetPasswordForm.tsx
│   └── users/
│       ├── UserDirectory.tsx
│       ├── UserProfileView.tsx
│       └── ProfileEditForm.tsx
└── middleware.ts                       # Session validation; route protection

tests/
├── unit/
│   ├── lib/
│   │   ├── auth/
│   │   ├── crypto/
│   │   ├── db/
│   │   └── validation/
│   └── components/
└── integration/
    ├── auth/                           # Login, registration, password reset end-to-end
    └── users/                          # Profile CRUD, suspend, promote, delete
```

**Structure Decision**: Single Next.js project (no separate API service). Server Actions handle all mutations (login, registration, profile edits, invitations). Middleware enforces auth at the route level. Avatar uploads use a Route Handler (not a Server Action) because `FormData` file parsing in Next.js Server Actions has size limits that a Route Handler handles more reliably. All other mutations use Server Actions.

## Complexity Tracking

No constitution violations requiring justification. `pg` and `nodemailer` are the minimum viable external packages for PostgreSQL access and email delivery — no built-in alternative exists for either.
