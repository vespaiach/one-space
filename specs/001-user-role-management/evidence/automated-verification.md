# Automated Verification Evidence

**Date**: 2026-08-18

- `DATABASE_URL_TEST=postgres://localhost/one_space_feature_test npm run test:integration` — passed: 22 files, 62 tests.
- `npm run test:accessibility` — passed: 1 file, 1 state-matrix test.
- `npm test -- --run` — passed: 15 files, 47 tests.
- `npm run test:operations` — passed: 1 file, 1 script-contract test.
- `npm run verify` with isolated local PostgreSQL and non-secret build fixture environment — passed lint, format, TypeScript/build, and static page generation.
- `sh -n ops/backup.sh ops/restore.sh ops/verify-restore.sh` — passed shell parsing.

The successful Turbopack build reports one warning for intentional dynamic private-volume filesystem access. Trace exclusions remove tests, specifications, agent metadata, and VCS data from the standalone output. The local standalone output contains the developer `.env`; the release Docker context excludes `.env*`, so no developer or server environment file is available to or copied by the image build.

`docker compose config --quiet` was attempted but Docker is not installed in this environment. No Docker build, Compose runtime, GitHub Actions run, SMTP connection, or restore operation is inferred from the passing checks.
