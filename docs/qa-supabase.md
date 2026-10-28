# Supabase integration verification — 2026-10-28

## Automated checks passed

- ESLint, module syntax checks and the browser SDK build.
- Nineteen Node test results, including executable PostgreSQL tests using PGlite.
- Anonymous and cross-workshop reads, direct writes, membership escalation, stale updates and invalid statuses are denied.
- Idempotent intake creates one order and one initial event.
- Photo reservations enforce membership, exact paths, five slots and immutable uploads.
- Public tracking returns only allowed fields, and rotation, expiry and revocation invalidate links.
- SDK adapter tests cover composite RPC encodings, successful retry finalization and explicit upload/mutation errors.
- Public configuration rejects secret/service_role keys and never serializes server-only environment variables.
- npm audit reported zero known vulnerabilities after dependency installation.

## Browser checks passed

- Missing configuration displays a setup screen rather than workshop records.
- Explicit demo entry preserves the existing dashboard design and fictional records.
- Demo intake created GT-1047, a fictional controller repair, and opened its detail.
- Leaving demo returned to the access/setup screen.
- At 390 × 844, the access screen had a 390 px document width and no horizontal overflow. The temporary viewport override was reset.

## Not yet verified

The real project now has the migration applied. A rolled-back transaction on the live database checked authenticated workshop creation, idempotency, cross-workshop denial and anonymous tracking field restrictions. No fixture accounts or orders were retained.

The live smoke script passed against Auth settings, anonymous Data API restrictions, unknown tracking tokens and anonymous Storage upload denial. Auth registration/confirmation/recovery, authenticated upload, signed downloads and cross-device end-to-end tracking still need a real test account. The Supabase connection is active; PR #1 and draft PR #2 are open with successful initial CI runs. See environment.md for configuration details and intentional advisor findings.

## Local state

The loopback server remains running for review. No demo records were imported into cloud storage. Source changes remain on feature/supabase-integration; main and develop were not modified.
