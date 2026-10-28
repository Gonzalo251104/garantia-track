# Development environment — 2026-10-28

## Supabase

- Organization: Gonzalo251104's Org. Confirmed plan: free.
- Project: garantiatrack, reference rtfhogdqsxlqfwvzisoo.
- Region: sa-east-1 (Sao Paulo).
- API: https://rtfhogdqsxlqfwvzisoo.supabase.co
- Initial workshop_backend migration applied successfully.
- Persistent receipt migration 20261028212715 applied; Supabase Vault 0.3.1 and pgcrypto 1.3 are installed. Existing hashes/expiry/revocation states were preserved.
- Client configuration is in ignored .env; no privileged key is used or committed.
- The owner created their application account. A fictional QA workshop/order/photo now exist for testing; the assistant did not create a separate account or handle the owner's password.

## Auth dashboard setup

The owner reports that Auth callback URLs are configured, and authenticated application access has been verified. The settings are managed at:

https://supabase.com/dashboard/project/rtfhogdqsxlqfwvzisoo/auth/url-configuration

For local development, the original Site URL was http://127.0.0.1:4173. On publication, replace Site URL with the actual HTTPS deployment origin and add its exact root/recovery callbacks as described in deployment.md. Preserve these local redirect URLs:

- http://127.0.0.1:4173/
- http://127.0.0.1:4173/?auth=recovery

Email confirmation remains enabled. The owner already registered a GarantiaTrack account; a Supabase dashboard account is not automatically an application user. Use your own email and password; never share the password in chat. A custom SMTP service may be necessary for email delivery to users outside the project's team. See supabase-setup.md.

## Verification

Run npm run smoke:supabase for non-destructive live checks: Auth endpoint reachability, unknown tracking token rejection, denied anonymous order reads and denied anonymous photo uploads. This script creates no objects or users.

A transaction with rollback on the live database additionally verified transactional workshop creation, request idempotency, tenant isolation and the tracking allowlist under the actual authenticated/anon roles. The subsequent authenticated browser test passed receipt creation, private photo upload/download, reload persistence, status updates and tracking. A separate anonymous SDK client confirmed field restrictions, private photo denial, rotation and revocation. See qa-supabase.md.

The Supabase security advisor reports intentional SECURITY DEFINER exposure for the tightly granted membership-checked RPCs and the anonymous token-limited tracking RPC. It also notes RLS with no policies on tracking_links, which is deliberately inaccessible through table grants; only functions access it. These are documented design decisions, not a claim of a warning-free security review.

References: [anonymous definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Receipt recovery adds three intentionally member-only SECURITY DEFINER RPCs with fixed search paths, explicit workshop membership and per-order locks. Their authenticated-function advisory findings are expected and reviewed; no anonymous recovery/creation/import grant or direct Vault read was added. Live encrypted lifecycle and membership probes passed with fixture changes rolled back. The advisor also reports pre-existing disabled leaked-password protection; see [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth settings were not changed by this feature.

## GitHub

Remote: https://github.com/Gonzalo251104/garantia-track

- PR #1: prototype -> develop.
- PR #2: Supabase integration -> develop, retargeted after PR #1 merged.
- Both PRs were merged after review corrections and successful CI.
- Application source entered develop through those PRs. The v0.2.0 release enters main through a separate release PR and returns through a backmerge PR.

The terminal Git credential helper could not authenticate. The connected GitHub API uploaded exact local Git blobs and matching source trees; local branch history was aligned to those commits only after tree equality was verified. Original local commits remain reachable through refs/backups/pre-github. No source files were discarded.
