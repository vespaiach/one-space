# Next.js Implementation Readiness: Add Project Members

**Task**: T001
**Recorded**: 2026-08-19
**Installed version**: Next.js 16.3.1

## Dependency installation

`npm ci` completed successfully from the committed lockfile and installed 217 packages. npm reported three deprecation warnings and four moderate vulnerabilities. No package or lockfile changes were made, and no automatic audit fix was attempted because a forced audit fix may introduce breaking dependency changes outside this feature.

## Local guides reviewed

- `node_modules/next/dist/docs/01-app/02-guides/forms.md`
- `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, covering database sessions and authorization through Server Actions
- `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`

## Applicable constraints

1. Treat `addProjectMember` as a public-facing POST mutation boundary. Authenticate, authorize the current database-backed Admin, and validate all `FormData` inside the Server Action even when the page already hides or protects the form.
2. Page, layout, Proxy, and navigation visibility checks are user-experience helpers, not sufficient authorization. Secure checks stay close to membership, Project, Notification, and activity reads and writes.
3. Accept only the Project and selected-user identifiers from the client. Resolve actor identity, role, account status, Project data, names, Notification content, and destination from trusted server data and return only the bounded fields rendered by the form.
4. Model expected validation, authorization, eligibility, duplicate, and conflict failures as typed return values consumed with `useActionState`. Reserve thrown errors and route error boundaries for uncaught failures.
5. Use the `useActionState` pending value to disable repeat submission and expose an announced pending state. Client-side sequential Server Action dispatch is not a concurrency guarantee because separate clients still submit concurrently.
6. Commit the database transaction before returning success or invoking revalidation. A Server Action can return its state and a re-rendered current route in one response after `revalidatePath`.
7. Prefer precise post-commit invalidation. Literal paths do not take a `type`; dynamic route patterns require `"page"` or `"layout"`. Do not use stale-while-revalidate behavior where the specification requires immediate read-after-write visibility.
8. Await dynamic route `params` in Next.js 16 page components.
9. Do not introduce a validation package for two UUID fields; the constitution and feature research require the dependency-free validator planned in `lib/validation/identifiers.ts`.

## Readiness result

T001 passes. Production implementation remains subject to the separate Foundation Dependency Gate in T002.
