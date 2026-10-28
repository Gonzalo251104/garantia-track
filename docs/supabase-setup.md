# Supabase setup

## 1. Prepare the project

Create or select a Supabase project under your account. No paid services are required for a small development environment. Do not point the integration at an unrelated production database.

Apply `supabase/migrations/20261028060929_workshop_backend.sql` once in the project's SQL Editor, or use the Supabase CLI linked to the intended project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Complete authentication and database password prompts yourself in your terminal. Do not paste private tokens, database passwords or service_role keys into chat. SQL Editor application does not automatically populate the CLI migration history; choose one approach and reconcile history before switching. Do not rerun the non-idempotent initial migration over an existing schema.

The initial migration creates the tables, constrained RPCs, RLS and the private `repair-photos` bucket. Also apply `20261028212715_persistent_receipt_tracking.sql` before running the current frontend. It requires the project's Supabase Vault and pgcrypto extensions and adds encrypted receipt recovery. Both migrations are already applied on the connected project; do not rerun either. For a fresh project, apply migrations in filename order or let the CLI manage the full sequence. No fake users or customer orders are seeded in cloud mode.

## 2. Configure authentication

Enable email/password login and email confirmation. Set Site URL to `http://127.0.0.1:4173` for local development and allow these exact redirect URLs:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/?auth=recovery`

Add the corresponding HTTPS origins before deployment. Keep redirects restricted. Configure a custom SMTP sender for external registration and password recovery; Supabase's default sender is restricted and not a production mail service. Use a verified sending domain and respect the mail provider's free-tier quota.

Set a minimum password length of 12 in the Auth project configuration to match registration and recovery screens. Configure Auth rate limits for expected pilot traffic. Use the same browser for PKCE email links.

## 3. Supply public configuration

Copy `.env.example` to `.env` at the repository root:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

A legacy anon JWT is also accepted. The server rejects service_role and secret keys. Both supported values are intentionally public browser configuration; RLS and RPC permissions enforce authorization.

Run `npm ci` and `npm run dev`. Restart the server after editing .env. For static deployment run `npm run build` with these environment variables set and serve `dist/`. Never expose the repository root or .env as static content.

## 4. Verify two independent workshops

1. Register Alice and Bob using two verified test accounts in separate browser profiles.
2. Create a different workshop for each user.
3. Create an order and attach a harmless device photo as Alice.
4. Reload and verify persistence. Inspect the private bucket and photo metadata.
5. As Bob, attempt direct Data API reads and RPC calls for Alice's IDs. They must return no rows or deny access.
6. Generate a tracking link as Alice and open it signed out. Verify its minimal output.
7. Rotate and revoke the link; older links must stop resolving.
8. Verify incorrect credentials, recovery email and sign-out. No workshop data should survive in the signed-out UI.
9. Test a failed photo upload and retry without leaving intake. Only one order should exist.
10. Verify that table UPDATE/INSERT calls cannot bypass the RPCs.

For additional technicians, the project administrator can insert a membership for an existing verified Auth user through the SQL Editor. Never make membership tables client-writable. Member invitation and ownership transfer UI is deferred.

## 5. Operations before a real pilot

- Keep the bucket private; never add public photo-read policies.
- Enable backups and separately copy Storage objects: database backups do not include photo contents.
- Define retention and an administrator process for abandoned pending photo reservations.
- Enforce size and MIME restrictions; add content inspection if uploads become a public abuse surface.
- Add API-level rate limiting for anonymous tracking before broad public launch. Tokens resist guessing but do not prevent request-volume abuse.
- Remember signed photo URLs remain usable until their short TTL expires.
- Repeat authorization checks against the deployed project; embedded PostgreSQL tests do not test Supabase's HTTP services.

Sources: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [functions](https://supabase.com/docs/guides/database/functions), [Storage access](https://supabase.com/docs/guides/storage/security/access-control), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [backups](https://supabase.com/docs/guides/platform/backups).
