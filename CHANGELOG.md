# Changelog

## [Unreleased]

### Changed

- Add the monochrome gear-shaped G to both thermal receipt headers while preserving the QR layout.
- Prevent an empty trailing page caused by the thermal preview's screen height.

## [0.10.4] - 2026-11-11

### Changed

- Use the gear-shaped GarantiaTrack mark as the browser tab icon.

## [0.10.3] - 2026-11-11

### Changed

- Replace the letter badge with the GarantiaTrack gear-shaped G mark.

## [0.10.2] - 2026-11-11

### Changed
- Describe the public application without prototype wording or unmeasured time-saving claims.
- Keep the public workspace connected and make the sample workshop an explicit loopback-only opt-in for development.
- Use connected-workshop guidance in intake, order details and private tracking. Guide new workshops to their first intake from an empty order list.

## [0.10.1] - 2026-11-06

### Changed
- Improve screen readability with 16 px form controls and labels, 14 px secondary text and navigation at the default text size, stronger text/status contrast, and wrapping for narrow order cards and long equipment/customer names.
- Remove decorative counter captions and repeated form descriptions; simplify reception guidance and place the connected dashboard's general tracking explanation in a keyboard-accessible disclosure. Keep privacy, upload limits, required-field and QR invalidation guidance visible.
- Keep thermal receipt dimensions, print typography and PDF generation unchanged. Record isolated desktop/mobile browser validation in `docs/mobile-readability.md`.

### Validation
- Verify mobile/desktop layout, keyboard controls, required-field validation, local status/message persistence and unchanged thermal paper sizing using fictional local fixtures and demo data. All 113 existing tests pass; physical iPhone/Safari and printer acceptance remain separate.

## [0.10.0] - 2026-11-06

### Added
- Receive equipment as Other alongside Console and Controller, using the existing required model field. Share type labels across intake, order lists and thermal/PDF receipt data; use a generic equipment icon.
- Extend only the device allowlist constraint through a migration, preserving existing records, private-photo rules, scoped RPCs and tracking capabilities.

### Tests
- Cover Other intake validation, SDK retry/reload, thermal/PDF labels and migration preservation of existing records, capabilities and access controls. Record isolated hosted-lab rollback checks and desktop/mobile fixture acceptance.

## [0.9.1] - 2026-11-05

### Changed
- Keep the current workshop screen visible during internal navigation; use a compact progress indicator and pending destination instead of replacing the page with a loading screen. Suspend previous-page controls until the destination is ready.
- Discard late form/photo/receipt callbacks after navigation and clear retained content promptly when authenticated access changes.

### Tests
- Cover retained DOM/drafts, inert controls, pending-destination replacement, disabled-control cleanup and early membership invalidation. Record delayed desktop/mobile fixture acceptance, sign-out during navigation and controlled local read failure.

## [0.9.0] - 2026-11-05

### Added
- Open saved-order intake photos in a responsive modal from labeled thumbnails on mobile and desktop. Show the full image with close-button, Escape and backdrop dismissal, restoring thumbnail focus.
- Reuse the current private image URL without signing another link, preserve pending repair drafts, and close/clear the enlarged image on navigation, authentication changes or gallery refresh.

### Tests
- Cover accessible thumbnail/modal behavior, source reuse, image failures, focus restoration, stale contexts/callbacks and cleanup. Record desktop and 390/320 px local browser acceptance with synthetic images.

## [0.8.0] - 2026-11-05

### Added
- Open workshop settings from Taller on mobile and desktop; owners can save a validated workshop name and see it update in the workspace immediately.
- Rename through a guarded RPC with current owner/membership checks and expected-name conflict detection. Technicians have a read-only view; table write grants remain closed.

### Tests
- Cover owner/technician/foreign/anonymous permissions, stale-name retries, escaped names, late responses and actual-SDK local HTTP persistence. Verify that renaming preserves orders, tracking expiry and Vault references in the local database contract.

### Documentation
- Record isolated hosted-lab migration and rollback-only SQL-role checks, unchanged recovery data/security-advisor baseline, and the required production-migration-before-frontend publication order.

## [0.7.1] - 2026-11-04

### Fixed
- Avoid downloading the recent order list for an empty reception; fetch only the requested workshop-scoped order for detail and ticket routes.
- Run fresh membership and required order reads concurrently when a workshop is known, discarding obsolete results after navigation, account or workshop changes.
- Keep workspace navigation visible during internal loading instead of replacing every screen with the initial connection view. Hide incomplete list totals on direct entry.

### Tests
- Cover route-specific reads, membership-gated concurrency, changed/removed access, stale responses and provider failures; verify scoped single-order reads and nested evidence with the actual SDK over local HTTP.

### Documentation
- Record isolated delayed-response and responsive-browser evidence, remaining physical-phone acceptance, publication checks and the verified v0.7.0 frontend rollback target.

## [0.7.0] - 2026-11-04

### Fixed
- Replace the small post-registration hint with a focused confirmation screen explaining the email step and offering sign-in or a different email, without claiming account existence or email delivery.

### Added
- Change an order's status from a dedicated panel with four primary options: received, repairing, ready and delivered. Keep diagnosing and awaiting approval under additional options, automatically expanded for a current additional state.
- Save status independently of quote, internal note and public-message drafts. Preserve existing versioned RPC validation, show explicit results, and use the ready-stage label "Listo para entregar" consistently.

### Documentation
- Record owner-relayed technician feedback from fictional GT-1051 on iPhone 15/Safari and select registration feedback as the first bounded pilot improvement.

## [0.6.0] - 2026-11-04

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
