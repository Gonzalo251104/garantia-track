# Environment and verification

## Supabase

- Organization: Gonzalo251104's Org. Confirmed plan: free.
- Project: garantiatrack, reference rtfhogdqsxlqfwvzisoo.
- Region: sa-east-1 (Sao Paulo).
- API: https://rtfhogdqsxlqfwvzisoo.supabase.co
- Applied migrations cover the workshop backend, persistent receipt tracking, workshop name settings and the Other device type. See the [versioned migrations](../supabase/migrations).
- Client configuration is in ignored .env; no privileged key is used or committed.
- The owner created their application account. A fictional QA workshop/order/photo now exist for testing; the assistant did not create a separate account or handle the owner's password.

## Hosting and Auth

The November 11 release put v0.10.2 on [Cloudflare Pages](https://garantiatrack.pages.dev/). The original Sites origin remains the Auth Site URL and the tracking destination for issued QR links. The exact root and `?auth=recovery` redirects are configured for Pages, the original Sites origin and the default loopback origin. The [deployment guide](deployment.md) records the publishing and rollback procedure.

Email confirmation remains enabled. A team mailbox delivered a recovery link and returned to the Pages password form. The check ended before a password change. External confirmation and recovery remain pending.

## Verification

Run npm run smoke:supabase for non-destructive live checks: Auth endpoint reachability, unknown tracking token rejection, denied anonymous order reads and denied anonymous photo uploads. This script creates no objects or users.

See the dated integration evidence below and the [photo access record](pilot-photo-access-check.md) for the remaining authenticated cross-workshop Storage check.

The Supabase security advisor reports intentional SECURITY DEFINER exposure for the tightly granted membership-checked RPCs and the anonymous token-limited tracking RPC. It also notes RLS with no policies on tracking_links, which is deliberately inaccessible through table grants; only functions access it. These are documented design decisions, not a claim of a warning-free security review.

References: [anonymous definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Receipt recovery adds three intentionally member-only SECURITY DEFINER RPCs with fixed search paths, explicit workshop membership and per-order locks. Their authenticated-function advisory findings are expected and reviewed; no anonymous recovery/creation/import grant or direct Vault read was added. Live encrypted lifecycle and membership probes passed with fixture changes rolled back. The advisor also reports pre-existing disabled leaked-password protection; see [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth settings were not changed by this feature.

## Historical integration verification — 2026-10-28

A rolled-back hosted SQL exercise checked workshop creation, request idempotency, tenant isolation and the tracking allowlist with database roles. An authenticated browser session on fictional order GT-1042 verified intake, private photo upload and reload, status/message updates and private tracking. An anonymous SDK client checked the tracking projection and denial of access to private photos. Link rotation and revocation were exercised on that fictional order. Password recovery, session expiry and a second physical device were outside that exercise.

See [Gitflow](workflow.md) for current repository operations and the [v0.10.2 release](https://github.com/Gonzalo251104/garantia-track/releases/tag/v0.10.2) for the published build and deployment evidence.
