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

No live Supabase project was configured. The SQL migration was executed in embedded PostgreSQL with fixture Auth/Storage schemas and roles, not against Supabase HTTP services. Registration, email confirmation, password recovery, real JWT verification, object upload, signed downloads and cross-device tracking still need a target-project smoke test.

The Supabase integration is available for installation/connection but is not confirmed connected. The repository has no remote. No remote migration, PR or CI run is claimed.

## Local state

The loopback server remains running for review. No demo records were imported into cloud storage. Source changes remain on feature/supabase-integration; main and develop were not modified.
