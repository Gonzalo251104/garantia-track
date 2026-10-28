# Architecture

The existing buildless interface and visual system remain intact. This iteration adds a small SDK bundle and backend adapter instead of rewriting validated screens into another framework.

## Runtime

Browser interface → official Supabase SDK → Auth / PostgREST RPCs / private Storage.

No privileged application server is needed for this scope. PostgreSQL functions perform membership checks and transactional writes. The development Node server only serves static files and explicitly public configuration; it has no database password or service key. This is a deliberate simplification of the earlier Hono proposal.

## Trust boundaries

The client can supply untrusted values and JWT sessions; the server validates tokens and PostgreSQL enforces membership. RLS and table privileges constrain reads. Write RPCs are SECURITY DEFINER with empty search paths, fully qualified application tables, explicit membership checks and narrow grants.

Tracking links are bearer capabilities. Their separate RPC bypasses tenant RLS only to return a fixed allowlist. It never returns photo URLs, credentials or internal/customer records. Tokens must not appear in analytics, logs or query strings.

## Storage consistency

Intake commits first with a unique workshop/request key. Photo reservations then allocate up to five paths under workshop/order/photo IDs. Upload is immutable and metadata becomes ready only after the object exists. Retrying the same form reuses request/photo identifiers, so an acknowledged or ambiguous upload is finalized rather than duplicated. Database and object storage are not one transaction: partial completion is explicit and documented.

## Local demo

Demo data remains in its original localStorage key and requires an explicit sessionStorage mode choice. Connected records never enter that store. Missing configuration fails closed. Auth sign-out and identity changes clear in-memory workshop records.

## Portability and remaining work

Schema migrations are ordinary PostgreSQL, with Auth uid and Storage table dependencies isolated in a small number of policies/RPCs. Replacing Supabase requires replacing those integrations, session handling and the SDK adapter; it is not a zero-effort migration. No vendor-neutral repository hierarchy is introduced before a second provider exists.

The interface loads 500 recent orders. Paginated server search, member management, server-side image inspection, background cleanup, application-level abuse controls and monitoring are future work. Static generated assets require npm build before deployment.
