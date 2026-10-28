# Prototype architecture and migration

## Current design

One static application, no network data services, no dependencies. Hash routing supports dashboard, intake, detail and tracking. Pure helpers separate input validation, currency handling, numbering and customer-facing projection from rendering. localStorage is demo persistence only. System fonts and inline SVG icons avoid third-party requests.

The workshop is a fictional Pixel Lab. The visual system uses forest green, warm off-white and restrained lime highlights. A left rail becomes bottom navigation below 760 px. The table becomes order cards on mobile. Form fields use explicit labels and touch-sized controls. Tracking is intentionally quieter than the workshop panel.

## Production migration

1. Move screens into React/Vite feature folders and shared components.
2. Introduce Hono API routes and authenticated Supabase requests.
3. Add PostgreSQL migrations, workshop membership, composite tenant constraints and tested RLS policies.
4. Replace local numbering with transactional sequences and use idempotency keys on creation.
5. Replace browser photo storage with private object storage, validated uploads and access policies.
6. Replace numeric demo tracking routes with random, hashed, revocable tokens and a minimal server response.
7. Add real state transition rules, manual approval evidence, delivery outcome and payment ledger.
8. Configure SMTP, account recovery, retention, encrypted backups and a verified restore procedure.

Do not add real workshop data before these protections exist. The public projection helper is a rendering convenience and does not secure client-side demo data.

## Operating cost

Local preview costs $0. Static hosting needs no database or runtime for this version. The selected production services and costs must be reviewed before launch; they are not provisioned by this prototype.
