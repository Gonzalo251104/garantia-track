import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureParameterPrivacy, inspectParameterPrivacy } from '../scripts/recovery/privacy.mjs';
import { safeDiagnostic } from '../scripts/recovery/diagnostics.mjs';

function fixture(initial, { ignoreSet = false } = {}) {
  const row = { ...initial }, calls = [];
  return { calls, async query(sql) {
    calls.push(sql);
    if (sql.startsWith('select')) return { rows: [{ ...row }] };
    if (!ignoreSet && sql === 'set log_parameter_max_length=0') row.parameters_suppressed = true;
    if (!ignoreSet && sql === 'set log_parameter_max_length_on_error=0') row.errors_suppressed = true;
    return { rows: [] };
  } };
}
const unprivileged = { parameters_suppressed: false, errors_suppressed: true, can_set_parameters: false, can_set_errors: false };

test('hosted-role privacy denial stops before any SET or secret operation', async () => {
  const db = fixture(unprivileged);
  assert.equal((await inspectParameterPrivacy(db)).canConfigure, false);
  await assert.rejects(ensureParameterPrivacy(db), error => {
    assert.equal(error.reason, 'PRIVACY_PERMISSION');
    assert.match(safeDiagnostic(error, 'privacy-setup'), /Do not bypass the guard/);
    return true;
  });
  assert.ok(db.calls.every(sql => sql.startsWith('select')));
});

test('already-protected unprivileged sessions pass by verification without SET', async () => {
  const db = fixture({ ...unprivileged, parameters_suppressed: true });
  await ensureParameterPrivacy(db);
  assert.equal(db.calls.length, 2);
  assert.ok(db.calls.every(sql => sql.startsWith('select')));
});

test('only authorized missing protections are configured and verified', async () => {
  const db = fixture({ ...unprivileged, can_set_parameters: true });
  await ensureParameterPrivacy(db);
  assert.deepEqual(db.calls.filter(sql => sql.startsWith('set')), ['set log_parameter_max_length=0']);
  const partial = fixture({ ...unprivileged, errors_suppressed: false, can_set_errors: true });
  await assert.rejects(ensureParameterPrivacy(partial), { reason: 'PRIVACY_PERMISSION' });
  assert.equal(partial.calls.some(sql => sql.startsWith('set')), false);
});

test('ineffective changes and malformed metadata fail closed', async () => {
  const db = fixture({ ...unprivileged, can_set_parameters: true }, { ignoreSet: true });
  await assert.rejects(ensureParameterPrivacy(db), { reason: 'PRIVACY_VERIFY' });
  for (const rows of [[], [{}], [null], [{ parameters_suppressed: 'true' }]]) {
    await assert.rejects(ensureParameterPrivacy({ query: async () => ({ rows }) }), { reason: 'PRIVACY_VERIFY' });
  }
});
