# Product review and next steps

## Current deployment

The public static application is hosted on OpenAI Sites at https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site. Supabase provides authentication, PostgreSQL, private photo storage and Vault for recoverable tracking capabilities. The local development server binds to loopback. See `deployment.md` and `supabase-setup.md` for configuration and release steps.

## Users and flows

- Workshop members sign in, create a workshop, receive consoles or controllers, upload intake photos and manage order status, quotes and notes. Membership enforcement is server-side; staff provisioning is currently administrative.
- Customers need no account: a private capability URL or QR shows a limited tracking view. The link expires after 30 days and may be explicitly renewed or revoked.
- Workshop members print 58 mm or 80 mm intake tickets. The active QR survives reloads and reprints. Older QR links can be imported once using the original URL. PDF sharing uses the device share sheet or manual download and attachment; WhatsApp text sharing opens a prefilled message. The user selects the recipient and sends manually.
- Demo users can explore fictional local data without a shared QR. Demo and connected records are separate.

See [pilot-runbook.md](pilot-runbook.md) for concrete acceptance steps, outstanding operational gates and a workshop observation plan.

## Priorities before broader launch

### Supervised fictional observation

The existing flow can support a guided observation with a technician using invented cases in the dedicated test workshop, without real customer records or external self-service onboarding. Start with one or two consenting console/controller workshop operators, a small number of fictional intakes and their usual phone. Record steps needing explanation, photo failures, status questions, ticket handoff and whether they would replace their current process. Owner-operated accounts and technical regression tests do not supply independent market feedback.

### Before operational use with real customers

1. Complete the [actual-session photo access exercise](authenticated-photo-access-guide.md). Anonymous HTTP checks and database role checks have evidence; actual authenticated nonmember HTTP access remains pending.
2. Configure a verified sender/SMTP and test confirmation and password recovery with an external test address. The default Supabase sender is team-restricted. No domain or SMTP provider has been provisioned for this project; do not disable confirmation to work around delivery.
3. Complete an independent database/Auth/Vault and photo backup/restore drill. One exact-photo recovery and known-ticket QR reconstruction are partial evidence, not complete independent project recovery. Keep draft recovery PR #26 separate until verified.
4. Agree on a backup operator/schedule, support contact, quota/availability checks, retention/deletion handling, fallback and rollback. Document manual checks when free tooling lacks automated coverage. No uptime alarm or recovery guarantee is currently established.
5. Test the actual 58/80 mm printer only if paper tickets are part of the agreed pilot. PDF-only observation does not certify thermal printing. Review recipient selection and privacy expectations with the workshop owner.

### Next product work

The first proposed improvement is reattaching pending photos from a saved order after the original intake was closed or reloaded. The current same-form retry works, but that broader recovery is not implemented. Preserve the existing order and tracking capability; let an authorized member select the image again rather than promise a lost in-memory file can be recovered automatically.

Then select one change from workshop observations. Candidate needs are technician invitations/roles when multiple people operate the workshop, customer quote approval, and warranty/re-entry history. Pagination/search beyond the currently loaded list and cleanup/abuse controls should follow measured use. Keep the simple architecture and existing free hosting until workload justifies a change.

After observed repeated use, test willingness to pay, define a price hypothesis and agree on the support scope before adding billing. Sharing remains a manual WhatsApp handoff; automated notifications are a separate decision with their own service cost and consent requirements.

Use feature branches and pull requests into develop; release branches target main and are merged back into develop. CI checks lint, syntax, tests and build. See the existing release and environment documentation for migration ordering and known security advisor notices.
