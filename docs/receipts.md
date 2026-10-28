# Thermal intake receipts and QR tracking

Open an order and select **Ticket de recepción · QR**. The dedicated ticket view supports 80 mm and 58 mm paper, with 72 mm and 48 mm content widths respectively. It prints a customer receipt containing the workshop, order number, Lima intake time, customer name, model, serial, accessories, reported issue and physical condition. Contact numbers, quotes, internal notes, history and photo URLs are excluded. This is an intake record, not a tax invoice or proof of payment.

## Tracking lifecycle

Printing, switching paper width, reloading, signing in again or opening another tab retrieves the same active token through an authenticated RPC. The server stores its recoverable value in Supabase Vault using authenticated encryption; the public tracking table retains its SHA-256 hash and an opaque Vault reference. Neither raw tokens nor decryption keys are persisted in browser storage or configuration. Sign-out/identity changes still clear transient memory and invalidate pending callbacks.

The three receipt RPCs check workshop membership and serialize on the order row. get_receipt_tracking retrieves without creating or extending a link. ensure_receipt_tracking creates only when no tracking record exists; concurrent preparations reuse the existing record. It does not replace legacy, expired or revoked links. import_receipt_tracking verifies the supplied token against the current active hash before encrypting it, preserving both hash and expiry exactly. The anonymous get_order_tracking endpoint is unchanged and returns only its existing customer field allowlist. Anonymous users cannot retrieve a receipt token, and members cannot directly read Vault or tracking tables.

For a ticket issued before this migration, choose Recuperar un QR anterior and paste the URL obtained by scanning that ticket. The old QR remains valid throughout this process. A hash cannot reconstruct an unknown old token: if the old URL is unavailable, use explicit renewal only after deciding to replace old tickets. Existing records are never automatically invalidated during migration. New links retain their original 30-day lifetime. Retrieval and reprinting never extend that lifetime.

Use Copiar enlace activo to retrieve/copy without rotation. Renovar enlace / QR explicitly replaces a link after confirmation; Revocar blocks it and removes the recoverable secret. Expired or revoked links are never reactivated by reload, import or ensure. Failed validation disables printing; retry after restoring connectivity. The demo prints a labeled sample with no shared QR.

## Printing

1. Select 80 mm or 58 mm in GarantiaTrack.
2. Choose **Imprimir ticket** and select the same roll width in the installed printer driver.
3. Use 100% scale and turn off browser headers/footers. The app supplies page margins; avoid additional driver scaling.
4. Print a sample, scan its QR on a phone and verify the right customer order before handing tickets to customers.

The page uses a monochrome vector QR, Q error correction and a four-module quiet zone. Automated tests decode the actual SVG rasterized at 203 DPI for both paper profiles. Explicit page width/height is calculated from the rendered receipt; the CSS does not use the invalid `size: 80mm auto` combination. Long fields wrap without truncation. Drivers and browsers may override custom page size or split long receipts; select the appropriate roll configuration and check the first physical print.

The browser handles installed USB/Bluetooth/network printers and Save as PDF. This feature does not implement raw ESC/POS, silent printing, cutter commands or a direct Bluetooth connection. Physical hardware, paper feed, cuts and phone-camera scanning must be verified with the intended printer. PDF and paper copies contain a bearer QR and customer intake details; store them accordingly.

## Public URL during local development

Optional ignored `.env` setting:

```dotenv
APP_PUBLIC_URL=https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site
```

This canonical HTTPS origin is used for newly created tracking links and must serve the same Supabase project. It does not change Auth callback URLs. Omit it in a normal production build to use the current application origin. Localhost QR links are explicitly labeled as local and do not work on another device. No URL shortener or third-party QR service receives the link. See `.env.example` and `tests/config.test.js` for validation.

No additional monthly service cost is introduced. The QR generator is bundled locally; jsQR is a test-only independent decoder. At larger volume, continue using standard frontend assets and the existing PostgreSQL tracking endpoint rather than introducing a printing microservice.

## Migration, backup and verification

Apply supabase/migrations/20261028212715_persistent_receipt_tracking.sql before deploying this frontend. Supabase Vault and pgcrypto must already be installed; the migration fails clearly if Vault is unavailable. The file was generated with the official CLI and aligned to the MCP-applied remote version. It leaves pre-existing hashes, expiries and revocation states unchanged and keeps the old rotation/revocation signatures compatible. Frontend rollback does not require dropping this additive migration or removing encrypted links.

Vault and its decryption root key are a backend dependency. No root key or service-role credential is exposed to the browser. Same-project recovery retains the key; for manual migration to a new project, follow the provider's key-preserving restore procedure and verify decryption before switching traffic. Raw PostgreSQL dumps alone are insufficient for restoring encrypted capabilities into a project with a different key. Keep encryption backups and access permissions in the recovery plan. The SQL helpers isolate the Vault operations for replacement if migrating providers.

PGlite tests use an explicitly labeled Vault contract double, not production encryption. They verify tenant isolation, grants, lifecycle, legacy adoption and unchanged expiry. Live Supabase probes separately verify real encryption/decryption, scoped recovery and revocation with fixture changes rolled back.

References: [Vault encryption, grants and key portability](https://supabase.com/docs/guides/database/vault), [membership-checked definer advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
