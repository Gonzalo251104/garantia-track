# Pilot readiness runbook

Status: preparation in progress. Do not treat the application as ready for real customer data until the gates below have evidence and an owner. Record outcomes without customer names, phone numbers, tracking tokens, credentials, photos or other personal data in GitHub.

User-reported mobile verification on 2026-10-29: fictional order GT-1044 was received with a test photo; the photo remained visible after reload, a status change succeeded, and customer tracking showed the correct status. Device/browser, multiple status transitions, separate signed-out session and printer test were not confirmed. Previously, the user reported sending the GT-1043 PDF by WhatsApp and opening its correct tracking page via QR. These are distinct tests; the GT-1044 PDF/QR was not reported as tested.

## Mobile acceptance: fictional data only

See [fictional-pilot-session.md](fictional-pilot-session.md) for the latest evidence and the next small sessions. The owner accepted the v0.5.1 active-workshop header and neutral unavailable-order message on a physical phone. Vault CLI work in draft PR #26 is tracked independently.

Record date, device/browser, version and fictional order number. For each step record pass/fail and a concise symptom; do not paste the private tracking URL.

1. Sign in and create a new console or controller order with fictional details and a harmless test photo. Record its number.
2. If upload partially fails, retry from the original intake or use the saved-order photo recovery after that feature's release. After closing/reloading the intake, select the original image again from the saved order. After success, reload and verify the same order/photo without duplicates. See [order-photo-recovery.md](order-photo-recovery.md) for scope, local evidence and release status.
3. Change the status twice, checking each saved state after reload. Open the customer link in a separate browser without a workshop session and verify the correct order and latest status; customer view must not expose photos, contact information or internal notes.
4. Open the receipt, share its PDF to a trusted test recipient, and scan the QR or use the link inside the PDF. Verify the same order and latest state. Reload and confirm the QR still works. Do not renew or revoke the QR during this test.
5. Record device-specific failures. Test paper output and camera scanning separately on the actual thermal printer before relying on it in a workshop.

## Gates before inviting external workshops

See [pilot-photo-access-check.md](pilot-photo-access-check.md) for the latest hosted role/claim checks, anonymous HTTP denials and the remaining actual-session Storage test. These checks do not close every access or readiness gate.

- **Email and recovery:** Verify actual Auth URLs and SMTP configuration in the dashboard. Supabase's default sender is restricted to project-team addresses; configure a verified sender with a suitable SMTP provider and test confirmation and password recovery with an external test account. Do not put SMTP credentials in the repository or chat. Keep email confirmation enabled. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Recovery:** Follow [pilot-recovery.md](pilot-recovery.md) and [independent-backup-plan.md](independent-backup-plan.md). One exact fictional photo passed encrypted PC/USB backup, extraction and hosted-lab restore; complete database/Auth recovery and independent Vault recovery remain unverified. Retain the relevant key for ciphertext backups or verify a separately encrypted logical recovery path. Partial photo evidence is not complete project recovery.
- **Access:** Repeat cross-workshop denial and anonymous tracking allowlist checks against the deployed project with two distinct test accounts. Keep Storage private, avoid privileged browser keys, and review [security advisor notices](https://supabase.com/docs/guides/database/database-linter); see `environment.md` for the existing intentional definer warnings and disabled leaked-password-protection warning. Do not mark a finding resolved without verifying it.
- **Operations:** Assign an operator and support contact; review Supabase and hosting health, quotas and failure logs without recording tokens. Establish manual checks and incident response, including link revocation and rollback to the last known good release. Free projects can pause for inactivity; verify availability expectations with participants. No automated uptime alert is configured by this document.
- **Pilot agreement:** Recruit 2–3 workshops, explain the experimental scope and how to report issues, define data handling and retention/deletion expectations, and agree on a fallback if the service is unavailable. Test with fictional data until the gates above are complete.

## Pilot observations

With permission, observe intake and record time to register a device, number of status questions, failed uploads and whether customers open tracking. Ask what they currently use, what would make them switch, and their willingness to pay. Review after each workshop and choose the next feature from observed friction. Do not promise pricing, availability or automated WhatsApp notifications.

## Release and rollback

Use Gitflow and PRs as described in the repository. Record the deployed version and commit before a pilot session. Static frontend rollback must use a previously saved Site version; additive database migrations require a separate compatibility review. Do not delete or overwrite live data as a rollback shortcut. Recheck login, receipt, tracking and photo access after any deployment.
