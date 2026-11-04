# Actual-session photo access exercise

Use the published v0.5.3 app, two separate browser profiles and only the fictional GT-1049 photo. This is a manual operator exercise; the helper's unit tests do not constitute hosted authorization evidence. No deployment is needed to run the helper from the repository.

## 1. Identify the known fictional object locally

In the production project's Supabase SQL Editor, run this read-only query:

```sql
select p.path
from public.order_photos p
join public.repair_orders o on o.id = p.order_id
join public.workshops w on w.id = o.workshop_id
where o.number = 1049
  and w.name = 'Pilot Workshop B'
  and p.state = 'ready';
```

Expect exactly one row. Keep that object path locally for the two runs; it is a bucket object name, not a signed URL. Do not paste it or request headers into the report. If no row or multiple rows appear, stop and reconcile the fixture before interpreting any access denial.

## 2. Positive control: Workshop B

Open the public app in Workshop B's existing browser profile and confirm `Pilot Workshop B` in the header. Open GT-1049 and confirm the expected fictional photo renders. Use the orders page for the console exercise, not an unfinished intake.

Open DevTools > Console. Copy the complete contents of [check-photo-access.js](../scripts/browser/check-photo-access.js) into the console. This defines a function; then run:

```javascript
await checkPrivatePhotoAccess()
```

Paste the object path only into the local prompt. The helper imports the already deployed SDK and uses that profile's existing authenticated session. It does not ask for a key, password, access token or service-role credential. It independently validates the session and membership before testing Storage.

Expected summary: `context: owner`, `authenticated: true`, `result: PASS`, both HTTP statuses 200, `downloadReturnedData: true` and `signedUrlIssued: true`. File bytes stay in memory and the signed capability is not printed, copied to the clipboard or saved. If this control fails or says `nonmember`, stop; a missing object or wrong account must not be counted as tenant isolation.

## 3. Negative control: Workshop A

Use a different browser/profile signed in to `GarantiaTrack QA` (Workshop A). Two tabs in the same profile share authentication and are not two independent sessions. Repeat the helper definition and call on the same published app origin, entering the same fictional object path locally.

Expected summary: `context: nonmember`, `authenticated: true`, `result: PASS`, `downloadReturnedData: false`, `signedUrlIssued: false` and explicit denial statuses (400, 403 or 404). The session is checked before Storage, so an anonymous caller cannot pass this test as an authenticated outsider.

`INCONCLUSIVE` indicates a network, authentication or service error; it is not a passing denial. `STOPPED` includes only a stage: check the deployed app/workshop context, path format and active sign-in. `FAIL` requires investigation before real-data use. Do not copy raw provider errors or network headers into the report.

## 4. Finish and report

Record only the two summary tables, the workshop labels, app version, browser and date. Do not include the path, signed link, user identifiers, email or credentials. Reload the app after the exercise to discard the temporary console definition/client. The helper does not sign out, upload, delete or change policies.

An owner-issued signed URL intentionally grants temporary bearer access. Opening that URL in the other profile is not the negative test; request a new download/signing operation with the other profile's own session, as above. See [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

The helper is a developer/operator script under `scripts/browser`, not a production app screen. Its unit coverage checks owner/nonmember classification, anonymous rejection, inconclusive failures and output minimization. Hosted acceptance remains pending until the actual two-profile results are recorded.
