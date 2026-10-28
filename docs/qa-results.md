# QA results — 2026-10-27

## Passed

- `npm run check`: both browser ES modules pass Node syntax checks.
- `npm test`: six domain tests pass.
- Local HTTP server returns status 200.
- Desktop dashboard rendered and visually reviewed in the in-app browser.
- Intake created fictional order GT-1046 with a customer, phone, model, issue and cable accessory.
- Detail displayed the saved intake information.
- Status updated to ready, quote to PEN 85.50 and customer message to a pickup notice.
- Customer view displayed the updated state and message, without the phone or internal QA note.
- Reload retained the order and tracking page.
- Search with an unmatched term displayed the empty state.
- At a 390 × 844 viewport override, tracking, dashboard and intake had no horizontal document overflow. Tracking and intake were visually reviewed.
- The temporary viewport override was reset after testing.

## Evidence

- `dashboard-desktop.png`
- `tracking-mobile.png`

## Not verified in browser

Photo attachment/compression, CSV download contents, print output and reset confirmation are implemented but were not exercised during this browser pass. No physical phone, screen reader, multi-browser compatibility or production security test has been performed.

## Repository and publication

The prototype remains on a local feature branch. No merge, remote push or PR was performed. No Site version was published. The local server must be started with `npm run dev` to use the preview.
