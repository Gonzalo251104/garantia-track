# Saved-order photo viewer

## Behavior and scope

The test user wanted to tap a saved intake photo to see it larger. Prepared thumbnails now use labeled `type=button` controls with an **Ampliar** affordance. A click, tap or keyboard activation opens that photo in a native modal dialog. The whole image fits the available viewport with `object-fit: contain`; the thumbnail can remain cropped. Landscape and portrait images use the same viewer.

**Cerrar foto**, native Escape and an outside-backdrop click dismiss the viewer. Focus starts at the close action and returns to the current thumbnail when appropriate. The close target is at least 48 px high. Opening/closing does not remount the order form, submit it, save drafts or change status. No carousel, download/share action, new tab or image transformation service is introduced. The feature displays the existing stored/compressed image rather than reconstructing a higher-resolution original.

Saved demo-order photos use the same controls. Intake previews, pending-upload selections, receipts and customer tracking remain outside this feature; customers still do not receive workshop photos.

## Privacy and lifecycle

The connected gallery keeps its existing membership/RLS checks, private bucket and five-minute signed URLs. The viewer copies the already rendered thumbnail source; it does not request another signed URL, extend its lifetime or make the bucket public. No Supabase SDK, schema, permission, key or dependency change is needed. Both thumbnail and enlarged image use `referrerpolicy=no-referrer`.

The enlarged copy lives only in the dialog. Closing clears its source/callbacks and removes the dialog. Existing thumbnails keep their sources while the authorized order remains displayed; normal browser image caching is unchanged. No source is placed in a route, copied to the clipboard, persisted in new storage or shown in error text.

Navigation, authentication/recovery changes, sign-out and gallery replacement close the viewer. A render-generation guard rejects an obsolete thumbnail event; late image callbacks cannot modify another viewer. An image-load failure keeps a usable close action and asks the operator to reopen the order to reload its photos, without automatically refreshing a capability or retrying a write. This does not add live membership-revocation guarantees beyond the existing temporary URL model.

## Validation — 2026-11-05, America/Lima

Lint, syntax checks, all 102 tests and build passed locally. New tests cover safe/labeled non-submit markup, exact reuse of the source, modal focus, loading/failure state, native-close/backdrop/button cleanup, inactive/detached triggers, stale callbacks and listener disposal. The existing authentication, private-photo recovery, workshop settings and QR/Vault regression tests remain in the suite.

The actual app and SDK were inspected in the desktop in-app browser against an isolated loopback fixture with two generated geometric JPEGs (900 × 600 and 600 × 900), synthetic sign-in and a fictional order. No production session/photo or customer data was used:

- Both orientations displayed fully, including all four corner markers, on desktop and a 390 × 844 viewport. The portrait viewer also fit 320 × 568 with the close control visible and no horizontal overflow.
- Button dismissal, Enter activation, native Escape and a real outside-backdrop click worked. Focus returned to the corresponding thumbnail. An unsaved internal-note draft stayed intact through the opens/closes.
- At 390 px, the close control was 48 px high. A mobile screenshot is retained locally; it contains only synthetic layout artwork.
- The fixture issued exactly two signed-image URLs for the two original gallery items; subsequent desktop/mobile opens did not increase that count. Image GETs may occur for the same URL according to normal browser caching; no zero-network-use claim is made.
- Fixture counts remained one order, two ready photos/objects and one initial event, with two seed uploads. The order remained at version 1/received and its stored note stayed empty; the draft was never saved.
- Browser navigation to orders while a photo was open removed the viewer. Temporary viewport overrides were reset, the preview tab closed and the owned loopback server stopped.

These are local responsive/HTTP-contract checks, not hosted Storage authorization, a physical Safari test or a real outage/URL-expiry drill. The load-error state and stale callbacks have unit coverage. The owner-deferred actual-session cross-workshop photo HTTP exercise remains unverified.

## Publication and pilot acceptance

Use the usual feature PR → develop → release PR → main flow. Include `photo-viewer.js` with changed app/styles in the next approved Sites package; no migration or service configuration is required. Public v0.8.0 is unchanged by this prepared feature.

PR #53 was merged into develop on 2026-11-05 at `068e0ee64f1b2c80510c123249a5d4625b87f74c` after current-head CI passed. The [v0.9.0 release notes](releases/v0.9.0.md) includes the viewer, existing local evidence and publication/rollback steps. No maintained runtime, test or schema change is added during release preparation.

The viewer shipped in v0.9.0. Local keyboard, focus and responsive checks are recorded above. Further phone observation and authenticated nonmember Storage verification are deferred.
