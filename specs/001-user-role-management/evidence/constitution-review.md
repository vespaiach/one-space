# Constitution Review

**Status**: Changed feature source reviewed on 2026-08-18.

- Biome check and format pass across configured application source.
- TypeScript and the Next.js production build pass without `any` additions.
- New component visual values use StyleX tokens; the initial placeholder home page raw style was removed.
- No public avatar directory/path, account-deletion action, supported DELETE mutation, role/status session snapshot, raw credential persistence, or routine application logging path was introduced.
- Server actions reauthorize current database state; account transitions and profile/avatar commits use target advisory locks and row locks.
- Direct `<img>` is intentionally retained for authenticated avatar Route Handler responses and local blob previews; Next image optimization cannot safely fetch those session-bound/private sources. The Biome rule is disabled centrally rather than suppressed with source comments.
- Existing comments in the pre-feature design-token file remain unchanged except for appended comment-free tokens; unrelated baseline content was preserved.

Open constitutional evidence is operational rather than hidden: manual WCAG, performance, live SMTP/HTTPS, Docker volume persistence, backup creation, and isolated restoration remain explicitly unpassed.
