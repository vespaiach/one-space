# Implementation Readiness Checklist: Create Project

**Purpose**: Broad requirements-quality review across all dimensions — completeness, clarity, consistency, measurability, coverage, and risk — to be completed by the author before writing any production code.
**Created**: 2026-08-18
**Feature**: [spec.md](../spec.md)

**Review Ownership**: This checklist is a reviewer-owned requirements-quality artifact. Mark an item `[x]` only when you have confirmed the requirements-quality criterion is satisfied in the specification documents.
**Marker Semantics**: `[x]` means the criterion has been reviewed and the requirement is well-specified. It does NOT mean implementation work is complete.

---

## Requirement Completeness

- [x] CHK001 Is the `/projects` list page (the redirect destination in FR-008 and SC-004) specified in any feature spec, or is it an undocumented cross-feature dependency? [Gap, Spec §FR-008, §SC-004]
- [x] CHK002 Is there a requirement for what the admin sees immediately after creation — specifically, whether the newly-created project is highlighted or simply present in the list? [Gap, Spec §FR-008]
- [x] CHK003 Are the exact error message texts specified for each FR-009 validation case, or only the trigger conditions? [Completeness, Spec §FR-009]
- [x] CHK004 Is there a requirement covering server-side exception behavior (DB insert failure, network error) beyond per-field validation errors? [Gap — exception flow not addressed in spec]
- [x] CHK005 Is the description field's maximum length limit (10,000 characters, defined in `contracts/server-actions.md`) reflected in the spec's FR section rather than only in the contract artifact? [Completeness, Spec §FR-006]
- [x] CHK006 Are requirements defined for the markdown rendering failure state — what the admin sees if `marked` parsing throws an error on a stored description? [Completeness, Spec §FR-006]

---

## Requirement Clarity

- [x] CHK007 Is "immediately accessible" in FR-008 quantified — does it mean the redirect is instant, or that no additional delay beyond SC-004's 2-second window is allowed? [Clarity, Spec §FR-008]
- [x] CHK008 Is "actionable validation errors" in FR-009 defined with specific UX criteria — which field receives focus after failure, inline vs. summary display, whether all errors appear simultaneously? [Clarity, Spec §FR-009]
- [x] CHK009 Is the key auto-generation trigger precise enough to distinguish tabbing out of the name field, clicking elsewhere on the page, and switching to another browser window (all are "blur" events but may need different handling)? [Clarity, Spec §Assumptions]
- [x] CHK010 Is "manual edit" in FR-010 defined precisely enough to distinguish an admin keystroke from a browser autofill action, which also mutates the field value without user intent? [Clarity, Spec §FR-010]
- [x] CHK011 Is the upper bound on conflict suffix increments explicitly stated in the spec — what the system does when all of "MC2" through "MC9" are already taken? [Clarity, Spec §FR-010, Clarifications Q1]
- [x] CHK012 Is "basic markdown" in FR-006 exhaustively enumerated such that an implementor could not reasonably include strikethrough, tables, footnotes, or task lists as "basic"? [Clarity, Spec §FR-006]

---

## Requirement Consistency

- [x] CHK013 Does FR-010's conflict behavior ("automatically append an incrementing numeric suffix until the key is unique, then present that value as the editable default") contradict the contract's statement "Key availability is not checked client-side"? [Conflict, Spec §FR-010, contracts/pages.md §Key auto-generation behavior]
- [x] CHK014 Do FR-008 ("immediately accessible") and SC-004 ("within 2 seconds") express the same constraint or two separate, independently verifiable requirements? [Consistency, Spec §FR-008, §SC-004]
- [x] CHK015 Is the key algorithm description in FR-010 word-for-word consistent with the Assumptions section's description, or do they diverge on padding, truncation, or strip behavior? [Consistency, Spec §FR-010, §Assumptions]
- [x] CHK016 Is the 12-color palette list identical across FR-002, the Assumptions section, `data-model.md`, `research.md`, and `contracts/server-actions.md`? [Consistency, Spec §FR-002, §Assumptions]
- [x] CHK017 Does SC-003 ("all required-field validation errors surfaced before submission reaches the server") correctly exclude key uniqueness errors, which by definition require a server-side DB check? [Conflict, Spec §SC-003, §FR-009]

---

## Acceptance Criteria Quality

- [x] CHK018 Is SC-001's 90-second completion target measurable under defined conditions — with a specified number of existing projects, network speed, and device class? [Measurability, Spec §SC-001]
- [x] CHK019 Is SC-004's 2-second appearance target measured from form submission, from server redirect response, or from client-side rendering completion — and is the measurement method specified? [Measurability, Spec §SC-004]
- [x] CHK020 Is SC-005's "renders correctly for all supported markdown elements" testable against a specific reference input string and expected HTML output? [Measurability, Spec §SC-005]
- [x] CHK021 Does US1 include an acceptance scenario explicitly covering the key auto-generation happy path (name blur → key populates), or only the general form submission? [Completeness, Spec §US1]

---

## Scenario Coverage

- [x] CHK022 Is there an acceptance scenario for a non-admin user who bypasses the UI and directly calls the `createProject` action (e.g., via a crafted POST)? [Coverage, Spec §US3]
- [x] CHK023 Are requirements or scenarios defined for what happens when the admin's session expires while the creation form is open and then they submit? [Coverage, Spec §Edge Cases]
- [x] CHK024 Is the behavior defined for unsaved form state — does navigating away mid-form show a browser confirm dialog, silently discard, or draft-save? [Gap, Coverage]
- [x] CHK025 Is re-submission behavior after a failed validation specified — does the form retain all previously entered values (name, description, color, dates) or reset? [Gap, Coverage]

---

## Edge Case Coverage

- [x] CHK026 Is the behavior specified when the project name produces an empty string after stripping non-alphanumeric characters, triggering the "PROJ" fallback? [Edge Case, Spec §Assumptions]
- [x] CHK027 Is the behavior defined for a very long project name (near 255 characters) in terms of how the key generation and truncation behave? [Edge Case, Spec §FR-010]
- [x] CHK028 Is it specified whether `startDate` can be set in the past (a project retroactively created) or must it be today or a future date? [Gap, Edge Case — spec defines no lower bound]
- [x] CHK029 Is the behavior specified for unsupported markdown syntax in the description — specifically raw HTML injection and image embeds — in terms of how they are rendered or stripped? [Edge Case, Spec §Edge Cases, §Assumptions]
- [x] CHK030 Is the behavior specified when the admin submits the form immediately after a concurrent admin has created a project with the same auto-generated key (race condition)? [Edge Case, Gap]

---

## Non-Functional Requirements

- [x] CHK031 Are keyboard navigation requirements for the color swatch picker specified — can each swatch be selected with arrow keys, does Tab move between swatches or skip the group, and is Enter/Space used to select? [Gap, Non-Functional]
- [x] CHK032 Are ARIA label requirements for each color swatch defined — is each swatch announced by its color name (e.g., "amber") to screen reader users, not just visually differentiated? [Gap, Non-Functional]
- [x] CHK033 Is a focus order for keyboard navigation across all form fields specified (name → key → description → color → start date → end date → submit) in the contracts or spec? [Coverage, contracts/pages.md]
- [x] CHK034 Are CSRF protection or rate-limiting requirements specified for the `createProject` server action? [Gap, Security — only admin-only access control is specified]
- [x] CHK035 Is the key format hint text ("2–6 uppercase letters/digits") required to be programmatically associated with the key input (e.g., via `aria-describedby`) or only visually adjacent? [Gap, Non-Functional, contracts/pages.md]

---

## Dependencies & Assumptions

- [x] CHK036 Is the dependency on 001-user-role-management's `requireAdmin()` guard documented in the spec's Assumptions section with an explicit feature reference, or only in plan artifacts? [Assumption, Spec §Assumptions]
- [x] CHK037 Is the `marked` approval recorded in a durable governance artifact (e.g., `governance.md`) with date, approver, and scope — or only in the plan's Dependency Gate table which may be overwritten? [Dependency, plan.md §Dependency Gate]
- [x] CHK038 Is the HTML sanitization requirement for `marked`'s output specified — which allowed elements and attributes, and whether sanitization runs server-side before render or client-side before `dangerouslySetInnerHTML`? [Dependency, research.md §4]

---

## Ambiguities & Conflicts

- [x] CHK039 Is there an explicit resolution to the conflict between Clarification Q1 ("auto-append suffix and present as editable default") and the contract ("Key availability is not checked client-side") — which behavior governs? [Conflict, Clarifications, contracts/pages.md]
- [x] CHK040 Does quickstart.md Scenario 3 step 2 ("Verify the Key field auto-suggests MC2") accurately reflect the contract-specified behavior (no client-side uniqueness check), or is this scenario describing a behavior that is not actually specified? [Conflict, quickstart.md §Scenario 3, contracts/pages.md]

---

## Notes

- Mark items `[x]` only after confirming the requirements-quality criterion is satisfied in the specification documents
- Items marked [Gap] indicate missing requirements — resolve before implementation begins
- Items marked [Conflict] indicate contradictions between artifacts — the authoritative artifact is listed in the reference; update the others
- `checklists/requirements.md` has a separate built-in lifecycle maintained by `/speckit-specify` and `/speckit-clarify`
- CHK013 and CHK039 overlap — the key auto-generation conflict between FR-010 and contracts/pages.md is the same root issue; resolving one resolves both
- CHK037 is actionable immediately: create `governance.md` to record the `marked` approval with date 2026-08-18
