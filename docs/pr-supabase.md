# Proposed pull request

Title: feat(supabase): add authenticated workshop records and private evidence storage

Base: feature/navigable-prototype (stacked dependency)
Head: feature/supabase-integration

## Summary

The prototype previously saved all records in one browser and had no authorization. Add an explicit demo/connected mode boundary, email/password Auth with registration and recovery, workshop onboarding, PostgreSQL records and private photos while retaining the current responsive interface.

Constrain reads with RLS and perform writes through transactional membership-checked RPCs. Allocate order numbers on the server, deduplicate intake requests and reject stale edits. Replace numeric cloud tracking with hashed, revocable 256-bit tokens and an anonymous allowlisted response.

## Validation

- Syntax checks, ESLint, dependency audit and browser SDK build.
- Domain/configuration tests and executable PostgreSQL tests with two isolated workshop identities.
- Cross-workshop denial, direct-write denial, atomic history, idempotency, stale versions, upload paths, photo limits and token expiry/rotation/revocation.
- Local browser verification recorded separately in qa-results.md.
- Initial remote CI passed. Migration applied to the live development project; anonymous API smoke tests and rolled-back live tenant/RPC checks passed. User email flows and authenticated Storage uploads remain pending.

## Checklist

- [x] No privileged keys or real customer records are committed
- [x] Database changes are versioned
- [x] RLS and RPC permissions are tested in embedded PostgreSQL
- [x] Demo remains explicitly separate from connected data
- [x] Setup and operational limitations are documented
- [x] Target Supabase migration applied and anonymous API smoke test passed
- [x] Remote repository configured and draft PR #2 opened
- [x] Initial remote CI passed
- [ ] Auth email flows and authenticated photo upload passed end to end

## Review sequence

Review the prototype PR into develop first. This integration branch was based on that feature because permanent branches still contain only initialization. Use a stacked PR against the prototype branch now, or retarget/rebase onto develop after that review merges. Do not simulate review with a local merge or push directly to a permanent branch.
