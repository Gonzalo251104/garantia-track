# Workshop navigation

The signed-in workspace opens on **Panel**, with four totals linking to matching filters in **Órdenes**. **Recepción** opens the intake form, and the workshop name opens **Taller** settings. Panel and Orders use the existing latest 500 order listing and its workshop scope. The two views show a notice when the listing reaches that limit.

## Problem and bounded change

The test user reported slow screen changes on iPhone 15/Safari. The owner also observed the repeated “Conectando con tu taller” screen. Inspection of v0.7.0 found that every internal route checked workshop membership, then downloaded up to 500 orders with nested events/photo metadata, even for an empty intake form or one order.

The feature keeps membership checks and RLS on every navigation. It changes which data is requested and keeps the workspace navigation visible during internal loading:

| Destination | v0.7.0 | Prepared change |
| --- | --- | --- |
| Reception | Workshop, then up to 500 orders | Workshop only |
| Order detail / ticket | Workshop, then up to 500 orders | Workshop and the requested order, filtered by workshop and number |
| Orders | Workshop, then up to 500 orders | Same fresh reads in parallel when a workshop is already known |

For detail/ticket, the two reads also run in parallel when the workshop is known. On first entry, membership resolves before the scoped data read. The previous workshop ID is a query hint, never authorization. If the checked workshop changes, the hinted result/error is discarded and the new workshop is read. Missing membership clears local orders and recovered receipt links. Auth changes, navigation generations and query errors prevent stale results from becoming the active view. No private records are persisted in a new cache and no offline fallback is introduced.

The connection screen remains appropriate for initial session setup. Internal navigation shows a destination-specific loading message inside the workspace instead. Order forms from the previous screen are removed during loading; late saves retain their existing context guards. A direct order or reception entry does not display an incomplete list count as a total. The dashboard still refreshes the full recent list before search/export; existing mutation refreshes remain unchanged.

## Validation and limits

### Follow-up: retained transitions prepared for v0.9.1

Implemented through PR #56, merged into develop at `1ea6a921cf79a79b868a7accbc6c8a191f916e7e`. The [v0.9.1 release candidate](releases/v0.9.1.md) records publication and rollback steps. Public v0.9.0 remains deployed during preparation; release preparation does not publish the frontend.

The v0.7.1 scoped reads reduced unnecessary data downloads, but internal routes still replaced the page with a loading heading. The follow-up keeps the actual authorized page DOM visible until the fresh destination is ready. A small fixed status and top progress line indicate the requested destination; desktop/mobile navigation and sign-out remain available. The previous main content is inert and marked busy, so it cannot submit a form or open a stale order while navigation is pending. The active section continues to describe the displayed page; the pending destination has its own outline. The completed destination receives focus when ready; the existing route scroll-to-top behavior is preserved.

Every route still checks membership and makes the same scoped reads. The change introduces no private-data persistence or offline fallback. A newly checked workshop change or missing membership clears the retained page before waiting for another workshop's data. Authentication/account/recovery changes clear it immediately. A current read error clears the previous content and shows the existing retry/access guidance. Obsolete requests cannot clear or replace a newer transition.

Form, photo-recovery, image-loading and private-link callbacks now also check their render generation: retained DOM attachment alone does not make the old view current. A request already submitted can still finish on the server, but its late callback cannot save again, redirect navigation, show success in another screen or update the active workshop identity. The photo viewer still closes at navigation start. Draft values remain in the retained DOM only during the transition; moving to another screen keeps the existing draft-discard behavior. This is a visual continuity change, not evidence of lower network latency or cross-route draft saving. Initial loads, reloads and changed-access flows can still show the connection screen.

Transition tests cover retained page identity/draft state, inert controls, rapid destination replacement, cleanup without re-enabling previously disabled controls, and initial/external views. Membership tests verify that a scope change is reported before new-workshop data resolves and that an obsolete membership result cannot affect the new view. Browser acceptance uses the actual app/SDK and the isolated loopback fixture with an artificial 1,800 ms delay, separate from hosted RLS or physical-phone performance evidence.

On 2026-11-05 (America/Lima), lint, syntax, 108 tests and build passed. Browser checks at 1280 × 800, 390 × 844 and 320 × 568 confirmed the old page remained visible/inert, the indicator fit without horizontal overflow, navigation stayed available and the completed destination became usable/focused. A pending intake draft stayed intact during rapid reception → workshop → orders changes; only the final orders destination committed. This does not preserve that draft after leaving reception. Signing out during a pending route removed the workspace, and the delayed response did not restore it. Stopping the owned local fixture before a route read produced the existing connection-error/retry view with no retained workspace or stuck indicator. The fixture stayed at one seeded order, zero photos/objects and one initial event. Viewport overrides were reset and the owned preview tab/server closed. The retained transitions shipped in v0.9.1. These timings cover the local fixture.

The retained content uses the standard HTML [inert subtree](https://html.spec.whatwg.org/multipage/interaction.html#inert-subtrees) behavior; server-side authorization remains unchanged. Existing [Supabase Auth state events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) continue to invalidate account/recovery context.

Unit tests cover concurrent reads gated by fresh membership, no order reads for reception/unknown routes, scoped detail/ticket reads, workshop changes, membership removal, obsolete navigation/account results, missing orders and provider failures. A local HTTP contract test uses the actual bundled SDK to check workshop/number filters, nested history/photo metadata and missing results. Fixture filters are contract behavior, not proof of hosted RLS.

On 2026-11-04 (America/Lima), lint, syntax checks, all 81 tests and build passed. Initial sandboxed HTTP tests hit loopback `EACCES`; they passed with scoped local network permission. Tightening the fixture's workshop filters also exposed old tests using a workshop alias that differed from its stored UUID; those tests now use the fixture UUID.

The actual app and SDK were exercised in the desktop in-app browser against the isolated fixture with a synthetic 1,200 ms delay per workshop/order read. Reception loading kept navigation visible; switching orders → reception before the first response completed ended at the reception form. The request summary showed workshop-only reception reads and a number-filtered detail read. Reloading detail recovered the saved history/notes; it did not label the single loaded record as a complete list total. At 390 × 844, detail and reception had no horizontal overflow and reception's submit control became enabled after loading. Temporary viewport changes were reset and the local server stopped after validation. No production record/session was used for these checks.

Use the isolated loopback fixture to inspect the actual UI, including a delayed response, rapid navigation, detail/reload and mobile layout. The optional `readDelayMs` and `/__fixture/navigation` provide synthetic delay and safe request summaries without recording authentication headers or private data. Artificial delays and desktop mobile viewports do not measure iPhone/Safari or production latency.

Further physical-phone observation is deferred. The release and fixture evidence cover their recorded environments.

The scoped query uses the SDK's documented [chained equality filters](https://supabase.com/docs/reference/javascript/using-filters). No SDK upgrade, schema migration or policy change is required.
