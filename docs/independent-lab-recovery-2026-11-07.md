# Independent laboratory recovery rehearsal

Date: 2026-11-07, America/Lima. Status: technical laboratory rehearsal passed with the limits below. PR #26 remains a draft; no production backup, database mutation, migration or application deployment was performed.

## Scope and historical failure diagnosis

Work ran from `feature/logical-vault-recovery` in an isolated local worktree. Its application baseline is older than current develop; passing checks on this branch are not release acceptance. The original first backup failure had no retained stage or error code, so its historical cause remains unknown.

GitHub reports merge conflicts with develop, which prevents `pull_request` workflows from starting. The separate `Recovery branch CI` workflow runs only on pushes to this draft branch, with read-only repository permissions and the same lint/syntax/test/build commands. It validates the standalone head; it neither replaces integration CI nor changes branch protection or review requirements.

A metadata-only inspection of the hosted laboratory found normal parameter logging unlimited, error-parameter logging disabled, and no permission for the hosted role to change either setting. The legacy direct-PostgreSQL CLI therefore cannot satisfy its privacy precondition in that session. The new preflight reports `PRIVACY_PERMISSION` before any secret export. This is a current reproducible precondition failure, not proof of the original failure's cause. No logging permission, TLS check or security policy was relaxed.

Only the isolated hosted laboratory was a source. Fixed SELECT results and Supabase CLI 3.0.0 native SQL dumps were captured in process memory and encrypted, never written as plaintext. No project API keys were retrieved. CLI Storage was deliberately not used because its documented permission requirements include secret API-key reads. The three source photo files were downloaded individually through the existing owner's private laboratory Dashboard session instead. No source JWT or browser session was extracted or transferred.

## Retained artifact and independent destination

The final archive is `laboratory-complete.gtlab` in the owner's protected recovery folder outside Git. It includes native role/schema/data SQL, a supplement for managed data omitted by native dumping, logical referenced Vault values and all three photo files. It contains Auth data and private tracking capabilities: treat the entire archive as sensitive despite encryption. Do not upload it to a PR, CI or chat.

Archive SHA-256: `4915f63efa1f8bd256e618570e56391a3983a727e4f05677790252a7bd7b24db`.

The archive envelope uses authenticated AES-256-GCM and scrypt (N=32768, r=8, p=1), a fresh 16-byte salt and 12-byte nonce, and an authenticated `GTLAB1` header. The decrypted format `GT-LAB-COMPLETE-1` distinguishes a photo-inclusive archive from `GT-LAB-DB-1`, which explicitly excludes file bytes. Each photo includes its object identity/version, metadata, byte length and SHA-256. Validation rejects duplicate identities, missing files, noncanonical encoding, unsafe relative paths and byte/hash mismatches. The envelope is limited to 64 MiB; this is a small laboratory format, not a scalable production backup system. Native SQL is executable: restore only a trusted archive produced by the controlled operator workflow.

The owner entered the passphrase into hidden prompts in separate interactive terminals. It was never placed in command arguments, environment variables, files or chat. The coordinator held it in memory for reviewed retries, then exited. JavaScript strings cannot be reliably erased from memory. Keep the passphrase separately from the archive; encryption cannot recover a lost passphrase. NTFS access was restricted to the owner and SYSTEM. A dated runner/source kit was retained beside the archive as `runner-kit-20261107.zip` (SHA-256 `6e79008ad146348eaa70821af68475572c90521f0388f80f26225014d9bd2a9e`); it contains exercise code, not the passphrase, download manifest or backup contents. There is only a verified PC copy of this final archive; an independent off-machine copy and restore from it remain pending.

Restoration used a newly created Supabase PostgreSQL 17 container, followed by private Auth, PostgREST and Storage containers. The database network mode was `none`; all service peers shared that isolated namespace. No ports were published and the offline restoring worker contained no source CLI or source network calls. Local service passwords and JWT signing material were newly generated for this destination; they were not hosted project keys. No source Vault root key was copied. Vault capabilities were re-encrypted through the destination's `vault.create_secret` and only the new references were substituted.

Pinned image digests used in the rehearsal:

| Component | Image digest |
| --- | --- |
| PostgreSQL 17.11.0.006 | `public.ecr.aws/supabase/postgres@sha256:c141fd17ac6a76c4323e90b3aee8ff1a23d2e89e547c2b963cfadc309c079cc2` |
| Auth v2.197.0 | `public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b` |
| PostgREST v16.5 | `public.ecr.aws/supabase/postgrest@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc` |
| Storage v1.84.19 | `public.ecr.aws/supabase/storage-api@sha256:a0420573837ee08c0afdc9cd01f90b4b8027579da99e0b9a159fe912ef756c99` |

## Observed failures and corrections

These failures belong to this rehearsal, independently of the older unrecorded failure:

1. The initial selected schema dump omitted the internal `private` schema. The first import rolled back and the destination was confirmed empty. Adding `private` fixed the schema prerequisite.
2. Native CLI dumping omits some managed data, including the laboratory's `auth.schema_migrations` rows. A fingerprint assertion rejected the next import and rolled it back. Capturing the omitted table data separately in the encrypted archive and restoring it with generated-column-aware recordsets fixed the mismatch.
3. The first local Storage filesystem used tmpfs, which returned `ENOTSUP` for the extended attributes required by this image. Synthetic probes confirmed that the container's writable layer supports them. Restoring bytes and MIME/cache attributes through the actual official `FileBackend` on that layer fixed the HTTP download verification. Source objects were not overwritten.

All fixes were reviewed before a bounded retry. Raw provider errors, SQL data, tokens, filenames, account identifiers and signed URLs were suppressed from recorded results.

## Verification results

Before and after capture, source fingerprints matched across all 45 source tables in the selected application/Auth/Storage/Vault/migration schemas. The independent SQL import was atomic. Every non-Vault table's restored row fingerprint matched the source, normalizing only the intentionally replaced Vault reference. Vault was verified by count and logical token hash rather than by comparing source ciphertext. Tracking hash, expiration including microseconds, and revocation remained unchanged. This is row-data evidence; it is not a semantic equivalence proof for every extension, schema object, sequence or managed service setting.

| Check | Observed result |
| --- | --- |
| Fictional repair orders | 1 restored |
| Auth users | 1 restored; native Auth data fingerprints matched |
| Storage object metadata | 3 restored |
| Referenced Vault values | 1 restored under destination encryption, with a new reference |
| Photo file bytes | 3 restored from the retained encrypted archive |
| Photo identity matching at capture | Unique sizes matched all three downloaded files; one comparable single-part MD5 ETag also matched. Other ETags were not treated as MD5 proofs |
| Independent Storage HTTP downloads | All three lengths and SHA-256 values matched the captured bytes |
| Restored Auth user endpoint | Existing confirmed account read successfully |
| New Auth session | Passed using a destination-generated admin verification challenge and Auth's verification endpoint; no email was sent, confirmation remained enabled |
| Restored user / orders | New Auth-issued session read its one recovered order through PostgREST |
| Receipt RPC | Returned the original active tracking capability from the newly encrypted Vault entry |
| Anonymous tracking RPC | Original capability returned the public projection without internal notes, customer contact details or photos |
| Owner photo HTTP access | Auth-issued local session downloaded the ready photo with matching SHA-256 and generated a signed URL |
| Anonymous photo HTTP access | Download and signing both rejected |
| Original-password login | Pending: owner no longer retains the fictional account password and explicitly deferred this check. No password or confirmation state was changed |

The local session above was newly issued by the restored Auth service. It was not a copied source JWT, an SQL-role simulation, a browser session transfer or a signed URL used as a negative access test. It does not replace the separately pending two-workshop source-session test.

## Remaining acceptance and operational work

- Preserve the complete archive and separately retained passphrase; make and verify an off-machine encrypted copy, then repeat restoration from that copy.
- Consolidate and review the experimental local capture/restore coordinators into a reusable operator workflow. The archive codec and privacy guard are versioned here; the dated machine-specific runners are not a supported general CLI. Retain the reviewed runner kit with the private exercise artifacts for reproducibility until consolidation is complete.
- Verify original-password sign-in when an appropriate retained fictional credential is available. The local challenge/refresh configuration does not establish external SMTP delivery, signup confirmation or password recovery.
- Run actual application acceptance against a separately configured restored stack. This rehearsal exercised its real HTTP services and RPCs, not the complete browser UI or the hosted production environment.
- Complete the source HTTP photo test with two real signed-in workshop profiles when revisited. The owner deferred that gate earlier; local anonymous denial does not close it.
- Inventory and recreate deployment configuration, Auth signing/redirect/provider settings, email delivery, hosting and any other managed components before claiming an independently recoverable production service. Restored native tables and new local keys are not a backup of the hosted control plane.
- Assign backup ownership, cadence, retention, support and a recovery-time/recovery-point target. No timing SLA or production-scale recovery capability was established by this small rehearsal.
- Keep PR #26 a draft. Reconcile its old application baseline with current develop through the normal PR workflow before considering integration. Do not execute the legacy production backup command just because the laboratory rehearsal passed.

The disposable destination contains plaintext test data and local-only secrets while running. Stop it after review and explicitly remove only the labelled exercise containers when the retained artifact and runner kit have been verified. The PostgreSQL data directory uses tmpfs and is lost when the database container stops; the encrypted archive is the durable copy. Unrelated containers were not changed.

References: [Supabase backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [platform to self-hosted restore](https://supabase.com/docs/guides/self-hosting/restore-from-platform), [PostgreSQL parameter logging](https://www.postgresql.org/docs/17/runtime-config-logging.html), [Auth generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [Storage file backend](https://github.com/supabase/storage/blob/v1.84.19/src/storage/backend/file.ts).
