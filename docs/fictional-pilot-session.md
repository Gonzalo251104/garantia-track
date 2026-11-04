# Controlled fictional pilot session

Purpose: validate the daily workshop flow and identify the next product improvement. Use fictional data. External onboarding and real-customer readiness remain gated by [pilot-runbook.md](pilot-runbook.md).

## Current published acceptance — v0.5.2

The public site is now v0.5.3. The owner reported Android label/retry success but the latest stored order still predated that release when checked, so the specific new-order/device evidence was not reconciled. The owner chose to defer that review; keep device-specific acceptance unverified. Continue with the separately attributed access evidence in [pilot-photo-access-check.md](pilot-photo-access-check.md).

The owner confirmed on their physical phone that the published v0.5.2 authenticated CSV uses the correct filename and notification. No device/browser details or new CSV content audit were supplied. The earlier v0.5.1 acceptance below remains separate evidence.

See [photo-upload-recovery-check.md](photo-upload-recovery-check.md) for the assisted responsive browser recovery exercise against a local HTTP contract fixture and the later owner-operated hosted GT-1049 exercise. The owner reported the partial-photo error, successful same-form retry after removing the browser block, and photo persistence after reload. A read-only hosted snapshot reconfirmed on 2026-11-04 found one matching order, one ready photo, no pending photo, one linked stored object and one initial event; the bucket remains private. No first-attempt hosted snapshot or precise device/browser was captured. Physical-phone recovery and a provider outage remain unverified. The stale partial-save badge is corrected in the current feature branch, pending release.

Published release: v0.5.1, canonical commit `52f79fa6b9004d9b07641bb1fe4040c22375d1c3`, existing public Sites origin. The owner confirmed on their physical phone that the active workshop appears in the header and the new neutral unavailable-order message appears when opening another workshop's order. This is owner-reported acceptance; device/browser details were not supplied. The two improvements supersede the header and missing-order copy observations recorded below.

The earlier fictional phone reception was reported as fast, with no need for a manual stopwatch according to the owner. Do not infer a precise intake duration or a performance guarantee. CLI/Vault implementation and its live recovery work remain in draft PR #26; this document does not require merging that PR to run the pilot session.

### Additional validation checks

On 2026-11-03, the published authenticated intake form was exercised without a valid submission: missing required customer input was invalid with a nonempty browser validation message; a short phone had `patternMismatch=true`, but the read did not return a nonempty native validation message; and a whitespace-only customer was rejected by the application with its required-field message. The invalid form was cancelled. Read-only database counts before and after remained six orders. These checks validate the exercised rejection paths, not every error or network failure path. In particular, the phone guidance's visible wording was not independently established by that DOM read.

The owner exported Pilot Workshop B's CSV. A read-only local check found two rows, GT-1045 and GT-1046, with no duplicate identifiers. The set matched a separate current database query scoped to B; no additional workshop order was present in this artifact. Columns were `order_number`, `customer`, `phone`, `model`, `status`, `quote_pen` and `created_at`. UTF-8 BOM was present; status values were allowed values, quotes used two decimal places and timestamps parsed successfully. No secret, URL, photo or internal-note column was present. Contact values and full rows were not printed or copied into Git. The original artifact was not modified.

This is one operator-exported artifact checked against a current database snapshot, not exhaustive export authorization or native Excel locale validation. Export scope is the loaded workshop list (currently at most 500 recent orders), not a complete recoverable database backup. The observed v0.5.1 artifact and success notification were demo-labelled even in an authenticated workshop. This branch fixes that copy issue: authenticated exports use `garantiatrack-orders.csv` and `Exportación CSV descargada.`; demo mode retains its existing filename and notification. Publication of this fix requires the normal release flow; it is not part of the v0.5.1 acceptance above.

An additional adapter test exercises a temporary photo-upload failure followed by a successful retry, asserting stable request/photo identifiers and the saved order returned after completion. It uses a simulated RPC/Storage service and complements existing server idempotency coverage; it does not replace a real browser connectivity/retry exercise. The adapter test file passed all 12 tests after the addition. Direct nonmember photo HTTP denial and real UI failed-upload recovery remain pending.

## Next small pilot sessions

1. **Operator exercise:** use the existing two test workshops, a fresh fictional controller/console case and harmless image. Confirm receipt, photo persistence, latest public status and isolation. Record only friction and pass/fail; stopwatch timing is optional.
2. **Failure and handoff exercise:** validate the B-only CSV, safe retry after a failed upload, and one PDF handoff to a consenting test recipient. Test actual paper and QR scanning if a thermal printer is available. Mark unavailable tests pending.
3. **Workshop observation:** when a workshop operator agrees to participate, have them perform the same fictional workflow with minimal guidance. Record what they need explained, whether it fits their current paper/WhatsApp process, and which single improvement would make it useful. A second account owned by the project owner is technical acceptance, not independent market validation.

The project owner coordinates these sessions and retains sanitized findings. Agree on a support contact and fallback before involving an observer. Use only current free hosting and the existing test accounts; external self-service registration/password recovery still needs verified email delivery. Pause the exercise and investigate any cross-workshop exposure. Complete independent database/Auth/Vault recovery before moving to real customer records.

## Preparation

- Record date, published app version/commit, phone/browser, operator and observer. The recovery CLI does not change the deployed app; use the existing published release for this exercise.
- Use two distinct test accounts, each in its own fictional workshop: Workshop A and Workshop B. Two members of the same workshop do not test tenant separation. Use team-authorized test addresses while default SMTP restrictions remain. If the second account cannot confirm email, record onboarding as blocked; keep email confirmation enabled.
- Use invented customer/device details, an authorized test phone number and a harmless photo with no personal information. Share the PDF only with a consenting test recipient. Keep bearer URLs, sessions and signed photo links out of Git, screenshots and reports.
- Use separate browser profiles for the two workshops and a signed-out customer browser. Record unavailable equipment, including the thermal printer.

## Daily flow

1. Workshop A receives one fictional controller with accessories, condition and reported fault. Time intake, attach the test photo and record the generated order number.
2. If photo upload fails after the order is saved, retry in the original form or, after the saved-order recovery release, reopen the order and select the original image again for its pending slot. After success, reload on the phone and confirm the same order and photo. See [order-photo-recovery.md](order-photo-recovery.md); the application does not reconstruct a source file lost from the device.
3. Perform two permitted status changes, reloading after each. Open customer tracking in a signed-out browser and check the correct order and latest status, with no contact details, serial, internal notes or photos.
4. Share the receipt PDF to the consenting test recipient. Scan its QR on another device. Reload the workshop receipt and reprint/download it; confirm the original PDF link still works without renewing its token.
5. In Workshop B's browser, open Workshop A's order-detail route. Confirm A's data and photos cannot be read. Do not transfer sessions or signed photo URLs between testers. Record the actual HTTP/application result; database-role simulations are separate evidence.
6. Workshop B creates and reloads its own order. Confirm Workshop A cannot read that order. Customer tracking is a deliberate bearer capability, separate from authenticated workshop access.
7. Try missing intake fields and a brief connection interruption; record whether messages and retries are usable. Keep security settings unchanged.
8. Print and scan a physical receipt if a thermal printer is available; otherwise mark the check pending.

## Evidence sheet

Keep a private operator note and copy only sanitized symptoms into GitHub.

| Check | Result (pass/fail/blocked/pending) | Sanitized observation |
| --- | --- | --- |
| Two independent workshops can sign in | pass | Owner-created B account used the published app; owner tested A separately; memberships are independent. |
| Timed phone intake and photo persistence | partial | Desktop GT-1045 intake/photo persistence passed; phone timing remains pending. |
| Status changes survive reload | pass | GT-1045 diagnosing and repairing persisted during the desktop exercise. |
| Signed-out customer sees latest status | pass (owner-reported) | Owner confirmed GT-1045 is En reparación without phone, serial, internal notes or photos. |
| PDF share and original QR survive receipt reload | partial | PDF downloaded and private link survived reload; owner opened the PDF link signed out; new WhatsApp delivery remains pending. |
| Cross-workshop reads are denied both ways | partial | Order detail routes denied both ways (operator B to A, owner-reported A to B); direct nonmember Storage HTTP check remains pending. |
| Input and connectivity failures have usable recovery | partial | Invalid intake rejection, adapter/local HTTP retry and owner-operated hosted GT-1049 retry passed for their recorded scope; physical-phone and other failure cases remain pending. |
| Physical print and QR scan | pending | |

Measure intake time, failed uploads, duplicates and steps requiring help. Ask which step is confusing and whether this would replace the workshop's current process. Choose one improvement from observed friction. A tenant-isolation failure stops the session and requires a fix.

## Open readiness tasks

### Automated responsive exercise — 2026-11-03

The owner reported the phone flow felt fast and declined manual stopwatch measurements, then authorized an automated timed run. Preserve that as qualitative feedback: no measured human intake duration, physical device model, browser, exact mobile order number or camera-image benchmark was supplied.

An in-app Windows browser run used a temporary 390 x 844 viewport and the currently authenticated **GarantiaTrack QA** workshop. It created GT-1047 with one fictional controller illustration (14,907-byte input), not a real camera photo. Database metadata confirmed one ready photo; after reload, its DOM load state became complete with a nonzero natural width. The first image check after the detail controls appeared was still loading. The customer-view document width was 375 px against the 390 px viewport in the DOM measurement, with no observed horizontal overflow in that view. The viewport was reset afterward.

| Segment | Observed wall time | Interpretation |
| --- | --- | --- |
| Scripted text/control entry | 2.118 s | Automated entry; not a human typing benchmark. |
| File-chooser/attachment flow | 108.110 s | Excluded from app-performance conclusions: includes selector and automation transfer overhead. |
| Save to detail | unavailable | Completion selector wait failed even though the order saved; do not retry submission or report a save duration. |
| Reload to detail controls | 1.691 s | Controls ready; image was not yet loaded at that instant. |
| Open ticket to create-QR control | 1.100 s | Single automated observation including interaction/transport overhead. |
| Create QR to PDF-download control | 3.290 s | Single automated observation, not isolated backend latency. |
| PDF click to completed download event | 181.395 s | Excluded from app-performance conclusions: automation/download path delay cannot be attributed to PDF generation. |

Times were measured with runtime wall-clock timestamps around actions, excluding model reasoning pauses between segments. The test did not emulate physical CPU, touch keyboard, camera or cellular network. It is not an end-to-end human benchmark, a statistical latency result or evidence of app slowness. Do not add the segments into a total intake time.

The 11,934-byte ticket PDF downloaded, and the customer link opened the correct GT-1047 received state and public message. This customer-view check used the existing authenticated browser context, not a fresh anonymous session; the earlier owner-reported signed-out GT-1045 check remains separate evidence. No PDF was sent by WhatsApp. No token or signed photo URL is included in this report.

Observed improvement hypotheses for a later product PR: identify the active workshop in the authenticated header (only the product name and sign-out control are currently shown), and review the extra create-QR action before first PDF download. These were visible interaction steps, not owner-reported confusion. The earlier missing-order copy issue remains relevant. No runtime/UI code or deployment changed during this exercise.

### Recorded exercise — 2026-11-03

The owner created and signed in to a second fictional workshop, Pilot Workshop B. Read-only database checks confirmed it has a different owner and no shared memberships with the workshop owning GT-1044. In the signed-in browser session later proven to create Workshop B's order, opening the existing Workshop A route for GT-1044 returned the generic not-found page without order details or photos.

Through the published app's actual reception form, the operator created fictional GT-1045 for Workshop B with an explicitly fictional controller illustration containing no customer data. A read-only database check confirmed B's ownership and one ready photo. Browser reload retained the first status change to diagnosing; later re-entry retained the second change to repairing, the private note and public message. The image's DOM load state confirmed it loaded successfully. Intake was operated from the in-app desktop browser, not a new mobile test, and no manual-entry time benchmark was recorded.

The ticket showed Workshop B and GT-1045. A new QR was created for that order and its PDF was downloaded locally. Comparing the private link in browser memory before and after ticket reload returned equality; the token was redacted from printed observations and was not included in this report. No PDF was sent to a recipient. Actual customer tracking in a signed-out browser, Workshop A's denial when opening GT-1045, direct nonmember Storage HTTP denial and physical printing remain pending. The owner has been asked to perform the first two checks in separate sessions. Prior single-order mobile results do not fill these gaps.

The owner then reported that opening GT-1045 from Workshop A displayed the generic not-found page, completing the two-direction order-detail route checks with mixed operator/owner evidence. They also reported opening the PDF's link in a signed-out account. Their wording for the status was "en preparacion"; a read-only source check confirmed GT-1045 remains `repairing` and its public message says the controller is being repaired. Do not silently interpret that wording as verified display equality. The exact signed-out status label and absence of contact details, internal notes and photos were not explicitly reconfirmed. The earlier pending signed-out opening and A-to-B route steps are superseded by this report; direct Storage HTTP denial and physical printing remain pending.

Observed copy issue for the product backlog: the generic denied/missing-order page suggests that the order may have been reset. Consider clearer wording that covers an invalid route or missing access without revealing whether another workshop owns the order. No UI change or deployment was made during this exercise.

The owner subsequently clarified that the signed-out customer view displayed **En reparación** and did not show the phone, serial, internal notes or photos. This resolves the wording ambiguity and the pending private-field confirmation above. Record it as owner-reported real browser evidence, not an independent automated HTTP field audit. Direct nonmember photo HTTP denial, phone timing, WhatsApp delivery for GT-1045, failure recovery and physical printing remain pending.

The exact fictional GT-1044 photo passed encrypted PC/USB backup, extraction and private hosted-lab restore with matching SHA-256. Complete database/Auth recovery and independent Vault recovery remain unverified. The first hosted CLI backup attempt stopped with a generic error, without recording its cause. New diagnostics are covered by automated tests; this session does not require another live Vault retry. Keep recovery assigned to the operator and revisit before real customer data.

External email confirmation/password recovery, direct nonmember photo HTTP denial and physical printing still need evidence. Second-account order-detail isolation has mixed operator/owner evidence as recorded above. Plan the next feature branch and PR from session outcomes. Do not mark pending gates complete based on earlier single-account or role-simulation tests.
