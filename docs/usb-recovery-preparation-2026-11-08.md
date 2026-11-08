# Recovery consolidation and USB preparation

Date: 2026-11-08, America/Lima. Scope: laboratory tooling and external-copy preparation. Production, main/develop and published v0.10.1 were unchanged.

## Implemented and checked

- Consolidated the machine-specific coordinators into the versioned `lab.mjs` entry point with separate capture, inspection, USB-copy, Docker lifecycle, SQL restore and HTTP verification modules. No hardcoded operator path, container ID, status-marker reuse, background passphrase coordinator or arbitrary remote restore endpoint is needed.
- Added an English operator runbook. Restoration uses Node built-ins and cached digest-pinned Docker images; it needs no npm installation, Supabase login or original source connection. The native CLI adapter remains fixed to the fictional hosted laboratory and is loaded only for explicit capture.
- Added coverage for foreign-container cleanup refusal, published-port/host-mount/network rejection, psql host-command escape rejection, managed-table omissions, changing-source rejection, hash mismatches, exclusive writes and argument redaction.
- Ran a real empty-container creation/cleanup test. Found that the image can accept SQL while PID 1 is still its initialization shell; readiness was tightened to require the final PostgreSQL process before import. A synthetic native-schema import and row-fingerprint check exercise the actual database restore module, without opening the retained archive.
- Kept capture's remaining evidence distinction explicit: the refactored adapter has unit coverage; no new hosted capture was executed in this task.

## External media evidence

The owner selected drive E:, verified as an independent Kingston DataTraveler USB device using exFAT. No unrelated files were read or overwritten. The copy command creates a new directory, flushes and rereads the encrypted archive and committed tools ZIP, checks SHA-256 and writes a nonsecret manifest. No passphrase or plaintext backup is copied. The USB's local manifest identifies the exact source-code commit and tools ZIP hashes.

The archive is the same complete laboratory archive from the prior successful technical rehearsal:

`4915f63efa1f8bd256e618570e56391a3983a727e4f05677790252a7bd7b24db`

The initial consolidated tools snapshot was commit `4ab0da473a9c8a0a9cff751c82636e07322db605`, ZIP SHA-256 `577e98c8eb46f3b6c18bbbbdf82e99a5671167691ec95070dcc711ac11bf411d`. Standalone branch CI passed for that commit. Subsequent readiness/diagnostic corrections are retained in a newer committed tools set; consult that set's manifest rather than assuming the initial ZIP contains those corrections.

## USB restore attempt and deliberate deferral

The first attempt ran the tools extracted from the USB and read the encrypted archive on the USB. Archive authentication and structural validation passed. It then failed during the database import stage, and the single destination container was removed successfully. The safe report contained no SQLSTATE, so it does not establish an exact failure cause. The later readiness finding is an observed issue and correction; it is not claimed as the proven cause of this attempt without a successful replay.

The owner explicitly expressed fatigue with repeated secret entry. No further passphrase request or secret-dependent retry was made. The subsequent checks use only synthetic schemas/data. The complete encrypted USB replay, including Auth and Storage HTTP checks under the consolidated scripts, therefore remains **pending**. Do not mark it passed from the matching copy hash, successful decryption, synthetic tests or the prior 2026-11-07 local rehearsal.

Original-account-password login remains deferred as previously requested. Production recovery readiness, browser acceptance, real two-workshop source-session checks and external SMTP remain separate gates. The next product validation can proceed using fictional data while these operational limits remain recorded.
