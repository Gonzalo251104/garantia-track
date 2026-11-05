# Workshop navigation

## Problem and bounded change

The first technician reported slow screen changes on iPhone 15/Safari. The owner also observed the repeated “Conectando con tu taller” screen. Inspection of v0.7.0 found that every internal route checked workshop membership, then downloaded up to 500 orders with nested events/photo metadata, even for an empty intake form or one order.

The feature keeps membership checks and RLS on every navigation. It changes which data is requested and keeps the workspace navigation visible during internal loading:

| Destination | v0.7.0 | Prepared change |
| --- | --- | --- |
| Reception | Workshop, then up to 500 orders | Workshop only |
| Order detail / ticket | Workshop, then up to 500 orders | Workshop and the requested order, filtered by workshop and number |
| Orders | Workshop, then up to 500 orders | Same fresh reads in parallel when a workshop is already known |

For detail/ticket, the two reads also run in parallel when the workshop is known. On first entry, membership resolves before the scoped data read. The previous workshop ID is a query hint, never authorization. If the checked workshop changes, the hinted result/error is discarded and the new workshop is read. Missing membership clears local orders and recovered receipt links. Auth changes, navigation generations and query errors prevent stale results from becoming the active view. No private records are persisted in a new cache and no offline fallback is introduced.

The connection screen remains appropriate for initial session setup. Internal navigation shows a destination-specific loading message inside the workspace instead. Order forms from the previous screen are removed during loading; late saves retain their existing context guards. A direct order or reception entry does not display an incomplete list count as a total. The dashboard still refreshes the full recent list before search/export; existing mutation refreshes remain unchanged.

## Validation and limits

Unit tests cover concurrent reads gated by fresh membership, no order reads for reception/unknown routes, scoped detail/ticket reads, workshop changes, membership removal, obsolete navigation/account results, missing orders and provider failures. A local HTTP contract test uses the actual bundled SDK to check workshop/number filters, nested history/photo metadata and missing results. Fixture filters are contract behavior, not proof of hosted RLS.

On 2026-11-04 (America/Lima), lint, syntax checks, all 81 tests and build passed. Initial sandboxed HTTP tests hit loopback `EACCES`; they passed with scoped local network permission. Tightening the fixture's workshop filters also exposed old tests using a workshop alias that differed from its stored UUID; those tests now use the fixture UUID.

The actual app and SDK were exercised in the desktop in-app browser against the isolated fixture with a synthetic 1,200 ms delay per workshop/order read. Reception loading kept navigation visible; switching orders → reception before the first response completed ended at the reception form. The request summary showed workshop-only reception reads and a number-filtered detail read. Reloading detail recovered the saved history/notes; it did not label the single loaded record as a complete list total. At 390 × 844, detail and reception had no horizontal overflow and reception's submit control became enabled after loading. Temporary viewport changes were reset and the local server stopped after validation. No production record/session was used for these checks.

Use the isolated loopback fixture to inspect the actual UI, including a delayed response, rapid navigation, detail/reload and mobile layout. The optional `readDelayMs` and `/__fixture/navigation` provide synthetic delay and safe request summaries without recording authentication headers or private data. Artificial delays and desktop mobile viewports do not measure iPhone/Safari or production latency.

After release, repeat orders → reception → orders → one order on the technician's physical phone and connection. Record time to usable controls and any confusion. Keep the four-state editor, draft-saving behavior, private photo recovery and receipt flow in the acceptance scope. A hosted deployment and physical-phone improvement are not established by the feature PR alone.

The scoped query uses the SDK's documented [chained equality filters](https://supabase.com/docs/reference/javascript/using-filters). No SDK upgrade, schema migration or policy change is required.
