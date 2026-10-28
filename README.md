# GarantiaTrack

A responsive, navigable prototype for console and controller repair shops. Source code, identifiers and documentation are in English. Customer-facing copy is in Spanish.

## Run locally

Requires Node.js 22 or newer. No dependencies, installation, accounts, API keys or build step are required.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Keep the server running while using the prototype.

```sh
npm run check
npm test
```

## Walkthrough

1. Browse the five fictional repair orders. Search by model, customer, phone or order number and try the status filters.
2. Choose **Recibir equipo**, enter fictional details, select accessories and optionally attach device photos.
3. Create the order. Its detail page shows the intake record, photos and history.
4. Change the status, budget, internal notes and customer message, then save.
5. Open **Abrir vista del cliente**. Verify the status and message changed and that internal notes and contact details are not rendered there.
6. Return to the workshop, export CSV or print an intake record using the browser print dialog.
7. Use **Restablecer datos de ejemplo** and confirm to remove local changes.

## Prototype boundaries

- Fictional examples only. Do not enter personal, payment or confidential information.
- Orders and compressed photos are stored in localStorage for this origin and browser. Clearing browser data or resetting the demo removes them. Private browsing and storage quotas can prevent saves.
- Tracking links work only where the local order exists. Another browser or device will not receive newly created orders.
- The client view is a presentation preview, not an authorization boundary: all demo data is delivered to the browser. There is no authentication or secure tenant isolation.
- Printed records do not contain QR codes yet. Tracking is available through the real navigable link. No fake QR is displayed.
- No WhatsApp messages, email, payments, background jobs or notifications are sent.
- Arbitrary status changes are intentionally allowed for exploring screens. Production transition rules, approvals and delivery controls are not implemented.
- Photo files are decoded and re-encoded locally; there is no upload service. Maximum five photos per order and 10 MB per input file; browser storage may fill sooner.
- Drafts are not retained when leaving the intake page. Use one editing tab at a time; cross-tab changes show a reload warning, not conflict resolution.

## Implementation

This first interaction prototype deliberately uses buildless HTML, CSS and browser ES modules to avoid installation and hosting costs. It does not claim to implement the planned React/Hono/PostgreSQL production architecture. Pure domain helpers and the screen structure can guide that implementation after workshop validation.

- `dist/index.html`: entry document and accessibility landmarks.
- `dist/app.js`: routes, forms, local persistence and interaction handlers.
- `dist/domain.js`: seed data, input checks, money and public projection.
- `dist/styles.css`: desktop/mobile layouts and print styles.
- `scripts/server.mjs`: loopback-only static development server.
- `tests/`: Node built-in test suite.
- `docs/`: design, validation, production migration and Gitflow instructions.

## Repository and deployment status

Work is kept on `feature/navigable-prototype`. No GitHub remote or PR has been created. Branch protection cannot be enforced locally; configure it when the repository is connected. The included Actions workflow runs checks and tests on PRs to `main` and `develop`.

A private Sites project was registered and its identity is stored in `.openai/hosting.json`. Publication was intentionally withheld because the Sites source workflow requires a direct push to its managed `main` branch and does not provide the agreed PR workflow. The existence of the manifest does not indicate a deployed version.

For a future static host, serve `dist/` as the document root. Hash routes work without rewrite configuration. See `docs/architecture.md` before using real information.

## License

All rights reserved. No redistribution license has been selected. Repository visibility does not grant a commercial reuse license.
