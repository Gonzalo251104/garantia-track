# Supervised fictional workshop observation

Prepared on 2026-11-04, America/Lima. Status: ready for owner coordination; no participant contacted, invited or scheduled, and no observation completed. This kit does not close the [real-data readiness gates](pilot-runbook.md).

## Purpose and boundaries

Observe 1–2 consenting console/controller repair technicians, individually, using their usual phone and fictional cases. Learn which step needs explanation and whether the workflow helps their current paper/WhatsApp process. A session with the project owner's two QA accounts remains technical acceptance, not independent demand evidence.

Plan about 25–30 minutes per technician; this is a session budget, not an intake performance target. Discuss the exercise in Spanish and use the existing Spanish interface. Use the current free services, app architecture and existing owner-controlled test workshop. No new feature, paid service, account invitation, pricing commitment or automatic message is required.

## Before the session

- Owner coordinates participation only after explicitly authorizing contact. Label notes T1/T2; keep contact details outside the repository.
- Record the current public version/commit, date/time zone, physical phone model, browser and workshop label. The preparation baseline is v0.6.0 / `e750525222a7ff8a58dd882fce14070484d7944a`; verify it again on the session date.
- The owner deferred the [two-profile photo HTTP exercise](authenticated-photo-access-guide.md) on 2026-11-04. Proceed with this supervised fictional exercise and record authenticated photo HTTP isolation as unverified. Revisit that check when the owner chooses; it remains a separate gate before real-customer use. Never proceed with a known cross-workshop exposure.
- The owner signs in privately to the fictional test workshop and supervises the device. Do not share passwords, create external users, disable email confirmation or give the participant access to a real workshop. If an isolated fictional session cannot be provided, postpone the connected exercise.
- Make the harmless [fixture JPEG](../tests/fixtures/photo-retry.jpg) available locally on the test phone. Do not photograph people, receipts, real serials or customer equipment containing identifiers. Do not upload the phone's personal gallery.
- Use a separate signed-out browser/device for customer tracking. The technician's workshop session stays in its own profile; do not transfer sessions or owner-signed photo URLs.
- Agree who supervises, who records sanitized notes and who handles a problem during this session. Fallback: stop the app task and describe the fictional process on paper. This is not a promise of operational support or disaster recovery.
- Explain the voluntary fictional exercise and ask whether the participant is comfortable continuing. No recording or screenshots are needed. Stop on request; do not publish names or private capabilities.

## Fictional task cards

Use one card per technician. These phone values are form fixtures only: never use them as message recipients. Record the generated order number after saving; do not assume the next number.

| Field | T1: controller | T2: console |
| --- | --- | --- |
| Customer | Fictional Pilot T1 | Fictional Pilot T2 |
| Phone fixture | 900000000 | 900000000 |
| Equipment | DualSense controller | PlayStation 5 Digital console |
| Serial | FICTIONAL-OBS-T1 | FICTIONAL-OBS-T2 |
| Accessories | USB cable | Power cable |
| Condition | Cosmetic scratch, fictional case | Dust on case, fictional case |
| Reported fault | Left stick drifts | Shuts down during play |
| Photo | Harmless fixture JPEG | Harmless fixture JPEG |
| Internal note | Fictional bench check; staff only | Fictional bench check; staff only |
| Public message | Fictional diagnosis in progress | Fictional diagnosis in progress |

## Facilitation sequence

Give each task's goal without pointing at a control. Ask the technician to explain what they expect to happen. If they ask for help, let them describe the uncertainty, then help and mark the task as assisted. Do not let a usability task become a production incident drill.

| Task | Goal given to technician | What to observe |
| --- | --- | --- |
| 1. Current process (3 min) | Describe the last typical console/controller intake without customer details. | Current tool, repeated questions, evidence handling and handoff problem. |
| 2. Receive (7 min) | Register the fictional case with its accessories, condition, fault and one safe photo. | Field interpretation, camera/file selection, required-field guidance, save confidence, requests for help. |
| 3. Return (3 min) | Leave the order, reopen it and reload; find the same photo. | Can they find the order and tell whether the evidence was saved? Record unexpected missing/duplicate data. |
| 4. Update (5 min) | Save diagnosing, then repairing; add the internal note and public message, and reload. | Difference between staff and customer content, save feedback and persistence. |
| 5. Customer handoff (5 min) | Prepare a receipt PDF and show the current repair status to the fictional customer. | Discoverability of QR creation/PDF, manual WhatsApp expectations and signed-out tracking. |
| 6. Debrief (5 min) | Describe the most confusing step and what would make this worth using on the next repair. | Concrete friction and process fit, without suggesting a feature list first. |

For task 5, the owner opens the private tracking capability only in the designated signed-out test browser. Check the same order/latest state and absence of phone, serial, internal note and photos. Keep the link/PDF on the test devices; do not paste it into notes. Downloading a PDF is enough for the default exercise. Sending it requires a separately authorized, consenting recipient; no message is sent by this kit. Do not renew or revoke the QR during the task.

If a partial photo save occurs naturally, observe whether the technician finds **Completar fotos de ingreso** / **Volver a adjuntar foto** and can select the original file again. Record the actual outcome. Do not manufacture a failure by changing production policies or blocking unrelated traffic, and do not repeat a successful task to create a failure. If no failure occurs, recovery discoverability is not observed. Physical thermal printing is optional and remains unverified unless tested with the actual printer/paper and a scanned printed QR.

Stop on suspected cross-workshop exposure, unexpected real records, accidental capability disclosure, duplicate writes or inability to establish the intended workshop. Preserve a sanitized symptom and use the existing [runbook](runbook.md); do not delete records or change security controls to continue.

## Evidence sheet — duplicate for each technician

Participant label: pending. Independent technician: pending. Session date/time zone: pending. Physical phone/browser: pending. Version/commit: pending. Workshop: pending. Fictional order number: pending. Facilitator/support for this session: pending.

| Task | Outcome (unaided / assisted / failed / not observed) | Help requests | Sanitized observed action or hesitation |
| --- | --- | --- | --- |
| Receive and attach photo | not observed | — | |
| Find order and photo after reload | not observed | — | |
| Save two statuses and separate messages | not observed | — | |
| Prepare PDF/customer handoff | not observed | — | |
| Signed-out tracking allowlist | not observed | — | |
| Partial-save recovery, if encountered | not observed | — | |
| Physical print/scan, if included | not observed | — | |

Record observed upload failures, duplicate orders/photos, task abandonment and steps needing explanation. Timing is optional; if useful, measure start-to-success during the same task and label interruptions separately. Do not infer human timing from automated viewport runs. A prepared time budget is not a measured result.

Debrief prompts: What do you use today? Which step was hardest to understand? What would you keep using on your next repair? What single change would remove the largest obstacle? If useful value was demonstrated, ask how they judge whether a tool is worth paying for; record this as stated preference, not a sale or validated price. Do not introduce billing before repeated use.

## Choose exactly one improvement after observation

List at most three observed problems, each tied to a task and T1/T2. Separate an observed failure, participant explanation and facilitator hypothesis. Prefer a repeated blocking/assisted step; with one participant, a severe observed blocker can justify a small change but remains a one-person finding. Security/data-loss failures take priority and stop normal pilot progression.

For similarly important problems, choose the smallest change that lets the technician finish the task independently while preserving membership checks, private immutable photos and original tracking expiry. Existing desktop evidence suggests the first create-QR step is worth observing, but it is a hypothesis, not the selected improvement. Do not preselect invitations, quote approval or warranty history without evidence.

| Decision field | Record after the session |
| --- | --- |
| Observed problem and task | pending |
| Evidence source and frequency | pending |
| Single proposed change | pending |
| Expected user behavior | pending |
| Acceptance check on the same task | pending |
| Scope and risks | pending |
| Deferred alternatives and reason | pending |

Review the decision with the owner, then implement a small feature PR into develop. Any product release follows release PR into main, immutable version/tag, verified Sites deployment and backmerge PR. Reobserve the affected task; do not claim improved conversion or repair speed from a technical test alone.

Retain only sanitized findings in Git. Leave fictional test orders intact until the owner chooses cleanup; retain original QR expiry and confirmed photo immutability. Clear private PDFs/links from shared devices through an authorized cleanup step. SMTP/external password recovery, complete independent database/Auth/Vault/photo recovery, operational backup/support/retention ownership and any promised physical printing remain separate gates before real-customer use.
