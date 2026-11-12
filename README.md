<div align="center">
  <img src="dist/garantiatrack-favicon.svg" width="76" height="76" alt="">
  <h1>GarantiaTrack</h1>
  <p><strong>Repair intake and private customer tracking for console and controller workshops.</strong></p>
  <p><a href="https://garantiatrack.pages.dev/">Open GarantiaTrack</a> · <a href="docs/receipts.md">Receipt guide</a> · <a href="docs/architecture.md">Architecture</a></p>
</div>

A workshop can receive a device, document its condition, and hand the customer a receipt with a private QR code. The customer scans it from a phone to check the repair status and the latest message from the workshop.

## From drop-off to pickup

| Step | Workshop | Customer |
| --- | --- | --- |
| **Receive** | Record the device, reported fault, accessories and intake photos. | Keep a receipt with the order number and tracking QR. |
| **Repair** | Update the order status and keep internal notes separate from the customer message. | Check progress from the private link on a phone. |
| **Hand over** | Reprint the same valid QR, download or share the A4 PDF, or print a 58 mm or 80 mm ticket. | Use the order number when contacting the workshop. |

Workshop accounts are authenticated. Supabase enforces workshop membership and keeps intake photos private. The customer view exposes a limited order summary through the QR, and each link expires after 30 days.

## Run locally

Requires Node.js 22 or newer. Install dependencies and start the loopback server.

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). To use the sample workspace, set `ENABLE_DEMO=1` in an ignored `.env`, restart the server and choose **Explorar con datos ficticios**. For a separate in-memory test of photo retries, use `npm run dev:photo-retry`. See the [local runbook](docs/runbook.md).

To connect a workshop environment, follow the [Supabase setup guide](docs/supabase-setup.md). Use the public client configuration in `.env.example` and apply migrations to the intended project through the documented process.

## Code and checks

The Spanish interface uses HTML, CSS and JavaScript modules. Supabase provides Auth, PostgreSQL, private Storage and encrypted storage for reusable receipt links. The browser builds tickets and QRs locally.

| Path | Contents |
| --- | --- |
| `dist/` | Frontend source, receipt layout and tracking view |
| `supabase/migrations/` | Workshop schema, access policies and database functions |
| `scripts/` | Build, local server and test fixtures |
| `tests/` | Application, receipt, QR and database authorization checks |

```sh
npm run lint
npm run check
npm test
npm run build
```

[Deployment and rollback](docs/deployment.md) · [Gitflow](docs/workflow.md) · [GitHub releases](https://github.com/Gonzalo251104/garantia-track/releases)

## Operating scope

The order list, search and CSV export cover the most recent 500 orders. Before onboarding real customer data, review external email confirmation and recovery, cross-workshop access, data retention and operational recovery. See the [pilot runbook](docs/pilot-runbook.md).

All rights reserved. See [LICENSE](LICENSE).
