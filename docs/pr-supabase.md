# Proposed pull request

Title: feat(supabase): add authenticated workshop records and private evidence storage

Base: develop (retargeted after PR #1 merged)
Head: feature/supabase-integration

## Summary

The prototype previously saved all records in one browser and had no authorization. Add an explicit demo/connected mode boundary, email/password Auth with registration and recovery, workshop onboarding, PostgreSQL records and private photos while retaining the current responsive interface.

Constrain reads with RLS and perform writes through transactional membership-checked RPCs. Allocate order numbers on the server, deduplicate intake requests and reject stale edits. Replace numeric cloud tracking with hashed, revocable 256-bit tokens and an anonymous allowlisted response.

## Validation

- Syntax checks, ESLint, dependency audit and browser SDK build.
- Domain/configuration tests and executable PostgreSQL tests with two isolated workshop identities.
- Cross-workshop denial, direct-write denial, atomic history, idempotency, stale versions, upload paths, photo limits and token expiry/rotation/revocation.
- Local browser verification recorded separately in qa-results.md.
- Initial remote CI and the live authenticated intake/photo/tracking test passed. Review corrections add three async/payload regression tests (22 results total), align the migration version with remote history, and rerun CI on base edits. Password recovery and separate physical-device testing remain outside this review.

## Checklist

- [x] No privileged keys or real customer records are committed
- [x] Database changes are versioned
- [x] RLS and RPC permissions are tested in embedded PostgreSQL
- [x] Demo remains explicitly separate from connected data
- [x] Setup and operational limitations are documented
- [x] Target Supabase migration applied and anonymous API smoke test passed
- [x] Remote repository configured and draft PR #2 opened
- [x] Initial remote CI passed
- [x] Authenticated photo upload and tracking passed end to end
- [x] Review corrections tested locally
- [ ] Password recovery and separate physical-device test

## Review sequence

PR #1 was reviewed and merged into develop with feature ancestry preserved. PR #2 now targets develop and contains only the integration changes. Merge only after checks pass on its corrected head. Main remains unchanged until a separate release PR.
