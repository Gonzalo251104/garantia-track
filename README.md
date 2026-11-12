# GarantiaTrack

Console and controller repair intake, authenticated workshop records and private customer tracking. The existing Spanish interface is preserved; source and documentation are in English.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173. The server binds to loopback only. Leave it running while testing. The SDK is bundled locally; no CDN or browser-side package installation is required.

For startup, verification commands and troubleshooting, see [local runbook](docs/runbook.md). The authenticated receipt/photo/tracking test passed on 2026-10-28 with fictional order GT-1042.

For a free, isolated photo-upload failure and retry exercise, see [photo upload recovery check](docs/photo-upload-recovery-check.md). `npm run dev:photo-retry` uses fictional in-memory HTTP services and never connects to hosted Supabase.

Without Supabase configuration the application shows a setup screen. To use the isolated local demo, set `ENABLE_DEMO=1` in the ignored `.env`, restart the loopback server and select **Explorar con datos ficticios**. The public application requires workshop authentication. Customer tracking remains available through its private link.

## Connect Supabase

Follow [Supabase setup](docs/supabase-setup.md). Apply the versioned SQL migration, configure Auth and create an ignored `.env` from `.env.example` with the project URL and **publishable / anon key only**. Restart the development server. Never use a secret or service_role key.

```sh
npm run lint
npm run check
npm test
npm run build
```

## Connected workflow

1. Create an account, confirm its email and sign in. Configure SMTP before inviting external users.
2. Create the workshop after authentication. Existing staff memberships are provisioned by the project administrator, not by user-editable metadata.
3. Receive an equipment item. The server allocates its number and writes the initial event in one transaction.
4. Compressed JPEG evidence is uploaded to a private bucket. Five reserved slots per order prevent concurrent over-allocation.
5. If an upload fails, retry the same intake or reopen its saved order and select the original image again for the pending slot. Recovery preserves the order and confirmed photos; missing unreserved evidence can be completed within the five-photo limit. See [saved-order photo recovery](docs/order-photo-recovery.md) for scope and release status.
6. Update status, quote and notes. Stale edits are rejected; reload before trying again.
7. Retrieve or create the active customer tracking link from the order. Reopening, copying and reprinting preserve it; explicit renewal or revocation invalidates previous copies. Use a separate browser to test customer access.
8. Revoke the link when needed. Valid links expire after 30 days. Tracking never exposes customer contact, internal notes, serial number, quotes or photos.
9. Sign out to clear the workshop view.

A password recovery flow is included. Use the same browser that requested a recovery link because Auth uses PKCE.

## Thermal receipts

Open an order and select Ticket de recepción · QR to prepare an 80 mm or 58 mm intake ticket. Copies and reloads retrieve the same active QR from encrypted server storage. Renewal explicitly invalidates earlier tickets; legacy tickets can be adopted without rotation using their existing URL. See [receipt and printing guide](docs/receipts.md) for driver settings, privacy and hardware verification.

## Data and security

- PostgreSQL RLS isolates workshops. API table grants are SELECT-only for authenticated users.
- Transactional security-definer functions explicitly check workshop membership and have fixed search paths and restricted execution grants.
- Cross-workshop relations use composite foreign keys. Client role assignment, direct order mutation and anonymous table reads are forbidden.
- Photos require a reserved database path and membership. The bucket restricts uploads to JPEG and 2 MiB. Uploads cannot overwrite evidence.
- Signed photo URLs last five minutes and are not exposed on tracking pages. A previously issued URL can remain valid until it expires after sign-out.
- Browser Auth sessions are managed by the official SDK. No privileged credentials are shipped to the browser.
- Tracking tokens contain 256 random bits, remain in URL fragments and are checked through SHA-256 hashes in PostgreSQL. Recoverable receipt tokens are encrypted in Supabase Vault and returned only to authorized workshop members. The RPC returns an explicit field allowlist.
- The connected mode does not import local demo data.
- Local authenticated intake, private HTTP photo uploads and tracking have passed live verification. Production-origin callbacks and device testing are separate deployment checks.

## Current boundaries

The workshop list loads at most 500 recent orders; search and CSV export cover that loaded set. Member invitation UI, billing, payment verification, state transition restrictions, offline sync and automatic WhatsApp notifications remain out of scope. CSV and printing remain available.

Leaving intake discards an unsaved draft or pending local photo retries. Pending reservations can be reviewed by a project administrator; no automatic cleanup job is shipped. Images are decoded and recompressed by the browser. Bucket MIME restrictions are not a substitute for a future server-side content inspection pipeline.

Before collecting real customer information, verify SMTP, email confirmation, access controls, backups (including photo objects), retention and recovery on the target project.

## Repository structure

- `dist/app.js`: existing interface, Auth screens and mode-aware interactions.
- `dist/backend.js`: official SDK adapter, transactional RPCs and private storage.
- `dist/domain.js`: pure domain and demo helpers.
- `scripts/`: config validation, bundling, syntax checks and loopback server.
- `supabase/migrations/`: schema, RPCs, RLS and private bucket.
- `tests/database.test.js`: executable PostgreSQL authorization tests using PGlite.
- `docs/`: setup, architecture, review plan and verification results.
- `dist/vendor/`, `dist/config.js`: generated, ignored build outputs.

## Releases and hosting

The main public entry point is [GarantiaTrack on Cloudflare Pages](https://garantiatrack.pages.dev/). The original Sites origin still serves issued tracking links. The frontend uses Supabase Auth, PostgreSQL and private Storage. Each deployment reports its release and canonical GitHub commit in `/version.json`.

See [Gitflow](docs/workflow.md), [deployment and rollback](docs/deployment.md) and the [environment record](docs/environment.md) for release, hosting and Auth configuration.

## License

All rights reserved. No redistribution license has been selected.
