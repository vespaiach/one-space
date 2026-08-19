# Page Contract: Add Project Members

**Feature**: `008-add-project-members` | **Date**: 2026-08-18

## `/projects/[projectKey]/settings/members`

### Access

- Unauthenticated requests follow the established login redirect contract.
- An authenticated Member is denied without receiving the Project membership roster, candidate list, or Project-private metadata.
- An active Admin may open the page even when not personally assigned to the Project because membership management is a system-wide Admin capability.
- An unknown Project key uses the application's private-resource not-found behavior.
- Active and archived Projects both expose membership management to Admins; archived status is clearly shown and does not become active when a user is added.

### Server-rendered content

The page presents:

1. Project name, Project key, current status, and a link back to the Project.
2. Current active Project members with name and system role.
3. One-user add form with a visible label and native select.
4. Active non-members as enabled options.
5. Already assigned users as disabled options labeled "Already a member."
6. Suspended users as disabled options labeled "Suspended."
7. A concise explanation that membership access is immediate and archived Projects remain read-only.

Active Admin and Member accounts use the same candidate rules, including the acting Admin's account.

No email address, phone number, Slack handle, session state, or unrelated profile data is required on this page.

### Form states

| State | Contract |
|-------|----------|
| Initial | No candidate selected; submit unavailable until an enabled option is selected |
| Pending | Submit is disabled, duplicate local submission is prevented, and progress text is announced |
| Success | Committed membership appears in the current list; success status names the user and Project; form resets |
| Validation error | Error is associated with the select and focus remains usable |
| Eligibility/duplicate conflict | Message explains the current state and asks the Admin to refresh or choose another user |
| Unexpected failure | Generic retry message; current roster remains authoritative and unchanged |
| No eligible users | Form is unavailable and a clear empty state explains that every active account is already assigned while suspended accounts remain unavailable |

Client pending state is a UX guard only. Database uniqueness and Server Action authorization remain authoritative.

### Accessibility

- Page heading and section headings form a logical hierarchy.
- The select has a persistent programmatic label and descriptive eligibility help.
- Disabled options include text reasons; eligibility is not expressed by color alone.
- Pending, success, and error messages use appropriate live status semantics without stealing focus unexpectedly.
- Keyboard users can reach, select, submit, and return to the current member list in logical order.
- Visible focus and all spacing/color values use shared StyleX tokens.
- The page remains usable at 200% zoom and narrow mobile widths without horizontal control loss.

## `/projects/[projectKey]`

This is the Notification destination and the authority for Project access.

- An active membership makes the Project discoverable and openable on the recipient's next request.
- Active Project: the added user receives normal member access defined by feature 002.
- Archived Project: the added user receives read-only access and sees archived status.
- A missing or historical membership does not disclose the private Project.
- The Notification destination is generated from the current Project key, not accepted as client input.

## Project list and member home integration

- Project list queries include Projects with an active Project Membership for the current user.
- A successful add is visible on the recipient's next navigation or refresh without sign-out/sign-in or acceptance.
- The Notification appears in the existing Notifications & Mentions consumer as unread and recent.
- This feature does not add background polling, push updates, a new Notification center, or external delivery.

## Admin navigation integration

The established Project settings navigation includes a "Members" destination only for Admins. Hiding the destination is not an authorization boundary; direct requests and Server Action submissions remain protected independently.
