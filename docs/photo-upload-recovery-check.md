# Photo upload recovery check

## Scope

This developer-only fixture serves the unchanged application and bundled Supabase SDK on `127.0.0.1`. A small HTTP contract double handles Auth, RPC and Storage requests in memory. It deliberately rejects the first photo upload with HTTP 503 and accepts the next one. It never forwards requests or reads `.env`, production data or credentials. A banner identifies the local fixture.

This is a real-browser exercise against a simulated HTTP service, not a hosted Supabase outage, RLS test, complete Supabase emulator or backup/restore test. The automatic HTTP regression test also uses the actual pinned SDK. Existing database tests separately cover server idempotency and authorization.

## Reproduce

Requires Node.js 22 or later and the repository dependencies (`npm ci`). From the repository:

```powershell
npm run dev:photo-retry
```

The default address is `http://127.0.0.1:4192/#/intake`. To choose another free port:

```powershell
$env:PORT = '4193'
npm run dev:photo-retry
```

1. Confirm the `LOCAL HTTP FIXTURE` banner. Sign in with `operator@example.test` and any nonempty invented password. These values are public test inputs accepted by the fixture; never enter a real password. The synthetic session cannot authenticate against Supabase. Do not select browser password saving.
2. Enter invented reception details, a fictional nine-digit phone starting with 9 and a controller model. Attach `tests/fixtures/photo-retry.jpg`, a harmless solid-color JPEG.
3. Submit once. Expect `La orden GT-9001 se guardó, pero faltan fotos...`. Confirm the fields and photo preview remain, and the submit button is enabled again.
4. **Keep the original reception form open. Do not reload or navigate away.** Press the same create-order button again without changing the case or removing the photo. The request and photo identities belong to that form instance.
5. Expect the GT-9001 detail page with one photo. Reload only after success and confirm the photo still renders. This reload uses fixture memory, not durable database storage.
6. Read the safe local diagnostic endpoint `http://127.0.0.1:4192/__fixture/status`. Expect one order, photo, stored object and initial event; two upload attempts; one failed upload; and matching request/photo identifiers across the two attempts. It exposes only fictional counters/identifiers and contains no sessions or credentials.
7. Stop with Ctrl+C and close the local tab. Restarting the process resets all fixture data; it cannot modify hosted workshop orders. Clear the temporary `PORT` variable if set.

Run the HTTP regression independently:

```powershell
node --test tests/photo-retry-http.test.js
```

The regular `npm test` command and PR CI include it. Browser steps remain an explicitly recorded manual/assisted check, not an automated browser CI job.

## Recorded assisted browser check — 2026-11-03

Unchanged v0.5.2 application files were exercised in the Windows in-app browser at a temporary 390 x 844 viewport. This is responsive desktop evidence, not a physical-phone or cellular-network benchmark. The viewport was reset afterward. Input was fictional and the JPEG was a harmless color swatch.

| Check | Observed result |
| --- | --- |
| First submit | One failed Storage HTTP request (503); one order, one pending photo reservation, no object and one initial event. |
| Error guidance | Explicit saved-order number and instruction to retry without leaving the form. |
| Form retention | Original customer/model values and one photo preview retained; submit enabled; no horizontal overflow in the inspected form (375 px document/client width). |
| Second submit | Navigated to local GT-9001 with one ready photo and stored object; request/photo identifiers unchanged. |
| Reload after success | The same GT-9001 photo loaded with natural width 80; the fixture served the image twice across initial detail/reload. |
| Final counters | One order, reservation, ready photo, object and initial event; two uploads, one intentional failure; stored JPEG 798 bytes. |

The test observer initially waited for a heading containing only the model; the actual heading includes `GT-9001 /`. The selector timeout did not indicate an application failure, and no extra submit was sent. File-chooser automation took substantial wall time; no app latency or human intake duration is inferred from it.

Observed copy issue: the intake badge remains `Borrador sin guardar` after a partial save, while the error correctly says the order was saved. Track a product improvement separately. No application runtime fix was needed to complete this same-form retry case.

## Hosted owner exercise — GT-1049

The owner reported the hosted exercise produced the saved-order/pending-photo message for GT-1049. After disabling the browser request block and retrying, the photo remained visible after reload. This is owner-operated browser evidence against hosted Supabase. The exact device/browser and first-attempt request log were not independently captured; do not label it a physical-phone test or an independently observed provider outage.

A read-only scoped check, reconfirmed on 2026-11-04, found GT-1049 in Pilot Workshop B with the expected fictional test serial. No contact values, credentials, object paths, sessions or tracking URLs were selected into the evidence report.

| Final hosted state | Count/result |
| --- | --- |
| Order with the test number | 1 |
| Orders with the same workshop/request identity | 1 |
| Orders with the expected workshop/test serial | 1 |
| Photo records / ready / pending | 1 / 1 / 0 |
| Stored objects under the order / linked to its photo | 1 / 1 |
| Initial received events | 1 |
| Photo bucket remains private | Yes |

The final snapshot shows no duplicate order, photo or stored object for this case. It does not reconstruct both attempts or prove unchanged photo/request identifiers from independently captured before/after hosted snapshots. The earlier local fixture evidence has its own before/after identifier checks.

### Partial-save label correction

The feature branch replaces the stale draft label with `Orden GT-… guardada · Fotos pendientes` when the backend reports a confirmed order creation followed by failed photo work. A typed `PendingIntakePhotosError` carries only the confirmed order number; the view does not infer a saved order by matching a provider error message. The existing context guard and text-only DOM update remain in use.

The initial form and failed order-creation paths retain the draft label. A successful receive updates the badge to `Orden GT-… guardada` before reloading the list, so a later list-load failure does not keep claiming photos are pending. Request/photo identities and retry behavior are unchanged. This source change requires the normal release flow before owner acceptance on the public site.

Local correction QA on 2026-11-04 used the unchanged failure fixture with the updated app: the fresh form displayed the draft label; after HTTP 503 it displayed the new pending-photo label and kept its photo preview and enabled retry. DOM checks showed no horizontal overflow at 320 px (305 px client/document width) or 900 px (885 px client/document width). The same-form retry opened local GT-9001; its one 80-pixel image loaded again after reload. Fixture counters confirmed one order, photo, object and initial event, two uploads and stable request/photo identities. The viewport was reset and the fixture stopped. Adapter coverage distinguishes failed creation from confirmed creation with pending photos; this does not replace hosted acceptance of the new label.

## Remaining hosted/device checks

- GT-1049 adds owner-reported hosted request-block/retry evidence and a verified final database/Storage snapshot. A physical-phone retry and an independently observed provider outage remain unverified. Do not infer them from this case or the local fixture.
- For a controlled hosted desktop exercise, an operator may use browser developer tools to block only `*/storage/v1/object/repair-photos/*` in that browser, receive a new fictional case, confirm the partial-save message, remove that rule and retry in the same form. Disable the rule afterward. Do not change backend policies, credentials or global network settings, and do not inspect/copy request authorization headers. Compare only that test case's identifiers/counts.
- Turning the whole device offline before submitting can fail order creation before any photo request. That is a different case and must not be recorded as a verified partial-photo upload failure.
- Recovery after leaving/reloading the failed intake is not provided by this exercise: the source image and request identifiers are held by that form. Do not promise that the existing order-detail page can reattach a lost file; it currently directs pending-photo recovery back to the original reception.
- Partial multi-photo batches, a lost successful upload response, another operator's actions and quota failures need their own attributed evidence. Existing adapter/database tests cover some contracts, not every hosted/browser scenario.

Use fictional data until the separate email, access, operations and complete recovery gates in [pilot-runbook.md](pilot-runbook.md) are satisfied.
