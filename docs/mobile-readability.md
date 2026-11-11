# Mobile readability and concise guidance

Prepared on 2026-11-06, America/Lima, after the owner's report that the test user saw many small annotations during the fictional iPhone 15/Safari session with GT-1051. The original report did not identify individual labels or include an accessibility audit. Inspection of the v0.10.0 frontend found 10–12 px navigation, field labels and helper text, plus repeated decorative descriptions.

## Change

- Add a screen-only typography layer: form labels and controls use 1 rem (16 px at the default root size); secondary guidance, navigation, filters and status badges use at least .875 rem (14 px). Primary buttons retain 48 px targets and other buttons/navigation links have at least 44 px targets.
- Darken secondary text and status badge text. Keep the existing green palette, focus indicators, native controls and responsive shell.
- Wrap long models/customer names. On narrow screens, put customer information on its own row, keep the status and order action together, and stack detail fields and status choices. Let filters, headings and panel actions wrap.
- Remove the four decorative counter captions and repeated panel descriptions. Replace the connected dashboard's two explanatory cards with a native `details`/`summary` disclosure about tracking links.
- Give reception a direct heading, one required-field/fictional-pilot note, an inline optional-series label and one photo hint with formats, count, size and visibility. Remove the redundant connected phone hint and the pre-save text that previously said changes were already saved.
- Keep internal-note/customer-message visibility, photo privacy, upload limits, QR invalidation and demo limitations visible. Condense the order's QR explanation without changing its meaning or actions.

This changes presentation and wording only. No dependencies, schema, permissions, authentication, scoped backend writes, photo handling or tracking capabilities change. The extra stylesheet uses screen media rules; thermal paper dimensions, print rules and PDF generation retain their existing typography.

## Validation

Local browser checks used the actual frontend and bundled SDK against the existing loopback HTTP contract fixture, with invented sign-in values and in-memory data. This is not hosted Supabase authorization evidence. No production order, account, photo or tracking link was created or changed.

- Checked Orders, Reception, saved-order detail, Taller and the sign-in view at 320 px, with 390 px mobile, 844 px landscape and 1280 px desktop spot checks. Checked demo orders, reception and customer tracking at 320 px. Observed no page-level horizontal overflow in these checks.
- Inspected computed typography: visible application text had no sizes below 14 px in the checked views, excluding the deliberately unchanged thermal paper. Editable text fields and file controls were 16 px; mobile navigation labels were 14 px with 60 px targets.
- Used a long fictional model and customer name. Confirmed wrapping and preserved status/order actions; kept desktop status labels and order actions from breaking within words.
- Opened the dashboard help with Space. Used the native equipment radio group with an arrow key. A blank reception still identified the four required fields; created a complete Other order only in the local demo.
- Changed a fixture order from approval to repairing, saved internal/public messages and reloaded. State and both distinct messages remained saved.
- Checked demo ticket paper at both widths: existing 72/48 mm content widths and 12/11 px paper typography remained intact; screen instructions were 14 px. Did not invoke a physical printer or send a ticket.
- Calculated contrast for the selected secondary text, upload/field text and all six badge foreground/background pairs: minimum 5.82:1, above the 4.5:1 reference threshold for normal text. This is a bounded palette check, not a claim that the entire site meets WCAG.
- Lint, syntax, 113 existing tests and build passed. The first restricted test run could not connect to its loopback servers; all 113 passed with loopback access, without changing tests.

References: [W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow at 320 CSS px](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), and [text resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). These informed the checks; no physical Safari, browser zoom or assistive-technology certification is claimed.

## Published scope

The changes shipped in v0.10.1. The owner relayed that the test user completed three later reading tasks without help or zoom. That report was limited to those tasks. Further physical-phone checks are deferred.
