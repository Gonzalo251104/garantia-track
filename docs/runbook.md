# GarantiaTrack local runbook

Project directory: `C:\Users\GGonzalo\Proyectos\garantiatrack`

## First checkout or dependency changes

Use Node.js 22 or newer; the verified environment uses Node.js 24.11.1.

```powershell
cd C:\Users\GGonzalo\Proyectos\garantiatrack
node --version
npm --version
npm ci
npm run dev
```

Open http://127.0.0.1:4173 and leave the terminal running. Stop your terminal's server with Ctrl+C.

## Everyday startup

```powershell
cd C:\Users\GGonzalo\Proyectos\garantiatrack
npm run dev
```

Run npm ci only on the first checkout or after dependency/lockfile changes. The dev command bundles the SDK, then starts the loopback web server. Browser refresh loads source edits; there is no automatic hot reload.

Only one instance can listen on port 4173. If EADDRINUSE appears, the existing server is already running: open its URL rather than starting another instance. The assistant has currently started a server for this test session.

For a separate preview when the default port is occupied:

```powershell
$env:PORT = '4180'
npm run dev
```

Open http://127.0.0.1:4180. Each origin has its own Auth session. Stop this server with Ctrl+C and clear the override with Remove-Item Env:PORT when finished.

## Configuration

The existing ignored .env contains the Supabase project URL and public publishable key. Do not replace it with a service_role or secret key. Do not commit .env. Restart the server after changing it.

This local application uses the real Supabase development project. Network access is required. The database migration is already applied; do not reapply the initial SQL script.

## Verification commands

```powershell
npm run lint
npm run check
npm test
npm run smoke:supabase
npm run build
```

- lint: ESLint checks.
- check: JavaScript syntax checks.
- test: domain, SDK-adapter, configuration and embedded PostgreSQL tests.
- smoke:supabase: non-destructive live API checks; does not create accounts or photos.
- build: generates static assets and public configuration; does not publish or start a server.

## First application account

Your Supabase dashboard account is separate from the GarantiaTrack application account. Choose Crear cuenta in the application, use your email and a password of at least 12 characters, confirm the email and sign in using the same browser. Never share the password in chat. Keep email confirmation enabled. For this first development test use an address allowed by the project's default SMTP sender, normally the project owner's email.

## Full test after sign-in

1. Create a workshop named GarantiaTrack QA, or use the existing test workshop.
2. Receive a controller with a fictional customer and contact number.
3. Select a harmless device image; the generated garantiatrack-qa-device.png is a suitable fixture.
4. Create the order, verify its private photo loads, and reload to verify persistence.
5. Change its status, add an internal note and a different customer-facing message.
6. Create a private tracking link and open it without signing in, for example in a private browser window.
7. Verify the public message and status, and ensure customer contact, internal notes and photos are absent.
8. Rotate/revoke the link and confirm the old URL stops working.

The authenticated end-to-end test completed successfully on 2026-10-28 with order GT-1042 in GarantiaTrack QA. Intake, private photo upload/download, persistence after reload, status/message updates, anonymous tracking, rotation and revocation all passed. Password recovery and a separate physical device were not tested. The 19 automated tests also pass.
