# Persisted Event Contract: Add Project Members

**Feature**: `008-add-project-members` | **Date**: 2026-08-18

These records are local PostgreSQL entities created in the add-membership transaction. They are not an external event bus or public API.

## Membership-added Notification

**Kind**: `project_member_added`

**Producer**: `addProjectMember` transaction

**Recipient**: The user identified by the new Project Membership

**Required references**:

| Field | Meaning |
|-------|---------|
| `recipientUserId` | Added user |
| `actorUserId` | Admin who added the user |
| `projectId` | Assigned Project and destination source |
| `projectMembershipId` | Unique membership-period source |
| `createdAt` | Database creation time |
| `readAt` | Null at creation |

**Display contract**:

- Message meaning: "{Actor display name} added you to {Project name}."
- Destination: `/projects/{current Project key}`.
- Initial state: unread.
- Names and destination are resolved from referenced records so renames do not leave an unsafe client-authored payload.
- If the Project is archived, the destination still opens and access is read-only.

**Deduplication identity**: `(kind, projectMembershipId)` MUST be unique.

## Project membership activity

**Event type**: `member_added`

**Producer**: `addProjectMember` transaction

**Feed**: Project-level activity only

**Required references**:

| Field | Meaning |
|-------|---------|
| `projectId` | Project feed owner |
| `actorUserId` | Admin who performed the action |
| `subjectUserId` | Added user |
| `projectMembershipId` | Unique membership-period source |
| `createdAt` | Database creation time |

**Display contract**:

- Message meaning: "{Actor display name} added {Subject display name} to the Project."
- The event belongs only to the Project activity feed; it is not copied to issue feeds.
- The record is system-generated and accepts no free-form event text from the form.

**Deduplication identity**: `(eventType, projectMembershipId)` MUST be unique.

## Atomicity contract

- Membership, Notification, and activity records commit or roll back together.
- A consumer MUST NOT observe a successful active membership without its source Notification and activity records after the transaction commits; there is no asynchronous partial-success state.
- A duplicate or rejected add produces no new persisted event.
- A later remove and re-add creates a new membership-period ID and therefore one new Notification and one new activity record for the new period.

## Consumer freshness

- Consumers read committed database state on the next request.
- The producer revalidates established relevant paths only after commit.
- No delivery acknowledgment, retry counter, queue offset, external webhook, or push subscription is part of this contract.
