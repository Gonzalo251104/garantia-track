# Changelog

## [Unreleased]

### Added
- Recover pending intake photos from a saved order after leaving the original form, reusing reservations and preserving confirmed images, order/history and tracking capabilities.
- Complete unreserved intake evidence from the order within the existing five-photo limit; preserve unsaved repair edits and guard async recovery against view/account changes.

### Tests
- Add an optional known-fictional-photo HTTP probe for anonymous download and signed-URL denial, without credentials or object paths in output.
- Add an operator console helper and classification/redaction tests for a future actual-session owner/nonmember photo exercise; these tests do not claim hosted acceptance.

### Documentation
- Record hosted two-workshop database role checks, anonymous HTTP results, existing security advisor categories and the remaining actual-session Storage check; retain deferred Android acceptance as unverified.
- Provide two-profile Storage test instructions and distinguish supervised fictional observation, real-data pilot gates and the next product priorities.

## [0.5.3] - 2026-11-04

### Fixed
- Show a confirmed saved-order/pending-photo badge after partial intake failure; retain the draft label when order creation fails and clear pending wording after photos succeed.

### Tests
- Add an isolated loopback HTTP fixture and actual-SDK regression for a failed photo upload followed by a same-form retry, without duplicate order, photo or initial event.

### Documentation
- Record owner acceptance of the published v0.5.2 CSV on a phone and the assisted responsive browser photo-retry exercise, distinguishing local HTTP evidence from hosted/device gaps.
- Clarify that a partially saved reception must be retried in its original form before reload or navigation.
- Record the owner-operated hosted GT-1049 retry and read-only final duplicate checks without contact values or private links.

## [0.5.2] - 2026-11-03

### Fixed
- Use a neutral CSV filename and download notification for authenticated workshops while retaining demo labels in demo mode.

### Documentation
- Record physical-phone acceptance of v0.5.1 and publish a standalone fictional pilot evidence sheet with validation checks, CSV evidence, upload-retry coverage and small operator sessions.
- Verify the owner-exported fictional Workshop B CSV against its current order set without recording contact values.

### Tests
- Exercise successful intake photo-upload retry after a temporary failure while preserving request and photo identifiers.

## [0.5.1] - 2026-11-03

### Fixed
- Show the active workshop name in the responsive workspace header and give neutral guidance for unavailable orders without revealing another workshop's records.

### Documentation
- Add mobile acceptance steps and explicit pilot readiness gates for email, recovery, access and operations.
- Record the user's fictional mobile acceptance results and prepare an isolated backup and restoration procedure.
- Record the partial local backup rehearsal and the unresolved Vault restoration failure.
- Record a separate two-instance fictional restore of encrypted Vault data and a private Storage object, including its hosted-project limitations.
- Document the isolated Free-plan hosted recovery lab, its security checks and the remaining authentication and Vault transfer limitations.
- Record the user's fictional photo download and the read-only hosted recovery preflight.
- Record the manually uploaded fictional photo and its initial privacy and metadata checks.
- Verify the manually downloaded recovery-lab photo matches the original with SHA-256.
- Record a rolled-back hosted probe of importing a known fictional QR without extending its expiry.
- Record the partial manual copy of fictional GT-1044 and tracking-hash checks into the recovery lab.
- Verify the owner's manual QR import, encrypted Vault recovery, target tracking and unchanged expiration in the isolated lab.
- Record the controlled lab-only photo attachment and its Storage and row-policy access checks.
- Correct the lab photo attribution: the test illustration came from GT-1043, so GT-1044's photo remains unverified and the incorrect association is pending.
- Record the owner's replacement photo and renewed access checks; source-object byte equality remains unverified.
- Record the owner's confirmation that the expected replacement photo renders in the lab.

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
