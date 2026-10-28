# Changelog

## [Unreleased] - 0.2.0

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

### Pending environment verification
- Development project configured on the free plan; initial migration applied remotely.
- Live anonymous API smoke and rolled-back tenant isolation checks passed.
- Prototype and Supabase PRs opened; initial remote CI passed.
- Auth redirect setup, email flows and authenticated photo upload still require a live user test.

## [0.1.0] - 2026-10-27

### Added
- Responsive repair dashboard with search, status filters and CSV export.
- Console/controller intake with accessories and compressed local photos.
- Order detail, editable status, quote, internal notes and customer message.
- Customer tracking presentation with a status timeline.
- Local persistence, reset confirmation and printable intake record.
- Domain tests, PR template and CI configuration.

This is an unreleased prototype on a feature branch, not a production release.
