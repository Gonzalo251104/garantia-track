# Product review and next steps

## Current deployment

[Cloudflare Pages](https://garantiatrack.pages.dev/) is the main public entry point. The original Sites origin serves issued QR links. See the [deployment guide](deployment.md) for the frontend and Supabase configuration.

## Users and flows

- Workshop members sign in, create a workshop, receive consoles or controllers, upload intake photos and manage order status, quotes and notes. Membership enforcement is server-side; staff provisioning is currently administrative.
- Customers need no account: a private capability URL or QR shows a limited tracking view. The link expires after 30 days and may be explicitly renewed or revoked.
- Workshop members print 58 mm or 80 mm intake tickets. The active QR survives reloads and reprints. Older QR links can be imported once using the original URL. PDF sharing uses the device share sheet or manual download and attachment; WhatsApp text sharing opens a prefilled message. The user selects the recipient and sends manually.
- The local demo requires an explicit development opt-in. The public workspace uses authenticated access.

See [pilot-runbook.md](pilot-runbook.md) for concrete acceptance steps, and outstanding operational gates.

## Priorities before broader launch

### Reported fictional observation

The [GT-1051 record](pilot-observation-t1.md) describes a test user's reported iPhone 15/Safari session. They completed intake with a photo, reload, status and message updates, and PDF/private tracking without assistance. They expressed conditional interest when managing several repairs and asked for simpler status changes. The report establishes no technician validation, repeated use, measured savings or willingness to pay. Further observation sessions are deferred.

### Before operational use with real customers

1. Complete the [actual-session photo access exercise](authenticated-photo-access-guide.md). Anonymous HTTP checks and database role checks have evidence; actual authenticated nonmember HTTP access remains pending.
2. Configure a verified sender/SMTP and test confirmation and password recovery with an external test address. The default Supabase sender is team-restricted. No domain or SMTP provider has been provisioned for this project; do not disable confirmation to work around delivery.
3. Complete an independent database/Auth/Vault and photo backup/restore drill. The isolated laboratory restore verified an order, Auth, Vault and three photos. The corrected USB replay and full operational recovery remain pending. Keep draft recovery PR #26 separate until verified.
4. Agree on a backup operator/schedule, support contact, quota/availability checks, retention/deletion handling, fallback and rollback. Document manual checks when free tooling lacks automated coverage. No uptime alarm or recovery guarantee is currently established.
5. Test the actual 58/80 mm printer only if paper tickets are part of the agreed pilot. PDF-only observation does not certify thermal printing. Review recipient selection and privacy expectations with the workshop owner.

### Published improvements

The fictional session informed the registration confirmation and [independent status editor](order-status-workflow.md) shipped in v0.7.0. The following releases added [workspace navigation improvements](workshop-navigation.md), [workshop settings](workshop-settings.md), the [private photo viewer](order-photo-viewer.md), the [Other equipment option](device-types.md) and [more readable mobile screens](mobile-readability.md).

The [v0.10.2 release](releases/v0.10.2.md) prepared the public presentation in Pages. See the [pilot runbook](pilot-runbook.md) for the operating gates.
