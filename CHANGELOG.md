# Changelog

## [0.2.0] - 2026-10-28

### Added
- Supabase Auth login, email registration, password recovery and workshop onboarding.
- Transactional PostgreSQL order creation and updates with tenant membership checks, idempotency and stale-edit detection.
- Private photo reservations, retryable uploads and short-lived signed viewing URLs.
- Hashed, rotating, revocable customer tracking links with minimal anonymous output.
- Versioned SQL migration, embedded PostgreSQL security tests, SDK adapter tests and public configuration validation.
- Dependency lockfile, local SDK bundle, ESLint and PR lint/test/build checks.

### Changed
- Local demo now requires explicit selection and never acts as a backend failure fallback.
- Documented setup and the stacked PR dependency on the unmerged prototype.
- Scoped photos to each intake and captured upload batches before network waits, preventing unrelated forms from sharing evidence.
- Ignored stale async callbacks after navigation or identity changes; order updates retain the version shown in the form.
- Omitted photo data and client event history from order-creation RPC payloads.
- Aligned the initial migration filename with the already-applied remote version 20261028060929 without changing its SQL.
- Reran PR CI on base-branch edits and documented the ordered Gitflow integration.

### Release preparation
- Added a PR-gated Gitflow release process, main-only GitHub tag/release workflow and deployment/rollback runbook.
- Updated CI actions and covered release/hotfix PR targets.
- Added a public version/commit build marker and an opt-in guard against unconfigured production builds.
- Verified local authenticated intake, private photo persistence and customer tracking with fictional data.

## [0.1.0] - 2026-10-27

### Added
- Responsive repair dashboard with search, status filters and CSV export.
- Console/controller intake with accessories and compressed local photos.
- Order detail, editable status, quote, internal notes and customer message.
- Customer tracking presentation with a status timeline.
- Local persistence, reset confirmation and printable intake record.
- Domain tests, PR template and CI configuration.

Internal prototype milestone; no public v0.1.0 release was published.
