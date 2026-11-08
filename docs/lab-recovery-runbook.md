# Laboratory recovery operator workflow

Use only the `feature/logical-vault-recovery` draft branch or its versioned source kit. Do not run the legacy production-scoped `vault.mjs backup` command. This workflow has a fixed laboratory source; restore has no hosted destination, project argument, connection URL or source login requirement. It does not deploy an application or migrate production.

Requirements: Node 22+; Docker Desktop running; the four exact image digests listed in `scripts/recovery/lab-runtime.mjs` cached locally. Images are never pulled implicitly. The operator must provision the reviewed images in advance. No `npm install`, Supabase login, project API key or browser session is required to restore from the retained source kit.

## Inspect and restore an existing trusted archive

Keep the archive and reports outside any checkout, with a private report directory already created. Inspect verifies the envelope size/header and computes SHA-256; it does **not** prove decryption or recovery:

```powershell
node scripts/recovery/lab.mjs inspect 'E:\your-recovery-set\laboratory-complete.gtlab'
node scripts/recovery/lab.mjs restore 'E:\your-recovery-set\laboratory-complete.gtlab' 'C:\your-private-reports'
```

Enter the retained passphrase at the hidden terminal prompt, never in arguments, an environment variable, a file or chat. The passphrase is distinct from the account password. JavaScript cannot guarantee erasure of strings from process memory. Use a trusted terminal without recording. The archive authenticates native SQL and contains Auth data, tracking capabilities and photos: restore only a trusted operator-produced archive.

Every run authenticates the archive before creating any container, requires the laboratory source and complete-photo format, creates a fresh empty PostgreSQL container with network `none`, and starts only its own private Auth/PostgREST/Storage peers. PID 1 must be the final PostgreSQL executable (including the pinned image's `.postgres-wrapp` process name) before import: `pg_isready` alone can succeed during the image's temporary initialization server. No ports or host directories are shared. All images are pinned by digest, IDs are captured from creation, and identity/labels/image/network/mounts are checked before database execution and cleanup. Existing containers are never adopted or overwritten. The SQL import is atomic, rejects psql host-command escapes, restores the `private` schema and omitted managed table data, creates fresh destination Vault entries and checks row fingerprints and logical hashes. It does not copy source role passwords or the Vault root key.

File bytes and MIME/cache attributes are restored through the official file backend on the container's writable layer; tmpfs does not support its required xattrs in the tested environment. The database data directory remains tmpfs. Real HTTP checks verify all photo hashes, a new Auth-issued local session for a confirmed restored workshop member, accessible order count, active original receipt/QR capability, an allowlisted public tracking projection, owner photo download/signing and anonymous rejection. This acceptance fixture needs an active tracking link and a ready photo; an expired link is not renewed to make a test pass. The technical Auth session uses a local admin-generated verification challenge, sends no email, leaves confirmation enabled and does not prove the original password.

A random, exclusively created JSON report records safe stages, summary counts, archive SHA-256 and cleanup results. It omits source values, credentials, sessions, filenames, object paths and signed URLs. Ordinary success or failure removes only the containers created by that invocation; a failed identity check leaves a cleanup warning instead of deleting an unverified container. A forced process termination or machine crash may interrupt cleanup: inspect the session-labelled containers manually before removing them. No automatic retry, status-marker reuse or retained background passphrase coordinator is needed.

## Prepare an external USB copy

First package the **committed** reviewed code. Only tracked recovery source and documentation enter this kit; do not include `.env`, download manifests, backups, Docker configuration or runtime directories:

```powershell
git archive --format=zip --output='C:\your-private-folder\recovery-tools-COMMIT.zip' COMMIT package.json scripts/recovery docs/lab-recovery-runbook.md docs/independent-lab-recovery-2026-11-07.md
node scripts/recovery/lab.mjs copy-external 'C:\your-private-folder\laboratory-complete.gtlab' EXPECTED_ARCHIVE_SHA256 'C:\your-private-folder\recovery-tools-COMMIT.zip' 'E:\'
```

`copy-external` is Windows-only. It checks that the destination is USB and physically distinct from both source files, verifies the expected archive hash, creates a new recovery-set directory, writes only ciphertext and the source ZIP using exclusive creation, flushes each file, reads it back and compares SHA-256. It never merges or overwrites an existing recovery set. `copy-manifest.json` records hashes and explicitly leaves decrypted integrity unverified until restoration. A copy failure can leave an incomplete new directory; do not treat it as a verified set. Retain the passphrase separately. exFAT does not provide NTFS ACL protection, so no plaintext backup, account credential or passphrase belongs on that USB.

To repeat independently, extract the tools ZIP into a new `tools` subdirectory in that recovery set, change into it, and run `restore` with the archive **on the USB** and an existing private report folder on the PC. This uses the USB's versioned scripts and ciphertext; no original capture coordinator or source project is needed. A verified connected USB copy is not yet an off-site retention policy, a physical reinsert test or protection from losing the passphrase.

## Capture a future laboratory archive

This is a separate explicit mode, not a restore dependency. It uses Supabase CLI **3.0.0** and only the fixed laboratory reference. Run `--help` first as required by the versioned adapter. Do not substitute production or retrieve secret API keys. Photos must be downloaded through an already authorized owner channel and mapped locally in a private manifest outside Git:

```json
{"photos":[{"bucket":"repair-photos","name":"fictional-workshop/fictional-order/photo.jpg","file":"C:\\private\\photo.jpg"}]}
```

```powershell
node scripts/recovery/lab.mjs capture 'C:\your-private-folder\new-laboratory.gtlab' 'C:\path-to-pinned-cli\supabase.exe' 'C:\private\photo-manifest.json'
```

The hidden prompts create and confirm a new passphrase. Native roles/schema/data dumps include `private`, Auth and Storage; omitted managed tables are supplemented. Referenced logical Vault values are fixed SELECT results captured only in memory, never secret SQL input parameters on the hosted source. Unreferenced Vault secrets fail this scoped format rather than being silently omitted. All source table fingerprints must agree before/after capture; this detects changes but is not one globally locked snapshot across CLI connections. Quiesce the small fictional lab during capture. The adapter never grants logging privileges or changes source logging settings. Each mapped photo must match the source inventory and byte length; comparable single-part MD5 ETags are checked, while multipart/non-MD5 ETags are not claimed as cryptographic proofs. The archive records a SHA-256 of the captured bytes. Only authenticated ciphertext is persisted, with no overwrite.

The consolidated capture adapter has unit coverage for managed-table omissions and changed-source rejection; the historical live capture was executed with the predecessor runner. Do not claim a new live hosted capture merely because the refactored offline restore passed.

## Acceptance limits

PR #26 stays a draft until its old baseline is reconciled with develop and integration CI passes. Independent branch CI validates its standalone head only. Original-password login remains deferred by the owner. Browser acceptance, real two-workshop source-session evidence, external email delivery, production-scale restore, managed-service configuration and backup ownership/retention targets remain separate gates. See the dated rehearsal reports for actual evidence; a successful small lab exercise does not establish full production recovery readiness.

References: [Supabase restore to self-hosted](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [CLI v3 targeting rules](https://supabase.com/changelog/supabase-cli-v3).
