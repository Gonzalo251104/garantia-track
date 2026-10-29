# Changelog

## [Unreleased]

### Documentation
- Add mobile acceptance steps and explicit pilot readiness gates for email, recovery, access and operations.
- Record the user's fictional mobile acceptance results and prepare an isolated backup and restoration procedure.
- Record the partial local backup rehearsal and the unresolved Vault restoration failure.

## [0.5.0] - 2026-10-28

### Added
- Generate customer receipt PDFs locally with the existing tracking QR and clickable link.
- Share a PDF through the device share sheet or download it for manual attachment; share a tracking message through WhatsApp.
- Document current product flows and pilot priorities.

## [0.4.0] - 2026-10-28

### Added
- Encrypted receipt token recovery with Supabase Vault and member-only transactional RPCs.
- Stable QR retrieval across reloads, tabs and sign-ins without changing expiry.
- Hash-verified adoption of pre-migration tickets without rotating their URLs.
- Lifecycle, tenant-isolation and adapter tests; a non-cryptographic Vault contract double is clearly separated from live encryption verification.

### Changed
- First-time creation is serialized and idempotent; expired, legacy and revoked records are never silently replaced.
- Explicit rotation and revocation share the per-order lock and maintain the encrypted capability consistently.


## [0.3.0] - 2026-10-28

### Added
- Dedicated intake receipt preview with 58/80 mm thermal profiles, monochrome QR and browser printing/PDF support.
- In-memory tracking URL reuse, explicit renewal confirmation and live pre-print validation without automatic token rotation.
- Optional canonical APP_PUBLIC_URL, independent SVG QR decoding tests and printing documentation.
- Configurable local PORT for parallel preview servers.


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
