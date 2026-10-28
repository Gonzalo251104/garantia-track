# Release and deployment

## Source and Gitflow

GitHub is the canonical source. Start release/0.2.0 from develop, prepare the changelog and release notes, and open a PR into main. Merge only after CI passes on the current head. Use a merge commit to preserve Gitflow ancestry. The main workflow reruns validation, creates an immutable v0.2.0 tag and publishes a GitHub Release. A repeated run accepts the same tag/commit and refuses to move a tag. Return main to develop through another PR. Future work starts from develop; urgent fixes start from main on hotfix/* and return through PRs to both permanent branches.

The hosting source repository is a deployment mirror of the reviewed GitHub main source, not a second development branch. Build and publish only an approved commit. The Sites source helper synchronizes the mirror and packages dist with .openai/hosting.json. Never put repository credentials or privileged Supabase credentials into source, command arguments, archives or logs.

## Build

Requires Node.js 22+ (CI uses 24). Install with npm ci. Copy .env.example to ignored .env and configure only SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. The publishable key is intentionally public; authorization comes from Auth, RLS, storage policies and transactional RPC checks.

PowerShell production build:

```powershell
$env:REQUIRE_SUPABASE_CONFIG = '1'
$env:RELEASE_COMMIT = git rev-parse HEAD
npm run build
```

For the hosting mirror, set RELEASE_COMMIT to the canonical GitHub release commit, rather than its mirror commit. Confirm dist/version.json contains the expected version and canonical commit. Generated config.js, vendor files and version.json are ignored by Git but must be included in the deployment archive. The source manifest selects dist as the static root. Route fragments work without SPA server rewrites.

## Supabase Auth URLs

After deployment, copy its exact HTTPS origin from the successful deployment result. In Authentication > URL Configuration set Site URL to that origin. Preserve local development redirects and add these four exact entries, replacing PRODUCTION_ORIGIN with the actual origin:

- http://127.0.0.1:4173/
- http://127.0.0.1:4173/?auth=recovery
- PRODUCTION_ORIGIN/
- PRODUCTION_ORIGIN/?auth=recovery

Do not disable email confirmation or add unrestricted wildcards. Existing accounts and workshop data remain in the same Supabase project. Signing in on a different device creates its own session. Recovery links must be opened in the browser that requested them because of PKCE. Old localhost tracking links should be replaced by newly generated links from the deployed application; rotating a link invalidates the previous one.

## Verification and rollback

1. Check /version.json against the released GitHub main SHA, and check that config.js selects the intended Supabase project.
2. Open the public URL in a signed-out browser: workshop data must require GarantiaTrack authentication.
3. Sign in with the existing owner account. Receive a fictional controller with a JPEG, reload and verify its photo persists.
4. Generate a customer link, open it on another device without signing in, update the order status and verify the customer view updates after reload. Check that internal notes, contacts, serials and photos remain absent.
5. Rotate and revoke the link. Confirm the old link no longer works.
6. Test on a phone over mobile data, and verify confirmation/recovery callbacks after configuring email delivery.

For a frontend regression, redeploy the last known good saved Sites version. Retain its version ID and GitHub SHA. For the first release, if no earlier version exists, pause usage while fixing via hotfix/* and PRs. Do not reset branches, move existing tags or roll back schema blindly. Frontend rollback does not remove orders or storage objects. Database/photo backup and restoration are separate responsibilities.

## Free pilot and growth

Use the existing Sites hosting and Supabase Free project; no paid plan or custom domain is required for the pilot. Monitor database size, storage, egress and active users in Supabase. Free quotas and pause behavior can change; review the provider dashboard before expanding real usage. Keep compressed JPEGs, avoid polling and remove obsolete evidence according to an agreed retention policy. At higher volume, add server pagination and indexed search, then increase the PostgreSQL/storage plan if usage justifies it. The static frontend and standard PostgreSQL schema remain portable. This release does not automate Sites deployment from GitHub Actions; publishing remains a deliberate release step after PR integration.

References: [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [GitHub release API](https://docs.github.com/en/rest/releases/releases#create-a-release).
