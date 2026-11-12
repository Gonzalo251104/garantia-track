# Pilot photo access check

## Owner deferral — 2026-11-04, America/Lima

The owner explicitly deferred the actual-session photo HTTP exercise after browser-control attempts could not complete it. A connected Chrome application view confirmed GarantiaTrack QA; the in-app browser had separately shown Pilot Workshop B's fictional GT-1049 gallery. Native browser control stopped because it could not verify the current URL confidently. Neither helper download/signing control ran, so authenticated cross-workshop Storage isolation remains **unverified**, not passed or waived for real-data use.

The [pilot runbook](pilot-runbook.md) lists the technical checks and real-customer readiness gates. The owner deferred both the HTTP exercise and further sessions with technicians.

## Continuation check — 2026-11-04, America/Lima

The public `/version.json` was rechecked and returns v0.6.0 at `e750525222a7ff8a58dd882fce14070484d7944a`. Remote main/tag still match that commit; develop remains `ca576ebdf6115d7cda0840ed8b3a35ee580753a6` with identical tracked content. Main CI and release publication succeeded. The only open PR at this check was the unrelated draft #26.

The in-app browser retained Pilot Workshop B's authenticated application view and displayed GT-1049's fictional photo. This is a gallery observation, not an SDK download/signing result. No helper HTTP control was executed. The connected browser inventory exposed no second profile. The native Edge window was listed, but accessibility was unavailable and screenshot capture returned no target, so its session could not be established through that surface.

Actual-session owner and nonmember HTTP controls both remain **pending**. No SQL role simulation or anonymous test was repeated or counted toward them. Use the [guide and blank evidence worksheet](authenticated-photo-access-guide.md) when both profiles are accessible. No account, policy, photo or tracking capability was changed during this continuation.

## Recorded scope — 2026-11-04

Continue fictional pilot preparation after the owner deferred reconciliation of the reported Android label test. That device-specific acceptance remains unverified; do not substitute this access check for it. Published app: v0.5.3, canonical release commit `2b3a797b3f04d620e39128799eae91a58c9e9b12`.

No workshop memberships, Auth settings, policies, tracking capabilities, customer records or photos were changed. The SQL role checks below ran in transactions ending in rollback. No external user JWT was minted or copied. The HTTP smoke client used the existing public key with session persistence and token refresh disabled.

## Hosted database role/claim checks

Each workshop already had a distinct member and existing records. A controlled transaction selected that workshop's member internally, set the request subject/claims locally and used `SET LOCAL ROLE authenticated`. Only counts and booleans were returned. Positive own-workshop counts avoid treating a completely empty result as proof of isolation.

| Subject | Own orders visible | Own stored objects visible | Foreign orders | Foreign photo rows | Foreign stored objects |
| --- | --- | --- | --- | --- | --- |
| Workshop A member | 4 | 4 | 0 | 0 | 0 |
| Workshop B member | 4 | 4 | 0 | 0 | 0 |

Both queries confirmed `current_user = authenticated` and a nonempty subject. Storage filters used the known workshop prefix directly; foreign photo filters did not depend on an order subquery already hidden by RLS. No object path, membership identifier or contact value was included in the report.

These are live database policy checks with simulated request claims. They are not actual sign-in sessions or authenticated nonmember HTTP download/signing tests.

## Hosted anonymous HTTP checks

`npm run smoke:supabase` passed the existing Auth reachability, unknown tracking-token rejection, anonymous receipt-RPC denial, anonymous order-read denial and anonymous upload-denial checks. Email confirmation remained required. No account, order or object was created.

The optional known-photo probe also passed against the existing fictional GT-1049 object. A privileged metadata read selected the ready photo and confirmed the matching Storage object existed; the path was kept outside the report and repository. The anonymous SDK received no bytes and no signed URL. Both calls returned explicit HTTP denial errors, not connection failures. This distinguishes a known-existing object check from a request for a fabricated missing filename.

Repeat only with a known fictional object whose existence and authorized access have been confirmed separately. From the repository, using the existing public `.env` configuration:

```powershell
$env:SMOKE_PRIVATE_PHOTO_PATH = '<workshop-uuid>/<order-uuid>/<photo-uuid>.jpg'
try {
    npm run smoke:supabase
} finally {
    Remove-Item Env:SMOKE_PRIVATE_PHOTO_PATH -ErrorAction SilentlyContinue
}
```

Replace the placeholder locally; do not paste the object path, keys, request headers or a signed URL into reports. This optional variable is not stored in `.env` or a committed fixture. Without it, the script explicitly skips the known-photo probe. Ordinary PR CI does not run this live smoke command or verify hosted authorization.

The script fails if private bytes or a signed capability are returned, or if the response is a network/service failure or invalid-auth response instead of the expected 400/403/404 denial. Malformed input checks report a boolean assertion rather than echoing the supplied path.

Private-bucket download and signed-URL access models are described in [Supabase Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Advisor review

The current security advisor returned the same documented categories: intentional member-checked authenticated definer RPCs (11), the token-limited anonymous tracking RPC (1), RLS without policies on the directly inaccessible tracking table (1 informational finding), and disabled leaked-password protection (1 warning). No finding was automatically dismissed or marked fixed.

See [environment.md](environment.md) for the design rationale. Review references: [anonymous definer RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated definer RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The check does not certify that every privileged function or security property has been audited.

## Remaining acceptance

- Follow [authenticated-photo-access-guide.md](authenticated-photo-access-guide.md) for the actual-session two-profile exercise and summary-only console helper. Its unit tests are separate from hosted evidence.
- Direct authenticated nonmember HTTP download and signed-URL creation still require evidence using the other workshop's actual session. Database role checks and anonymous HTTP denials do not replace that test.
- Establish authorized owner access as a positive control, then use the other account to request the same fictional object through the authenticated Storage API. Expect no bytes and no newly issued signed URL. Keep sessions and authorization headers in their original browser/profile.
- Do not use an owner-issued signed URL as a negative ownership test: that URL is an intentional time-limited bearer capability. Do not transfer it between testers.
- Public customer tracking remains intentionally token-based and separate from workshop photo access. Prior cross-workshop order-route evidence remains separate from this check.
- External SMTP onboarding, complete independent database/Auth/Vault recovery, physical printing and the deferred Android acceptance remain separate pilot gates. Keep using fictional data.
