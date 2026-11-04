# Independent order status changes

Prepared on `feature/quick-order-status` after the owner authorized the next improvement from [GT-1051 technician feedback](pilot-observation-t1.md). This is feature-branch implementation, not a deployed release or physical-phone acceptance. Public v0.6.0 remains the pilot baseline until a separate release is published and deployed.

## Operator behavior

The order detail places a **Cambiar estado** panel near the heading. Four large primary choices follow the technician's daily vocabulary:

| Label | Existing stored value |
| --- | --- |
| Recibido | `received` |
| En reparación | `repairing` |
| Listo para entregar | `ready` |
| Entregado | `delivered` |

**Otros estados** retains En diagnóstico (`diagnosing`) and Por aprobar (`awaiting_approval`). When an order currently uses either value, that section starts open and its radio is selected. The current saved state is always shown separately. Existing statuses and event history are not deleted or remapped. The ready label changes from Listo para recoger to Listo para entregar across the interface/receipt through the shared label map; the stored value remains `ready`.

Selecting a choice does not write. **Guardar estado** explicitly saves only the chosen status and reports the confirmed saved state. Selecting the already saved state makes no request. All six existing values remain valid, without enforcing a new transition sequence. There are no automatic customer messages.

The separate **Presupuesto y mensajes** form saves quote, internal note and public message with the latest saved status. It no longer has a second status selector. Status saving leaves those form controls mounted, preserving drafts even if their contents would not pass that other form's validation. Draft fields are neither implicitly saved nor cleared. Saving the other form afterward uses the refreshed order version/status, preventing an accidental status reversal.

## Data and authorization

Both actions use the existing `update_repair_order` RPC through `backend.update` and the existing workshop reload. A status-only request copies the last saved quote/note/message, not current input values. The server's membership checks, version comparison, field validation and transactional status event remain authoritative. No migration, policy, key, Auth setting, direct table write or dependency change is needed.

The two submit actions share a busy guard. Status choices are disabled while saving; pending responses check the originating form/account/workshop. A removed view cannot receive success or mutate a replacement view's UI. Stale-version errors remain explicit and ask for reload; there is no automatic overwrite/retry. If the update succeeds but its reload cannot confirm the intended state, do not report success; reload before saving again.

After confirmed success, only the current status and event list refresh. Photo/recovery controls, the quote/message inputs and tracking capability controls remain mounted. Keyboard focus returns to the submit action when disabling it caused focus to fall to the document; a user who moved into another draft field keeps that focus. The existing RPC's delivery behavior is preserved; the UI does not call tracking creation, renewal or revocation.

## Validation scope

Automated coverage exercises four primary/six available choices, current additional states, persisted-field/history preservation, no-op/invalid/busy/stale submissions, provider errors and keyboard focus restoration without stealing draft focus. An actual-SDK local HTTP check covers the existing RPC/version arguments, all primary/additional values, persisted fields, single events and stale-version rejection. Existing database authorization/receipt/photo tests remain separate evidence; the fixture is not a hosted RLS emulator.

Assisted browser checks against an isolated loopback fixture confirmed:

- A current additional state was selected with Otros estados open.
- Changing status with an invalid quote and two unsaved message/note drafts preserved all three controls; the fixture's saved quote/note/message stayed unchanged.
- Repeating the same saved status did not change the fixture version/event count.
- Saving the quote/messages afterward preserved the new state, and another status update/reload preserved those saved fields.
- A simulated concurrent update produced the stale-version error and retained the draft, without a success message.
- Radio arrow keys changed selection without saving; keyboard submission saved, announced its result and restored button focus.
- Inspected 320/390/900 px desktop-browser viewports had no horizontal overflow; option text was 16 px and the observed mobile choices were at least 68 px high.
- Explicit local demo also preserved an unsaved note during status saving; after reload, the state persisted and the unsaved note had not been written.

Only synthetic loopback data was changed. The temporary viewport was reset and preview tooling/screenshots stay ignored. No production order, tracking token or photo was changed. These results do not measure physical iPhone/Safari performance, certify live cross-workshop photo HTTP isolation or prove external email delivery. The deferred authenticated photo exercise remains deferred.

## Next pilot acceptance after deployment

On a new or existing explicitly fictional order, ask the technician to change to their next daily state without pointing to controls. Check that a typed but unsaved note survives, saving the note does not revert the status, reload retains the status, and private customer tracking shows the same state/public message. For an order in diagnosing/approval, confirm it remains visibly selected. Record whether fewer visible choices reduce confusion; do not infer faster use from the desktop fixture.
