# Pilot recovery procedure

Status: **not yet implemented or tested**. This is a plan for a small pilot, not evidence of a usable backup. Assign an operator and agree on an encrypted, access-controlled backup location and retention before collecting real data. Use fictional records during the first drill.

## What must be recoverable

1. Database schema, order data, workshop memberships, Auth users and migration history.
2. Original `repair-photos` objects and private bucket configuration. Database backups contain object metadata, not the image files.
3. Vault root encryption key, so encrypted receipt links can be recovered. Treat the key, database dump and photos as sensitive; keep them out of Git, CI output and chat. Losing the key means existing encrypted receipt tokens may not be recoverable.
4. Auth redirect and SMTP configuration, public frontend configuration, Site deployment/version and the release commit. Do not store private credentials in this record.

## Free-plan preparation

- Supabase does not offer downloadable dashboard backups on the Free plan. Use its documented CLI logical backup procedure if available for the project, and verify whether the necessary local tools and connection method work in the operator's environment. Never paste connection strings, passwords or access tokens into chat, source files or command arguments that may be recorded in logs.
- Copy Storage objects separately using the provider's documented migration method. Do not make the photo bucket public. Record object counts and checksums in a private operator-controlled location, not in the repository. Confirm the method copies object contents as well as metadata.
- The documented logical dump/restore to a new project does not automatically preserve the Vault root key. Supabase documents a separate key-copy operation between active projects. This is a privileged operation: perform it only into an isolated test project, protect the key, and confirm the destination's own encrypted data will not be lost. Do not rotate or replace the live project's key. Availability and cost of a separate project must be checked before creation.
- The provider's restore-to-new-project and branching workflows can carry the key automatically, but still require separate Storage objects and configuration. Verify plan eligibility and cost before using either. Do not claim that a project can be recovered after deletion or loss of its source key without testing a supported key-retention path.

## Restore drill with fictional data

1. Note source version, migrations, backup time and the ID of a fictional order. Create or select an isolated destination only after checking its organization and any cost; never restore over the live project.
2. Follow the current provider instructions to restore database and Auth data, preserve the appropriate Vault key and restore the private photo bucket and its objects. Reapply required Auth, API and application configuration separately, with redirects restricted to the test environment.
3. Sign in as the fictional test workshop user, open its order and photo, and verify other workshops cannot access them. Verify an existing test tracking QR still opens the correct order and that the authenticated receipt retrieves the same link. Avoid placing bearer URLs or secrets in the report.
4. Record date, operator, duration, version, checks performed, failures and whether the recovery objective was met. Secure or remove the isolated test environment and its copies according to the agreed retention plan. A successful dump alone is not a successful restore.
5. Review frequency and alerting after the drill. Until a restore and private photo recovery pass, keep real customer data out of the pilot.

References: [Supabase database backups](https://supabase.com/docs/guides/platform/backups), [backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Vault key portability](https://supabase.com/docs/guides/database/vault), [restore to a new project](https://supabase.com/docs/guides/platform/clone-project).
