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

## Live authenticated end-to-end verification

The real project now has the migration applied. A rolled-back transaction on the live database checked authenticated workshop creation, idempotency, cross-workshop denial and anonymous tracking field restrictions. No fixture accounts or orders were retained.

The owner created and signed into an application account. In that session, workshop GarantiaTrack QA and fictional controller order GT-1042 were created through the interface. One generated 800 x 500 PNG fixture was compressed and uploaded as private evidence. Its signed image URL rendered successfully before and after a full reload.

The order was updated to diagnosing with PEN 85.50, an internal QA note and a separate customer message. Customer tracking displayed the updated state/message without the contact, serial, internal note or photo. A separate SDK client with no Auth session returned exactly the allowed tracking fields and was denied direct download of the actual evidence object.

Rotating the tracking link invalidated the first URL. Revoking the second link made it inaccessible anonymously. A final valid link was generated for the owner. Bearer URLs were not committed or included in this report. The fake order and its photo remain available for manual testing; no real customer data was entered by the assistant.

Password recovery, session expiry, and a separate physical device were not exercised. The prior rolled-back SQL checks and the 19 automated tests remain separate verification layers. See environment.md for intentional advisor findings.

## Local state

The loopback server remains running for review. No demo records were imported into cloud storage. Source changes remain on feature/supabase-integration; main and develop were not modified.
