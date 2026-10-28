# Thermal intake receipts and QR tracking

Open an order and select **Ticket de recepción · QR**. The dedicated ticket view supports 80 mm and 58 mm paper, with 72 mm and 48 mm content widths respectively. It prints a customer receipt containing the workshop, order number, Lima intake time, customer name, model, serial, accessories, reported issue and physical condition. Contact numbers, quotes, internal notes, history and photo URLs are excluded. This is an intake record, not a tax invoice or proof of payment.

## Tracking lifecycle

Printing and switching paper width never rotate a token. A link created in the same tab is reused across order navigation and status updates, and its validity is checked before preparing/printing the QR. Creating or renewing a link requires an explicit confirmation because it invalidates previous links and printed tickets. Revocation clears the in-memory link. Sign-out and identity changes clear all cached links and invalidate pending UI callbacks.

The database stores token hashes only. The raw URL is retained exclusively in this tab's JavaScript memory, not localStorage, sessionStorage, source or logs. A full reload or a different tab cannot recover that URL. To print after a reload, deliberately renew it and replace old customer tickets. This limitation preserves the existing backend security model; the feature adds no schema change. Tokens keep their existing 30-day lifetime and revocation behavior. A recipient can share a QR, so treat the printed ticket as private.

Use **Copiar enlace activo** to copy without rotation and **Renovar enlace / QR** to deliberately replace it. The preview validates the cached link using the existing minimal tracking RPC. Unavailable, expired or revoked links and failed network checks disable printing. A direct browser print before preparation produces a blocked-ticket message. The demo prints an explicitly labeled sample with no shared QR.

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
