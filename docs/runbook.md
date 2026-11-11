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

Only one instance can listen on port 4173. If EADDRINUSE appears, the existing server is already running: open its URL rather than starting another instance. Reuse a server only if you can identify the checkout and port it serves.

For a separate preview when the default port is occupied:

```powershell
$env:PORT = '4180'
npm run dev
```

Open http://127.0.0.1:4180. Each origin has its own Auth session. Stop this server with Ctrl+C and clear the override with Remove-Item Env:PORT when finished.

## Configuration

The existing ignored .env contains the Supabase project URL and public publishable key. Do not replace it with a service_role or secret key. Do not commit .env. Restart the server after changing it.

A configured local browser can connect to the hosted project named in `.env`. Use a dedicated fictional workshop for hosted checks or `npm run dev:photo-retry` for the isolated local fixture. Review the [environment record](environment.md) before using hosted configuration.

## Verification commands

```powershell
npm run lint
npm run check
npm test
npm run build
```

- lint: ESLint checks.
- check: JavaScript syntax checks.
- test: domain, SDK-adapter, configuration and embedded PostgreSQL tests.
- `npm run smoke:supabase` is an optional hosted check. Confirm the intended project before running it.
- build: generates static assets and public configuration; does not publish or start a server.

## First application account

Your Supabase dashboard account is separate from the GarantiaTrack application account. Choose Crear cuenta in the application, use your email and a password of at least 12 characters, confirm the email and sign in using the same browser. Never share the password in chat. Keep email confirmation enabled. For this first development test use an address allowed by the project's default SMTP sender, normally the project owner's email.

## Technical acceptance

Use the [fictional workflow checklist](pilot-runbook.md) for sign-in, intake, photos, tracking and receipt verification. For the October 28 hosted check and its scope, see the [environment record](environment.md).
