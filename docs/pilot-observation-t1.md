# Fictional test-user observation — GT-1051

Recorded on 2026-11-04, America/Lima. Source: the project owner's report of a test user in a fictional console/controller workflow, not direct agent observation or a performance trace. The participant used a physical iPhone 15 with Safari and completed fictional reception GT-1051 with a photo **without assistance**. Safari/iOS versions, workshop label and measured timings were not provided. The public baseline checked during this report was v0.6.0 / `e750525222a7ff8a58dd882fce14070484d7944a`; the participant's device version was not independently read.

## Findings and code inspection

| Report | Attribution and current evidence | Follow-up |
| --- | --- | --- |
| Could not tell whether registration succeeded or a confirmation email was sent | Test-user feedback relayed by owner. Code has a small `auth-info` hint after a successful no-session signup; therefore feedback exists but was not discoverable enough. Actual account creation and email delivery were not independently established. | Selected first improvement: a dedicated, readable next-step screen. |
| Cannot rename the workshop; mobile Taller appears to do nothing | Test-user feedback. Code inspection confirms connected Taller points to `/orders`; there is no workshop settings route or rename UI. | Next navigation/settings candidate; define member permissions before adding a rename operation. |
| Wants to enlarge an uploaded photo by tapping it | Test-user request. Gallery renders thumbnails without an enlargement action. | Candidate accessible private-photo viewer; preserve session/view guards and signed-URL expiry. |
| Phone felt slow when changing screens | Test-user report clarified by owner: navigation, not specifically photo upload. No timing, memory profile or network trace. | Code shows each connected render replaces the page with a connection screen, reads the workshop and reloads up to 500 orders. This is a plausible contributor, not proof of device CPU/memory slowness. Measure before claiming a fix. |
| Connecting screen appears between Orders, Reception and Taller | Owner observation, consistent with the unconditional loading screen in `render()`. | Investigate narrower route data loading and stable navigation feedback without weakening server authorization. |
| Wants an Other equipment option | Test-user request; current focus remains consoles/controllers. | Initially deferred. The [Other option](device-types.md) shipped in v0.10.0. |
| Many annotations use small text | Owner report; specific labels/screens not yet identified. Code includes 10–12 px helper/navigation text. | Improve the selected confirmation screen now; identify exact remaining examples before a broader typography change. |

## Completed workflow — owner-relayed results

After the initial feedback, the owner relayed these additional outcomes from the same participant/session. Each task was completed without assistance. These are physical-device observations reported by the owner, not direct agent verification or database/HTTP assertions.

| Task | Reported outcome |
| --- | --- |
| Reopen GT-1051 and reload | Found the order without help; the uploaded photo remained visible. |
| Save diagnosing and separate messages, then reload | Status, internal note and public message persisted; the participant understood which message was internal and which was customer-facing. |
| Change to repairing and prepare the receipt PDF | Completed without help; the PDF was easy to prepare. |
| Open customer tracking in a private browser | Displayed GT-1051 in repairing with the public message, without internal data or photos. The owner summarized the result without separately listing contact/serial exclusions; no capability or screenshot was shared. |

The core observed workflow is complete. The earlier desktop hypothesis that first-time QR/PDF preparation might be confusing was not supported by this participant's report; keep that distinct from the registration/navigation complaints. Do not infer WhatsApp delivery, camera scanning of a QR, original-link expiry invariance after reprinting, physical printing, timed performance or failed-upload recovery from these results.

## Debrief and next product hypothesis

The owner relayed the participant's closing answers:

- Current process: Excel and/or handwritten notes.
- Intention to use: yes, provided there are several repair orders to manage. This is conditional stated interest, not a commitment to adopt, repeat use or pay. No useful workload threshold was specified.
- Largest desired change: make changing an equipment's repair status easier, possibly with fewer types of status. In the follow-up, the participant named four daily stages: Recibido, En reparación, Listo para entregar, Entregado.

| Participant's proposed label | Existing stored value | Current application label |
| --- | --- | --- |
| Recibido | `received` | Recibido |
| En reparación | `repairing` | En reparación |
| Listo para entregar | `ready` | Listo para recoger |
| Entregado | `delivered` | Entregado |

These labels map to existing values; this participant's preference does not establish that diagnosing or approval are unnecessary for every workshop. No account or data migration is implied. The ready-stage wording can be tested separately for participant/customer comprehension.

The reported flow was completed without assistance, but the participant still identified repeated status work as the largest obstacle. That report informed the independent status editor.

At the time of the observation, changing only the status used the full repair update form alongside quote, internal note and public message. Six statuses are shared by the interface, stored orders/events and customer tracking. The existing update RPC preserves membership checks, version checks and transactional events; do not bypass it or remove stored states based on one tentative suggestion.

The original proposal was to make the current status and an explicit status-change action prominent near the order heading, with a clear save result. Offer the four reported daily stages as primary options and keep diagnosing/approval in additional options. Preserve visibility of any current additional state, historical records, unsaved quote/message/note edits and the existing server checks. No stored state is deleted or silently remapped. This hypothesis does not impose a mandatory transition sequence or automatically notify customers.

The proposed acceptance criteria covered finding the status, seeing confirmation and verifying persistence after reload and in tracking. This exercise established no timings.

The first session's workflow and closing interview are complete. No price acceptance, repeated-use outcome, market fit or authenticated cross-workshop photo HTTP result is established. Further observation is deferred. The participant was a test user. The session did not validate use by working technicians.

## First improvement decision

- Problem: the participant finished registration but could not identify its outcome/next step.
- Evidence: one test user's feedback relayed by the owner; not yet repeated across participants.
- Change: replace the small no-session success hint with a dedicated confirmation view, focus its heading, explain checking email/confirming/signing in, and provide sign-in and different-email actions. Use readable body text and touch targets.
- Safety: show the same neutral guidance for a new or obfuscated existing account. An SDK success is not proof of email delivery. Preserve required confirmation, PKCE callbacks, provider error handling and the existing returned-session path. Discard results if the originating form is no longer current.
- Acceptance: a successful no-session signup displays the next step instead of the cleared form; provider failures stay errors; a late response does not replace another view. Local automated/desktop checks do not certify external SMTP or physical Safari acceptance.
- Deferred alternatives: the closing debrief prioritizes easier daily status changes as the next product hypothesis. Navigation/loading and the misleading Taller destination remain confirmed friction candidates. Enlarged photos, Other equipment and broad typography changes are separate scopes. Do not add all requests to this first change.

The registration implementation was merged through PR #43 into develop on 2026-11-04 at `596d5e1eb0439019765c129ba46cdf3713616471`. The owner then authorized the separate [status-change implementation](order-status-workflow.md), merged through PR #44 at `fede8751cf24b3c50ff68823b0382b1860adaa46`. Both changes shipped in v0.7.0. The owner-deferred photo HTTP exercise and other real-data readiness gates remain unchanged.

## Prepared change validation

Lint, syntax checks, all 66 tests and build passed. Three existing loopback HTTP tests initially failed with sandbox `EACCES`; the suite passed after granting loopback access, without changing those tests. Four new tests cover neutral guidance for new/obfuscated accounts, original request/returned-session handling, provider failures and stale responses.

A temporary isolated loopback service exercised the actual app and bundled SDK with synthetic successful no-session signup responses. The confirmation heading received focus; keyboard Tab reached the sign-in action; both sign-in and different-email actions returned to their expected forms. Inspected 320/390/900 px desktop-browser viewports had no horizontal overflow, confirmation body text was 16 px and action targets were at least 48 px high. Temporary viewport overrides were reset. The service created no real account and sent no email; it is a UI/HTTP contract check, not hosted Auth, external email or physical Safari acceptance. The private test fixture is excluded from the product package and Git.
