# Quickstart Validation Guide: Create Project

**Feature**: `007-create-project` | **Phase**: 1 | **Date**: 2026-08-18

This guide describes runnable validation scenarios that prove the feature works end-to-end. It is not an implementation guide — see [data-model.md](data-model.md), [contracts/pages.md](contracts/pages.md), and [contracts/server-actions.md](contracts/server-actions.md) for implementation details.

## Prerequisites

- Docker Compose stack running (`npm run dev` or `docker compose up`).
- At least one admin account exists (seeded by the 001 bootstrap).
- An isolated test database is available at `DATABASE_URL_TEST`.
- Migrations applied to both databases (`npm run db:migrate`).

## Scenario 1 — Admin Creates a Project with Required Fields (FR-001, FR-002, FR-004, FR-008, FR-009, SC-001, SC-004)

**Setup**: Log in as admin.

**Steps**:
1. Navigate to `/projects/new`.
2. Enter `"Marketing Campaign"` in the Name field; tab away.
3. Verify the Key field auto-populates with `"MC"`.
4. Enter a markdown description: `"**Goal**: Launch Q3 campaign."`.
5. Select the `amber` color swatch.
6. Enter start date `2026-09-01`.
7. Submit.

**Expected**:
- Redirected to `/projects`.
- The "Marketing Campaign" project appears in the list.
- The transition from submission to list appearance takes under 2 seconds (SC-004).
- The full flow from opening the form to viewing the created project takes under 90 seconds (SC-001).

## Scenario 2 — Required Field Validation Errors (FR-004, FR-009, SC-003)

**Setup**: Log in as admin. Navigate to `/projects/new`.

**Steps**: Submit the form without filling any field.

**Expected**:
- Submission is blocked.
- Inline error messages appear for each of: name, key, description, color, start date.
- Errors are surfaced before the request reaches the server (SC-003 — client validation fires first) or immediately on the server response with no page reload.
- Focus moves to the validation summary or the first error field.

## Scenario 3 — Duplicate Key Error (FR-005)

**Setup**: A project with key `"MC"` already exists. Log in as admin. Navigate to `/projects/new`.

**Steps**:
1. Enter name `"Mobile Core"`.
2. Verify the Key field auto-populates with `"MC"` (no client-side uniqueness check — the form does not know `"MC"` is taken).
3. Fill all other required fields without changing the key.
4. Submit.

**Expected**:
- Submission is blocked with a field error on Key: "This key is already in use. Choose a different one."
- No project row is inserted.
- The admin clears the key field, types a different value (e.g., `"MCR"`), and resubmits — the project is created successfully.

## Scenario 4 — Admin Creates a Project with an End Date (FR-003, FR-007)

**Setup**: Log in as admin. Navigate to `/projects/new`.

**Steps**:
1. Fill all required fields (name, key, description, color, start date `2026-09-01`).
2. Enter end date `2026-12-31`.
3. Submit.

**Expected**: Project created with both dates stored and accessible.

**Also verify** (invalid date order):
1. Set start date to `2026-09-01` and end date to `2026-08-31`.
2. Submit.
3. Field error for end date: "End date must be after the start date."
4. No project row inserted.

## Scenario 5 — Non-Admin Cannot Access or Create (FR-001, User Story 3)

**Setup**: Log in as a non-admin (Member) user.

**Steps**:
1. Navigate directly to `/projects/new`.

**Expected**: Access is denied — user is redirected to login or sees a 403 response. No creation form is rendered.

**Also verify** (direct action call):
- A crafted POST to the `createProject` action with a non-admin session token returns a rejected result. No project row is inserted.

## Scenario 6 — Key Auto-Generation Edge Cases (FR-010, Clarifications Q1–Q3)

| Input name | Expected auto-key | Reason |
|---|---|---|
| `"Marketing"` (single word) | `"MA"` | Single word → pad from first word's chars |
| `"Marketing Campaign"` | `"MC"` | First letter of each word |
| `"One Space Platform App"` | `"OSPA"` | Four words → four letters |
| `"One Space Platform Application System"` | `"OSPAS"` wait, 6 chars → `"OSPAS"` | 5 words, capped at 6 → take first 5 letters (result is 5 < 6, all included) |
| `"A1 B2 C3 D4 E5 F6 G7"` | `"A1B2C3"` | 7 words, truncate to 6 chars |
| `"!!!"` (no letters/digits) | `"PROJ"` | Fallback for empty result |

**Steps**: Load the creation form, enter each name, tab away, and verify the key field value matches the expected key.

## Scenario 7 — Key Manual Edit Freeze (FR-010, Clarification Q3)

**Setup**: Log in as admin. Navigate to `/projects/new`.

**Steps**:
1. Type `"Marketing"` in the name field; tab away. Key auto-fills to `"MA"`.
2. Manually clear the key field and type `"MKTG"`.
3. Return to the name field and change it to `"Mobile Core"`; tab away.

**Expected**: The key field remains `"MKTG"` — the manual edit is preserved. The auto-generation does not overwrite a user-modified key.

## Scenario 8 — Admin Adds Members During Project Creation (FR-011, FR-012, SC-006, User Story 3)

**Setup**:
- Log in as admin.
- Ensure at least two other registered users exist (one member-role, one admin-role).

**Steps**:
1. Navigate to `/projects/new`.
2. Fill all required fields (name `"Alpha Team"`, key `"AT"`, description, color, start date).
3. In the Members picker, type the first few letters of another user's name.
4. Verify matching users appear as selectable options (both member-role and admin-role users shown; the creating admin is absent from results).
5. Select two users.
6. Verify selected users appear as dismissible chips.
7. Remove one chip.
8. Submit.

**Expected**:
- Project `"Alpha Team"` is created and appears in the project list.
- The one remaining selected user appears as a member of the project.
- The removed user is NOT a member of the project.
- The creating admin is NOT listed as a selectable option in the picker (SC-006: zero members added beyond selection).

**Also verify** (no members selected):
1. Submit the creation form without selecting any members.
2. Project is created with an empty member list.

**Also verify** (non-admin bypass attempt — FR-012):
1. Craft a POST to `createProject` with a non-admin session token and a `memberIds[]` entry.
2. The action rejects with an unauthorized result. No project row or membership row is inserted.

## Integration Test Commands

```bash
# Unit tests (key generator + validation)
npm test -- tests/unit/projects/

# Integration tests (createProject action against test DB)
DATABASE_URL=$DATABASE_URL_TEST npm test -- tests/integration/projects/
```

## Links

- [spec.md](spec.md) — feature requirements and acceptance scenarios
- [data-model.md](data-model.md) — `projects` table schema and validation rules
- [contracts/pages.md](contracts/pages.md) — creation page behavior
- [contracts/server-actions.md](contracts/server-actions.md) — `createProject` action contract
