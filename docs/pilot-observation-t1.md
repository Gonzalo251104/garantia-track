# First technician observation — GT-1051

Recorded on 2026-11-04, America/Lima. Source: the project owner's report of a participating console/controller technician, not direct agent observation or a performance trace. The technician used a physical iPhone 15 with Safari and completed fictional reception GT-1051 with a photo **without assistance**. Safari/iOS versions, workshop label and measured timings were not provided. The public baseline checked during this report was v0.6.0 / `e750525222a7ff8a58dd882fce14070484d7944a`; the technician's device version was not independently read.

## Findings and code inspection

| Report | Attribution and current evidence | Follow-up |
| --- | --- | --- |
| Could not tell whether registration succeeded or a confirmation email was sent | Technician feedback relayed by owner. Code has a small `auth-info` hint after a successful no-session signup; therefore feedback exists but was not discoverable enough. Actual account creation and email delivery were not independently established. | Selected first improvement: a dedicated, readable next-step screen. |
| Cannot rename the workshop; mobile Taller appears to do nothing | Technician feedback. Code inspection confirms connected Taller points to `/orders`; there is no workshop settings route or rename UI. | Next navigation/settings candidate; define member permissions before adding a rename operation. |
| Wants to enlarge an uploaded photo by tapping it | Technician request. Gallery renders thumbnails without an enlargement action. | Candidate accessible private-photo viewer; preserve session/view guards and signed-URL expiry. |
| Phone felt slow when changing screens | Technician report clarified by owner: navigation, not specifically photo upload. No timing, memory profile or network trace. | Code shows each connected render replaces the page with a connection screen, reads the workshop and reloads up to 500 orders. This is a plausible contributor, not proof of device CPU/memory slowness. Measure before claiming a fix. |
| Connecting screen appears between Orders, Reception and Taller | Owner observation, consistent with the unconditional loading screen in `render()`. | Investigate narrower route data loading and stable navigation feedback without weakening server authorization. |
| Wants an Other equipment option | Technician request; current focus remains consoles/controllers. | Deferred until concrete recurring equipment examples justify domain/schema expansion. |
| Many annotations use small text | Owner report; specific labels/screens not yet identified. Code includes 10–12 px helper/navigation text. | Improve the selected confirmation screen now; identify exact remaining examples before a broader typography change. |

## Completed workflow — owner-relayed results

After the initial feedback, the owner relayed these additional outcomes from the same technician/session. Each task was completed without assistance. These are physical-device observations reported by the owner, not direct agent verification or database/HTTP assertions.

| Task | Reported outcome |
| --- | --- |
| Reopen GT-1051 and reload | Found the order without help; the uploaded photo remained visible. |
| Save diagnosing and separate messages, then reload | Status, internal note and public message persisted; the technician understood which message was internal and which was customer-facing. |
| Change to repairing and prepare the receipt PDF | Completed without help; the PDF was easy to prepare. |
| Open customer tracking in a private browser | Displayed GT-1051 in repairing with the public message, without internal data or photos. The owner summarized the result without separately listing contact/serial exclusions; no capability or screenshot was shared. |

The core observed workflow is complete. The earlier desktop hypothesis that first-time QR/PDF preparation might be confusing was not supported by this technician's report; keep that distinct from the registration/navigation complaints. Do not infer WhatsApp delivery, camera scanning of a QR, original-link expiry invariance after reprinting, physical printing, timed performance or failed-upload recovery from these results.

Debrief on the technician's current process, intention to use the product on the next repair and single largest obstacle is pending. No price acceptance, repeated-use outcome, market fit or authenticated cross-workshop photo HTTP result is established.

## First improvement decision

- Problem: the technician finished registration but could not identify its outcome/next step.
- Evidence: one independent technician's feedback relayed by the owner; not yet repeated across participants.
- Change: replace the small no-session success hint with a dedicated confirmation view, focus its heading, explain checking email/confirming/signing in, and provide sign-in and different-email actions. Use readable body text and touch targets.
- Safety: show the same neutral guidance for a new or obfuscated existing account. An SDK success is not proof of email delivery. Preserve required confirmation, PKCE callbacks, provider error handling and the existing returned-session path. Discard results if the originating form is no longer current.
- Acceptance: a successful no-session signup displays the next step instead of the cleared form; provider failures stay errors; a late response does not replace another view. Reobserve comprehension on the phone after an approved release. Local automated/desktop checks do not certify external SMTP or physical Safari acceptance.
- Deferred alternatives: navigation/loading and the misleading Taller destination are the next candidates because they recur during daily use. Enlarged photos, Other equipment and broad typography changes are separate scopes. Do not add all requests to this first change.

Implementation is prepared on `feature/registration-confirmation` for review into develop. It is not published until the normal release, deployment and backmerge flow completes. The owner-deferred photo HTTP exercise and other real-data readiness gates remain unchanged.

## Prepared change validation

Lint, syntax checks, all 66 tests and build passed. Three existing loopback HTTP tests initially failed with sandbox `EACCES`; the suite passed after granting loopback access, without changing those tests. Four new tests cover neutral guidance for new/obfuscated accounts, original request/returned-session handling, provider failures and stale responses.

A temporary isolated loopback service exercised the actual app and bundled SDK with synthetic successful no-session signup responses. The confirmation heading received focus; keyboard Tab reached the sign-in action; both sign-in and different-email actions returned to their expected forms. Inspected 320/390/900 px desktop-browser viewports had no horizontal overflow, confirmation body text was 16 px and action targets were at least 48 px high. Temporary viewport overrides were reset. The service created no real account and sent no email; it is a UI/HTTP contract check, not hosted Auth, external email or physical Safari acceptance. The private test fixture is excluded from the product package and Git.
