# Development environment — 2026-10-28

## Supabase

- Organization: Gonzalo251104's Org. Confirmed plan: free.
- Project: garantiatrack, reference rtfhogdqsxlqfwvzisoo.
- Region: sa-east-1 (Sao Paulo).
- API: https://rtfhogdqsxlqfwvzisoo.supabase.co
- Initial workshop_backend migration applied successfully.
- Client configuration is in ignored .env; no privileged key is used or committed.
- No customer data or permanent QA users were inserted.

## Remaining Auth dashboard setup

The connector does not expose Auth URL configuration and the browser dashboard requires the owner's sign-in. Open:

https://supabase.com/dashboard/project/rtfhogdqsxlqfwvzisoo/auth/url-configuration

Set Site URL to http://127.0.0.1:4173 and add these exact redirect URLs:

- http://127.0.0.1:4173/
- http://127.0.0.1:4173/?auth=recovery

Email confirmation remains enabled. Register a separate GarantiaTrack application account from the local login screen; a Supabase dashboard account is not automatically an application user. Use your own email and password; never share the password in chat. A custom SMTP service may be necessary for email delivery to users outside the project's team. See supabase-setup.md.

## Verification

Run npm run smoke:supabase for non-destructive live checks: Auth endpoint reachability, unknown tracking token rejection, denied anonymous order reads and denied anonymous photo uploads. This script creates no objects or users.

A transaction with rollback on the live database additionally verified transactional workshop creation, request idempotency, tenant isolation and the tracking allowlist under the actual authenticated/anon roles. These role-based SQL checks do not replace JWT/login and authenticated upload HTTP tests.

The Supabase security advisor reports intentional SECURITY DEFINER exposure for the tightly granted membership-checked RPCs and the anonymous token-limited tracking RPC. It also notes RLS with no policies on tracking_links, which is deliberately inaccessible through table grants; only functions access it. These are documented design decisions, not a claim of a warning-free security review.

References: [anonymous definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## GitHub

Remote: https://github.com/Gonzalo251104/garantia-track

- PR #1: prototype -> develop.
- Draft PR #2: Supabase integration -> prototype feature branch.
- Initial checks passed on both; PRs remain open and unmerged.
- Permanent branches contain only initialization. No application code was pushed directly to them.

The terminal Git credential helper could not authenticate. The connected GitHub API uploaded exact local Git blobs and matching source trees; local branch history was aligned to those commits only after tree equality was verified. Original local commits remain reachable through refs/backups/pre-github. No source files were discarded.
