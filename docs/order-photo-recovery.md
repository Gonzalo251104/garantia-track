# Recover intake photos from a saved order

## Operator flow

Authenticated workshop members can open a saved order and use **Completar fotos de ingreso**, including after the original intake was closed or reloaded. Select the original image again for each named pending slot, inspect its preview and press **Volver a adjuntar foto**. If another interruption occurs, the selection remains available for retry in that view. After a reload, select the file again from the device.

The original intake error also links directly to its saved order. The same-form retry remains available. No second order is created by the detail-page recovery.

When there are no pending reservations and fewer than five photo records, **Guardar foto de ingreso** can complete missing evidence, including cases where the original failure happened before a reservation was persisted. It saves one image at a time. Existing pending reservations must be completed first; the limit includes pending and ready records. There is no confirmed-photo replace/delete control or automatic content-based duplicate detection for a deliberately added image.

Use JPG, PNG or WebP up to 10 MB. The existing browser compression produces JPEG; photos remain private to authorized workshop members. Files are not placed in local/session storage, logs, customer tracking or the ticket PDF by this feature. The application cannot reconstruct an original image that was lost from both the browser and the operator's device.

## Retry and access guarantees

- The adapter queries an existing photo using both the order ID and photo ID under RLS before recovering it. A missing or inaccessible row fails without a new reservation or Storage write.
- Recovery reuses the row and server-generated path. It first attempts completion, so an uploaded object with a lost response can be confirmed without resending bytes. Ready rows are never overwritten; Storage upload uses `upsert: false` and the existing pending-only insert policy.
- New evidence uses one stable identifier across retries. The existing reservation RPC enforces membership, order association and the five-slot limit; no new privileged RPC, grant or migration is introduced.
- Every async UI continuation checks the originating view/account/workshop. An account change or navigation cannot apply the result to a different view. Refreshed metadata must contain the target photo as ready before success is reported.
- Only photo metadata/gallery and recovery controls refresh. Unsaved quote/status/note edits remain in their separate form. Gallery responses have a local generation check to prevent an older request from overwriting a newer gallery.
- This workflow invokes no order creation, status/history mutation, QR rotation, renewal or revocation. Existing tracking capabilities retain their lifecycle. It does not extend private image URL expiration beyond the existing five-minute signing behavior.

The demo flow remains browser-local and does not expose these connected Storage controls.

## Reproduce locally without hosted credentials

```powershell
$env:PHOTO_RETRY_FAILURES = '2'
npm run dev:photo-retry
```

Open the printed local address. Sign in only with fictional fixture values if prompted. The banner identifies the local HTTP double; it is not hosted Supabase or an authorization emulator.

1. Receive a fictional controller and attach `tests/fixtures/photo-retry.jpg`. The first upload intentionally fails after saving local GT-9001.
2. Open the saved-order link and reload. The original form and its image selection are gone; the pending reservation remains in fixture memory.
3. Type a fictional unsaved repair note. Select the image in the pending slot and submit. The second intentional failure must retain the preview, enabled retry and unsaved note.
4. Submit again. Confirm one loaded photo, no pending retry control, unchanged note and the same order. Reload and confirm the photo again.
5. Inspect only safe counters at `/__fixture/status`: one order, photo reservation, ready photo, object and initial event; three upload attempts and two intentional failures. No new intake request/reservation is made by the pending-photo recovery.
6. Stop the process with Ctrl+C and clear `PHOTO_RETRY_FAILURES` from the shell. Restarting resets fixture memory.

The fixture accepts 0–5 intentional upload failures. Its HTTP routes support the SDK photo metadata reads; it does not certify hosted RLS, Vault encryption or device behavior. Standard CI includes adapter, lifecycle, rendering, database and local HTTP checks. Actual hosted/device acceptance follows the normal feature/release PR flow.

## Assisted browser evidence — 2026-11-04

Windows in-app browser, fictional fixture, temporary responsive viewports: the original intake failed; the saved-order link opened GT-9001; reload retained the pending slot. A second failure from the detail page preserved one preview, the enabled retry and an unsaved note. The next retry showed one ready image, preserved the note and removed the pending control. After reload the same image loaded with natural width 80.

DOM measurements found no horizontal overflow at 320 px (305 px client/document width) and 900 px (885 px client/document width). Fixture counters matched the values above. The viewport was reset, the local tab closed and the owned server stopped. These are assisted desktop/local HTTP observations, not a physical-phone run or a hosted two-session authorization test. Final status-copy and target-metadata checks are also covered by code review/automated checks.

No live hosted orders, photos, tracking secrets, Auth settings or policies were changed for this implementation. Public v0.5.3 does not include this feature until a later release is deployed.
