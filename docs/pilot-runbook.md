# Pilot readiness runbook

The published application can be shown with fictional data. The gates below apply before onboarding external workshops or entering real customer records.

## Fictional workflow checklist

Use a dedicated test workshop or the local fixture. Record the version, browser and fictional order reference with a concise result. Keep customer details, photos, session information and tracking tokens out of the report.

1. Check the empty state, navigation, labeled inputs and keyboard access. At a narrow viewport, confirm the intake, order and tracking screens fit without horizontal overflow.
2. Submit invalid input and confirm the order stays unsaved. Receive a fictional device with a harmless photo, reload and verify that the saved order and photo persist. For a partial upload, follow the [photo retry guide](order-photo-recovery.md).
3. Check search with no matches. Save a status and a customer-facing message, then check the tracking timeline in a signed-out browser. Confirm private fields and photos are absent. Check the unavailable-link screen with a fictional invalid link.
4. Check the receipt and PDF for the intended order and confirm the print view excludes editing controls. Verify printer output and camera scanning separately if physical printing is offered.

See the [dated fictional exercise record](fictional-pilot-session.md) and [GT-1051 observation](pilot-observation-t1.md) for prior evidence.

## Gates before inviting external workshops

See [pilot-photo-access-check.md](pilot-photo-access-check.md) for the latest hosted role/claim checks, anonymous HTTP denials and the remaining actual-session Storage test. These checks do not close every access or readiness gate.

- **Email and recovery:** Verify actual Auth URLs and SMTP configuration in the dashboard. Supabase's default sender is restricted to project-team addresses; configure a verified sender with a suitable SMTP provider and test confirmation and password recovery with an external test account. Do not put SMTP credentials in the repository or chat. Keep email confirmation enabled. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Recovery:** Follow [pilot-recovery.md](pilot-recovery.md) and [independent-backup-plan.md](independent-backup-plan.md). One exact fictional photo was restored to the hosted lab. A later isolated restore verified a fictional order, Auth, Vault and three photos. The corrected USB replay and full operational recovery remain pending.
- **Access:** Repeat cross-workshop denial and anonymous tracking allowlist checks against the deployed project with two distinct test accounts. Keep Storage private, avoid privileged browser keys, and review [security advisor notices](https://supabase.com/docs/guides/database/database-linter); see `environment.md` for the existing intentional definer warnings and disabled leaked-password-protection warning. Do not mark a finding resolved without verifying it.
- **Operations:** Assign an operator and support contact; review Supabase and hosting health, quotas and failure logs without recording tokens. Establish manual checks and incident response, including link revocation and rollback to the last known good release. Free projects can pause for inactivity; verify availability expectations with participants. No automated uptime alert is configured by this document.
- **Pilot agreement:** Recruit 2–3 workshops, explain the experimental scope and how to report issues, define data handling and retention/deletion expectations, and agree on a fallback if the service is unavailable. Test with fictional data until the gates above are complete.

## Release and rollback

Record the deployed version before a technical check. Follow the [release and rollback guide](deployment.md) for Pages and the original Sites origin. The owner deferred further sessions with technicians. The available observation came from a test user.
