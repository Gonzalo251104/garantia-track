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

Without Supabase configuration the application shows a setup screen. **Explorar con datos ficticios** explicitly enters the isolated local demo. Missing configuration or backend failures never silently save workshop records into demo storage.

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
5. If an upload fails, retry the same intake form: request and photo identifiers are reused. An already committed order is not recreated.
6. Update status, quote and notes. Stale edits are rejected; reload before trying again.
7. Create a customer tracking link from the order. Creating another link invalidates the previous one. Copy it to another browser to test anonymous access.
8. Revoke the link when needed. Valid links expire after 30 days. Tracking never exposes customer contact, internal notes, serial number, quotes or photos.
9. Sign out to clear the workshop view.

A password recovery flow is included. Use the same browser that requested a recovery link because Auth uses PKCE.

## Thermal receipts

Open an order and select Ticket de recepción · QR to prepare an 80 mm or 58 mm intake ticket. Copies reuse the active QR; renewal explicitly invalidates earlier tickets. Links are only retained in tab memory, so a full reload requires deliberate renewal. See [receipt and printing guide](docs/receipts.md) for driver settings, privacy and hardware verification.

## Data and security

- PostgreSQL RLS isolates workshops. API table grants are SELECT-only for authenticated users.
- Transactional security-definer functions explicitly check workshop membership and have fixed search paths and restricted execution grants.
- Cross-workshop relations use composite foreign keys. Client role assignment, direct order mutation and anonymous table reads are forbidden.
- Photos require a reserved database path and membership. The bucket restricts uploads to JPEG and 2 MiB. Uploads cannot overwrite evidence.
- Signed photo URLs last five minutes and are not exposed on tracking pages. A previously issued URL can remain valid until it expires after sign-out.
- Browser Auth sessions are managed by the official SDK. No privileged credentials are shipped to the browser.
- Tracking tokens contain 256 random bits, remain in URL fragments and are stored only as SHA-256 hashes in PostgreSQL. The RPC returns an explicit field allowlist.
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

The remote is [Gonzalo251104/garantia-track](https://github.com/Gonzalo251104/garantia-track). PR #1 and PR #2 were reviewed and merged into develop in order. The first published pilot was v0.2.0. The thermal receipt feature ships in v0.3.0 through the same Gitflow process: release/* enters main through a PR, and main returns to develop through a second PR. No source changes are pushed directly to permanent branches. See [Gitflow](docs/workflow.md), [release notes](docs/releases/v0.2.0.md) and [deployment and rollback](docs/deployment.md).

The static frontend is published with Sites from a mirror of the approved GitHub source. Access to the URL is public; workshops sign in with GarantiaTrack. Supabase Auth, PostgreSQL and private Storage provide the backend. The ignored .env contains only public client configuration. dist/version.json identifies the deployed version and canonical GitHub commit. No paid plan is required for the pilot.

The initial migration is already applied on the connected free Supabase project. Do not rerun it as a new migration. See [environment status](docs/environment.md) and the deployment runbook for exact Auth redirect configuration.

## License

All rights reserved. No redistribution license has been selected.
