# Controlled fictional pilot session

Purpose: validate the daily workshop flow and identify the next product improvement. Use fictional data. External onboarding and real-customer readiness remain gated by [pilot-runbook.md](pilot-runbook.md).

## Preparation

- Record date, published app version/commit, phone/browser, operator and observer. The recovery CLI does not change the deployed app; use the existing published release for this exercise.
- Use two distinct test accounts, each in its own fictional workshop: Workshop A and Workshop B. Two members of the same workshop do not test tenant separation. Use team-authorized test addresses while default SMTP restrictions remain. If the second account cannot confirm email, record onboarding as blocked; keep email confirmation enabled.
- Use invented customer/device details, an authorized test phone number and a harmless photo with no personal information. Share the PDF only with a consenting test recipient. Keep bearer URLs, sessions and signed photo links out of Git, screenshots and reports.
- Use separate browser profiles for the two workshops and a signed-out customer browser. Record unavailable equipment, including the thermal printer.

## Daily flow

1. Workshop A receives one fictional controller with accessories, condition and reported fault. Time intake, attach the test photo and record the generated order number.
2. Reload on the phone; confirm order data and photo persist. If upload fails, retry from the existing order and check no duplicate order is created.
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
| Two independent workshops can sign in | pending | |
| Timed phone intake and photo persistence | pending | |
| Status changes survive reload | pending | |
| Signed-out customer sees latest status | pending | |
| PDF share and original QR survive receipt reload | pending | |
| Cross-workshop reads are denied both ways | pending | |
| Input and connectivity failures have usable recovery | pending | |
| Physical print and QR scan | pending | |

Measure intake time, failed uploads, duplicates and steps requiring help. Ask which step is confusing and whether this would replace the workshop's current process. Choose one improvement from observed friction. A tenant-isolation failure stops the session and requires a fix.

## Open readiness tasks

The exact fictional GT-1044 photo passed encrypted PC/USB backup, extraction and private hosted-lab restore with matching SHA-256. Complete database/Auth recovery and independent Vault recovery remain unverified. The first hosted CLI backup attempt stopped with a generic error, without recording its cause. New diagnostics are covered by automated tests; this session does not require another live Vault retry. Keep recovery assigned to the operator and revisit before real customer data.

External email confirmation/password recovery, second-account HTTP isolation and physical printing still need evidence. Plan the next feature branch and PR from session outcomes. Do not mark pending gates complete based on earlier single-account or role-simulation tests.
