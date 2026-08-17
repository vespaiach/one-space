# Implementation Plan: User Role and Account Management

**Branch**: `001-user-role-management` | **Date**: 2026-08-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-user-role-management/spec.md`

## Summary

Invitation-only user registration with two roles (Admin, Member), self-service password reset, full profile management, and Admin account governance — all secured by opaque DB-backed sessions with configurable expiry and optional Remember Me extension. Session tokens are random, stored in PostgreSQL, and revocable on demand. Invitation links are stateless: an AES-256-GCM encrypted token (email + expiry) is embedded in the registration URL and validated at registration time against expiry and email availability — no server-side invitation record is stored. Password-reset links follow the same token pattern but are DB-backed for single-use enforcement.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 16.x (App Router); `drizzle-orm` + `postgres` (ORM + PostgreSQL client, already installed); `nodemailer` (SMTP email, new dependency requiring approval)

**Storage**: PostgreSQL — three tables: `users`, `sessions`, `password_reset_tokens`; schema defined in TypeScript via Drizzle ORM; migrations managed by `drizzle-kit`. No `invitations` table — invitation links are stateless tokens.

**Testing**: Vitest with `@vitejs/plugin-react`; `jsdom` environment for React component tests; `node` environment for lib modules; real PostgreSQL database for integration tests (no DB mocking)

**Target Platform**: Linux server (single-instance deployment, no HA)

**Project Type**: Web application — Next.js full-stack (pages + server actions; no separate API service)

**Performance Goals**: Profile views load within 2 seconds (SC-004); full registration flow under 3 minutes (SC-001)

**Constraints**: Single server; ~20 users; no Redis or external cache; no horizontal scaling

**Scale/Scope**: Single team (~20 users), single workspace, small workload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Modular Component Design | PASS | Auth, session, invitation, password-reset, profile each in separate modules under `lib/` |
| II. Input Validation & Security | PASS | All inputs validated at the server action/route boundary; passwords hashed with `crypto.scrypt`; tokens use AES-256-GCM |
| III. Simplicity Over Cleverness | PASS | Opaque token over JWT; built-in `crypto` over third-party auth libraries; no abstraction layers beyond what the domain requires |
| IV. Dependency Minimization | CONDITIONAL PASS | One new package required — see table below; `drizzle-orm` + `postgres` already installed |
| V. TDD | PASS | All production code must have a failing test written first |
| VI. Zero Inline Comments | PASS | No inline comments; intention-revealing naming throughout |
| VII. Dead Code Elimination | PASS | All unused imports/exports removed before commit |

**New dependencies requiring team approval (Constitution IV)**:

| Package | Purpose | Built-in Alternative | Why Insufficient |
|---------|---------|---------------------|-----------------|
| `nodemailer` | SMTP email delivery | None in Node.js standard library | Node.js has no built-in email capability; spec requires email for invitations and password reset |

**Already-installed packages** (no new approval required):

| Package | Purpose |
|---------|---------|
| `drizzle-orm` | ORM for PostgreSQL with TypeScript schema definitions and type-safe queries |
| `postgres` | PostgreSQL driver used by Drizzle ORM (replaces raw `pg`) |

**Post-design re-check**: `drizzle-orm` + `postgres` already installed and in use. `nodemailer` approved as unavoidable. No other packages introduced. Gate: PASS.

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
    └── proxy.md         # Proxy route rules (renamed from middleware in Next.js 16)
```

### Source Code (repository root)

```text
app/
├── (auth)/                             # Public routes — no session required
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx                    # Invitation registration (token in URL)
│   └── reset-password/
│       └── page.tsx                    # Password reset (token in URL)
├── (shell)/                            # Protected routes — session required
│   ├── change-password/
│   │   └── page.tsx                    # Forced reset interstitial
│   ├── users/
│   │   ├── page.tsx                    # User directory (all logged-in users)
│   │   └── [id]/
│   │       ├── page.tsx                # Full profile view
│   │       └── edit/
│   │           └── page.tsx            # Profile edit
│   └── admin/
│       └── invitations/
│           └── page.tsx                # Send invitation (Admin only)
├── actions/
│   ├── auth.ts                         # login, logout, register server actions
│   ├── invitations.ts                  # sendInvitation server action
│   ├── password.ts                     # requestPasswordReset, completePasswordReset
│   └── users.ts                        # updateProfile, suspendUser, deleteUser, promoteUser, forcePasswordReset
└── api/
    └── avatar/
        └── route.ts                    # Avatar upload/delete Route Handler

lib/
├── auth/
│   ├── session.ts                      # createSession, getSession, revokeSession
│   ├── password.ts                     # hashPassword, verifyPassword (scrypt)
│   └── guards.ts                       # requireSession, requireAdmin
├── crypto/
│   └── token.ts                        # encryptToken, decryptToken, hashToken (AES-256-GCM + SHA-256)
├── db/
│   ├── index.ts                        # Drizzle client + globalThis singleton (already exists)
│   ├── schema/
│   │   ├── index.ts                    # Re-exports all schema tables
│   │   ├── users.ts                    # users table Drizzle schema
│   │   ├── sessions.ts                 # sessions table Drizzle schema
│   │   └── passwordResetTokens.ts      # password_reset_tokens table Drizzle schema
│   └── queries/
│       ├── users.ts                    # User table queries (Drizzle)
│       ├── sessions.ts                 # Session table queries (Drizzle)
│       └── passwordReset.ts            # Password reset token queries (Drizzle)
├── email/
│   └── sender.ts                       # Nodemailer SMTP wrapper (sendInvitationEmail, sendPasswordResetEmail)
└── validation/
    ├── password.ts                     # validatePasswordComplexity
    └── profile.ts                      # validateProfileFields

components/
├── auth/
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ResetPasswordForm.tsx
└── users/
    ├── UserDirectory.tsx
    ├── UserProfileView.tsx
    └── ProfileEditForm.tsx

proxy.ts                                # Cookie check; route protection (Node.js runtime in Next.js 16)

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

**Structure Decision**: Single Next.js project (no separate API service). Server Actions handle all mutations (login, registration, profile edits, invitations). Middleware enforces auth at the route level. Avatar uploads use a Route Handler (not a Server Action) because `FormData` file parsing in Next.js Server Actions has size limits that a Route Handler handles more reliably. All other mutations use Server Actions. Drizzle ORM replaces raw `pg` — all DB access goes through `lib/db/index.ts` (Drizzle client) and typed query functions in `lib/db/queries/`.

## Complexity Tracking

No constitution violations requiring justification. `pg` and `nodemailer` are the minimum viable external packages for PostgreSQL access and email delivery — no built-in alternative exists for either.
