# Workshop name settings

## Scope

The first technician reported that Taller did not open settings and the workshop name could not be changed. The prepared feature routes the connected mobile Taller tab and desktop Taller link to `#/workshop`, with a selected navigation state. It uses the existing workspace layout and fresh membership read; it does not download the order list for this route.

The form shows the current name and an explicit **Guardar nombre** action. A confirmed save updates the input, header and sidebar without remounting the form, and announces **Nombre del taller guardado**. An unchanged name does not write. Names are trimmed and limited to 2–80 characters without control characters; all displayed/attribute values are escaped or assigned as text. Provider errors retain the draft. A stale expected name produces a reload/retry instruction rather than silently overwriting another session's change.

Only the current workshop owner can rename. The UI derives editability from the already readable `owner_id`; this is presentation, not authorization. Technicians see the name and an ownership explanation without edit/save controls. A direct demo settings route is read-only; existing demo tracking navigation remains available. This feature does not add invites, role changes, ownership transfer or other workshop fields.

The new name is used by the workspace, live customer tracking and tickets prepared after the change. Existing downloaded/printed documents retain their previous text. Orders retain the same workshop ID. A rename does not rotate, revoke or extend tracking links, replace photos or change Vault capabilities.

## Backend boundary and migration

Apply `supabase/migrations/20261105031213_workshop_name_settings.sql` through the reviewed release process **before publishing the new frontend**. It was generated with the official CLI's `migration new` command (temporary CLI 3.0.0; no project dependency update). Preparation did not apply DDL or rename a production workshop.

- `public.rename_workshop(uuid,text,text)` is an invoker wrapper exposed to the Data API. The security-definer implementation lives in `private.rename_workshop`; both have an empty `search_path` and fully qualified application references.
- Execute is revoked from PUBLIC/anon and granted only to authenticated. No UPDATE/INSERT/DELETE table grant or RLS policy is added. The existing workshop/member RLS remains enabled.
- The implementation requires a non-null authenticated identity, matching `workshops.owner_id` **and** a current owner membership for that workshop. Missing/foreign workshops and insufficient roles return the same permission error. User-editable metadata is not used for authorization.
- A workshop row lock serializes name writes. `p_previous_name` must match the saved name before a different name is written. An identical target name succeeds as an idempotent retry after a lost response. Comparison is by expected name, not an added workshop version column.
- The RPC returns the confirmed workshop record. The UI validates its ID/name and ignores responses after view, account or workshop changes. Leaving during a request does not cancel a server write already in progress; reopening reads the current saved name.

The production read-only preflight confirmed existing columns, owner membership roles, enabled RLS and no direct authenticated workshop UPDATE grant. No rename function existed there. No project key lookup, Auth/SMTP setting change or real customer record was needed.

The unchanged production security-advisor baseline was also read before committing: [RLS enabled without a policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [anonymous-executable security-definer function](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated-executable security-definer function](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). These are existing categories, not findings produced by this unapplied migration. Review their object-specific context during release; do not remove required tracking RPC access or weaken controls to clear the list.

## Validation

On 2026-11-04 (America/Lima), lint, syntax checks, 95 tests and build passed locally. PGlite executes the base schema and new migration under authenticated/anon roles: owner success, technician/nonmember/other-owner/missing-session denial, owner-ID and membership consistency, invalid/stale names, idempotent retries, direct-table write denial and invoker/definer grants. The existing Vault contract suite also confirms unchanged order/event/secret/link rows and the same expiry/capability while public tracking displays the new name. The Vault double is not encryption or independent recovery evidence.

The actual SDK over an isolated loopback HTTP fixture checks save/reload, invalid/stale/foreign failures and a technician denial contract. The fixture's role/permission behavior is not hosted RLS or a real authenticated two-workshop exercise. UI checks use only synthetic sign-ins and fictional names; no real account/session is transferred.

The actual app was inspected in the desktop in-app browser with isolated owner/technician fixtures. The owner saved an accented name containing an ampersand; confirmation, input, header and sidebar updated. A second tab with the previous name was denied a conflicting rename, retained its draft and showed the current saved name after reload. Mobile Orders → Taller navigation selected the correct tab and recovered the saved name; full reload also preserved it. At an observed 390 × 844 viewport, the field font was 16 px, the save target was 48 px high and there was no horizontal overflow. The technician view displayed the ownership explanation and no editable name/save control. Preview tabs were closed, temporary viewport changes reset and the owned loopback servers stopped after inspection. These are local responsive/contract results, not hosted or physical-device acceptance.

## Release and pilot acceptance

1. Review the feature PR into develop with current-head CI. Validate the additive migration in the isolated lab before production application; preserve existing lab recovery evidence. Publish only approved source through the normal release/main/Sites flow. Keep draft recovery PR #26 excluded.
2. Verify the migration's function grants/security settings and unchanged workshop/member RLS after application. Check advisors for new findings, comparing against the existing baseline rather than attributing old findings to this change.
3. In an authorized fictional owner session, open Taller from mobile/desktop, save an invented name, see confirmation/header update, navigate away/back and reload. Check long/accented names for readable mobile layout.
4. In a separate authorized technician/other-workshop session where available, verify read-only/denied behavior without sharing sessions or extracting JWTs. Local SQL/fixture tests do not replace hosted authenticated checks.
5. Check the renamed display in a newly prepared ticket and existing private customer tracking while preserving the order, QR and original expiry. Keep private links and signed photo URLs out of reports/screenshots.
6. Reobserve on the technician's physical phone. Desktop mobile viewports are not physical Safari acceptance. The pilot remains fictional until the separately documented real-data gates are closed.

The migration is additive and compatible with the previous frontend. A frontend rollback can retain it; avoid dropping functions, changing permissions broadly or restoring an older database just to undo a name display. The owner can save the previous name through the same guarded action when appropriate.

References: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
