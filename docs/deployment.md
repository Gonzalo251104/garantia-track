# Release and deployment

## Source and Gitflow

Build from an approved commit in the canonical GitHub repository. Follow [Gitflow](workflow.md) for the release PR, immutable tag and backmerge. Publishing a GitHub Release and deploying the frontend are separate steps.

The existing [Cloudflare Pages project](https://garantiatrack.pages.dev/) is the primary public entry point. The [original Sites origin](https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site/) serves issued QR links. Keep that origin in `APP_PUBLIC_URL` while it remains the tracking destination.

## Build

Requires Node.js 22+ (CI uses 24). Install with npm ci. Copy .env.example to ignored .env and configure only SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The publishable key is intentionally public; authorization comes from Auth, RLS, storage policies and transactional RPC checks.

PowerShell production build:

```powershell
$env:REQUIRE_SUPABASE_CONFIG = '1'
$env:APP_PUBLIC_URL = 'https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site'
$env:RELEASE_COMMIT = git rev-parse HEAD
npm run build
```

Confirm `dist/version.json` contains the approved version and canonical release commit. Package the contents of `dist/` with `index.html` at the ZIP root. Include generated `config.js`, `version.json` and vendor assets. Upload the ZIP as a production deployment to the existing Pages project using [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/). The deployment package contains only public frontend assets.

`REQUIRE_SUPABASE_CONFIG=1` produces a connected build with the local demo disabled. Confirm that a signed-out visitor sees the access form without the demo action. An existing browser demo session cannot load sample orders in this build. Use a separate test workshop for hosted verification.

## Email readiness

The built-in Supabase Auth sender only delivers to project team addresses and permits two emails per hour per project. Before opening signup to customers, configure a supported SMTP sender, verify its sending identity and test both confirmation and password recovery with a controlled external inbox at the published origin. Keep confirmation enabled and verify the return in the browser that initiated the request. The hosting plan and the SMTP sender are independent. See [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Supabase Auth URLs

The verified callback set includes the root and `?auth=recovery` routes for Pages, the original Sites origin and `http://127.0.0.1:4173/`. See the [environment record](environment.md) for the configured default site origin. Keep email confirmation enabled and use exact redirect URLs. PKCE recovery links return to the browser that requested them.

Check migration history before applying any newly required migration. Existing migrations, including persistent receipt tracking, are already applied. Existing links retain their original origin and expiry.

## Verification and rollback

1. Match the Pages `/version.json` to the approved GitHub tag and compare the served assets with the release package.
2. Verify the original tracking origin still responds. Use an existing authorized fictional test session to check the workshop and intake. Use an authorized fictional tracking link when available to check customer-facing fields and expiry.
3. Record the deployment result, version and canonical commit without storing tracking tokens, session details or private photo URLs.

For a frontend regression, identify the last compatible successful production deployment by version and commit. In the Pages project, open **Deployments**, open the action menu for that deployment and select **Rollback to this deployment**. Confirm the target and recheck the public version and app access. A Sites rollback uses its own saved deployment. Keep database and Storage recovery procedures separate from frontend rollback. See [Cloudflare Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
