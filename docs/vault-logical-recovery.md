# Scoped logical Vault recovery drill

Status: implementation under review; hosted artifact export and cross-project restore have not run. This operator-only CLI supports the single fictional GT-1044 order. It is not a general Vault backup, database backup or key migration. No frontend or public RPC is added.

The first owner-operated hosted backup attempt stopped with the original generic error. No stage/code was captured, so the cause and whether any artifact was written are unconfirmed. Safe stage-based diagnostics now distinguish input, archive access, TLS/network/authentication, privacy setup, export and restore failures using fixed allowlisted guidance. Provider messages, details, stack traces, query parameters and supplied inputs are never printed. This does not identify the earlier failure retrospectively. A live retry and independent restore remain in the backlog while controlled fictional pilot preparation proceeds.

The photo portion was completed separately on 2026-11-03: the JPEG extracted from the USB encrypted archive replaced the exact-path object in the private hosted lab. A fresh Dashboard download matched the original source SHA-256 and 35,327-byte length. The ready photo association remained intact. This closes the previously pending upload from an extracted archive; actual signed-in application and outsider HTTP checks remain pending.

The CLI connects directly to PostgreSQL over verified TLS using an operator-entered database password. It does not use the Supabase CLI credential store, Management API, service-role keys or the root encryption key. The prior API-key lookup rejection remains binding. Never weaken certificate checks if a connection fails; obtain the provider's CA certificate and supply its path when prompted. Use the Dashboard Connect dialog's direct or **session** pooler details (port 5432), not a connection URL containing a password. No credentials are accepted as command-line flags, environment variables or configuration files by this tool.

## Backup

Run in an ordinary interactive terminal, with Node 22+ and `npm ci` installed. Choose an existing, protected directory **outside the repository** for the encrypted artifact:

```powershell
node scripts/recovery/vault.mjs backup 'C:\path-to-private-backups\gt1044.gtvc'
```

The CLI asks for the source project reference, nonsecret connection fields, optional CA certificate path, database password and a backup passphrase of at least 16 characters. Secret prompts do not echo. It exports one consistent read-only snapshot of the tracking value, order identity, token hash and exact expiration. It verifies the hash before encryption. Only ciphertext is written, with exclusive file creation. Existing artifacts are never overwritten. Move the encrypted artifact to the independent USB copy, verify hashes and retain its passphrase separately. The `.gtvc` format is versioned AES-256-GCM with a random 16-byte salt, random 12-byte nonce and fixed scrypt N=32768, r=8, p=1; it is not a 7-Zip file.

JavaScript strings cannot be reliably erased from process memory. This tool prevents intentional plaintext persistence/output, not memory capture, endpoint compromise or forensic recovery. Use a trusted terminal without session recording. POSIX mode 0600 is requested on write; Windows users must protect the parent directory with appropriate NTFS ACLs. The CLI suppresses PostgreSQL bind parameter logging for its session and fails closed if it lacks permission; independent database auditing must be assessed before use. Raw database errors are intentionally not printed.

## Restore to the isolated lab

Prerequisites: the order and tracking hash/expiration must already be restored to the lab; the tracking row must be active, unexpired and missing its Vault reference. An existing Vault reference is rejected without overwriting it. Do not detach an existing reference until an operator has retained the old reference for rollback and verified the encrypted artifact. Current GT-1044 already has a manually recovered secret, so the restore is deliberately ineligible until a controlled lab rehearsal is prepared.

```powershell
node scripts/recovery/vault.mjs restore-lab 'C:\path-to-private-backups\gt1044.gtvc'
```

Only the predefined lab project is accepted as destination. The authenticated archive is decrypted in memory, validated, and checked against locked destination rows. The CLI creates a new Vault entry through `vault.create_secret`, updates only its reference and verifies the stored hash before committing. Hash, expiration (including microseconds), revocation, order identity and existing-secret mismatches abort. It never extends expiry, clears revocation, rotates a QR, imports Auth users, copies photos or overwrites the Vault root key.

After the live rehearsal, verify destination receipt retrieval and public tracking without printing tokens; confirm expiry and tenant authorization. Repeat from the USB artifact with the source unavailable. Record failures and duration, and restore the previous lab reference if the rehearsal fails. Retain no secret in Git, screenshots, chat or CI artifacts.

## Evidence and limits

Unit tests exercise authenticated encryption, wrong passwords, tampering, destination guards, microsecond expiry differences, bound SQL values and transaction rollback with a simulated database. A prior rolled-back hosted test exercised Vault creation and logical re-encryption, but did not run this CLI. Real hosted export, session parameter permissions, certificate trust, actual terminal prompting, new-reference restoration and cross-project tracking remain unverified. Docker Desktop was started for a local test, but no Supabase PostgreSQL image or recovery containers were available; no unrelated container was started or changed.

References: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [node-postgres TLS](https://node-postgres.com/features/ssl), [parameterized queries](https://node-postgres.com/features/queries), [Node crypto](https://nodejs.org/api/crypto.html).
