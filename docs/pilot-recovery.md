# Pilot recovery procedure

Status: **complete recovery has not been verified**. This is a plan for a small pilot, not evidence of a usable hosted-project backup. Assign an operator and agree on an encrypted, access-controlled backup location and retention before collecting real data. Use fictional records during drills.

## Local rehearsal on 2026-10-29

An isolated local Supabase stack applied both project migrations. A local fictional user created an order, private JPEG and Vault-backed tracking link. The Storage API returned the original image bytes, which were copied separately. No hosted project data or credentials were used.

A raw full PostgreSQL dump failed to restore an internal Realtime function because the local `postgres` role could not set `log_min_messages`. A schema-scoped dump restored the fictional order and photo metadata in a separate local database, but its Vault data restore failed with permission denied on `vault.secrets`; the tracking-link foreign key therefore could not be restored. This was a **partial restore**, not a successful recovery of the tracking link or photo object in a destination service.

The official CLI produced local roles, schema and data dumps. Inspection found the order and Auth/Storage metadata in its data dump but no `vault.secrets` entries. The independent JPEG copy matched the original bytes. These observations are specific to this local CLI/version and configuration; do not rely on those files alone for Vault recovery. The provider documents why raw PostgreSQL dumps can include unsupported internal objects and prescribes a filtered CLI process. A separate provider-compatible Vault and Storage recovery drill remains required.

The test files contain fictional data and a fictional token and remain outside the repository. No restore was attempted against the hosted database.

## Two-instance local rehearsal on 2026-10-29

Two separately initialized Supabase CLI 2.122.0 instances were run on loopback-only Docker networks, with the application's migrations applied to each. The source contained the fictional order and JPEG created in the earlier rehearsal; the destination started with no Vault secrets. The destination is an independent local stack, not a hosted project.

The official CLI exported source `auth` and `public` data; it did not include Vault secrets or Storage object bytes. A separate data-only dump of the fictional `vault.secrets` table was restored using `supabase_admin` **inside the local containers**. This required local superuser access: the hosted `postgres` role and the ordinary CLI dump must not be assumed to provide the same capability. The destination used the local development configuration; no root-key export, transfer, rotation or recovery from a lost key was exercised. The copied encrypted secret decrypted successfully in this specific local setup, and its hash matched the restored tracking row.

The Auth/application data dump was imported into the initialized destination in a transaction with triggers temporarily disabled by the local administrator, following the provider's documented restore pattern. The fixture JPEG was then uploaded separately through the destination Storage API. A fictional workshop member signed in and recovered the same tracking token and original expiration; an anonymous client retrieved the expected order through that token. The downloaded private JPEG matched its original SHA-256. Anonymous and a second fictional workshop were denied the photo; the second workshop was also denied the order and receipt token. No production records, keys, credentials or tracking URLs were copied.

**Limit:** This demonstrates a local two-stack recovery of one fictional order, ciphertext and object, not a supported backup of the hosted Free project. In particular, the local `supabase_admin` operation and compatible development keys do not demonstrate hosted Vault-table export, root-key portability to a different hosted project, future recovery after source loss, complete Storage migration or a tested production backup schedule. The hosted pilot remains gated on a supported method and an isolated end-to-end hosted restore. See [Supabase's CLI migration guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) and [Vault key portability](https://supabase.com/docs/guides/database/vault).

## Hosted recovery lab — 2026-10-29

The isolated destination `garantiatrack-recovery-lab` (project `rtmswfvohwlklnswisst`, region `sa-east-1`) was created in the owner's existing Free organization. It is independent of the production project `rtfhogdqsxlqfwvzisoo`. Both application migrations were applied through the provider connector; their destination migration-history versions are `20261029155303` and `20261029155308`, which differ from the source filenames and must be reconciled before any CLI migration push. Never run a blind migration push against this destination.

The destination `repair-photos` bucket was verified private with the expected JPEG/2 MiB limits. Live anonymous smoke checks denied order reads, unreserved photo uploads and receipt token recovery/creation/import. A rolled-back fictional Vault probe confirmed encryption and decryption in the destination; it did not copy a source secret or key. The security advisor reports the same intentionally exposed, membership-checked RPC and token-limited public tracking warnings as the existing application; those require continued review, not blanket dismissal.

No source data, Vault secrets, root key, photo objects or application accounts have been copied to the destination yet. The connector's destination `postgres` role can read but cannot insert into `vault.secrets`; the local `supabase_admin` method is not available through this connection. The owner authenticated the CLI and it can list both projects. A request to inspect project API keys was rejected by automated approval review because the command could expose a sensitive service key; do not work around that decision. A provider-supported key/secret and Storage transfer method remains needed before the hosted restore can be attempted. Do not paste any access token, database password, service key or tracking URL into chat or Git. A successful hosted restore and recovery after loss remain unverified; keep real customer data out of the pilot.

The owner later reported downloading and opening one fictional photo. A read-only check confirmed that fictional order GT-1044 has one ready photo with a matching Storage object, and an active tracking record with a Vault reference. Before a destination upload, the lab was checked to contain zero orders, Storage objects and Vault secrets; its photo bucket remained private. This confirms the source records and the user's manual download, not a matching checksum, restored object, restored order or recovered QR. The outstanding review rejection remains in effect, and a provider-supported Vault restoration procedure is still unverified.

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
