import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { safeDiagnostic, RecoveryFailure } from '../scripts/recovery/diagnostics.mjs';

const secret = 'NEVER_PRINT_PRIVATE_PASSWORD_OR_TOKEN';
test('Recovery diagnostics ignore sensitive provider fields and arbitrary error codes', () => {
  for (const stage of ['database-connect', 'privacy-setup', 'export-record', 'archive-write', 'restore-record', secret]) {
    const result = safeDiagnostic({ code: secret, message: secret, detail: secret, hint: secret,
      stack: secret, query: secret, parameters: [secret] }, stage);
    assert.equal(result.includes(secret), false);
    assert.match(result, /^\[GT-RECOVERY:CHECK_STAGE\] Stage:/);
  }
  assert.equal(safeDiagnostic(new RecoveryFailure(secret), 'arguments').includes(secret), false);
});
test('Known failures give fixed guidance without weakening protections', () => {
  const cases = [['database-connect', '28P01', 'AUTHENTICATION'], ['database-connect', 'ENOTFOUND', 'NETWORK'],
    ['database-connect', 'SELF_SIGNED_CERT_IN_CHAIN', 'TLS_TRUST'], ['privacy-setup', '42501', 'PERMISSION'],
    ['export-record', '42501', 'PERMISSION'], ['archive-write', 'EEXIST', 'OUTPUT_EXISTS']];
  for (const [stage, code, expected] of cases) {
    const output = safeDiagnostic({ code, message: secret }, stage);
    assert.ok(output.startsWith(`[GT-RECOVERY:${expected}] Stage: ${stage}.`));
    assert.equal(output.includes(secret), false);
  }
  assert.match(safeDiagnostic({code: 'SELF_SIGNED_CERT_IN_CHAIN'}, 'database-connect'), /Keep certificate verification enabled/);
  assert.match(safeDiagnostic({code: '42501'}, 'privacy-setup'), /Keep this protection/);
});
test('Operator preconditions produce only allowlisted reason codes', () => {
  for (const reason of ['USAGE', 'TERMINAL', 'ARCHIVE_LOCATION', 'PROJECT', 'ENDPOINT', 'PASSPHRASE_LENGTH', 'PASSPHRASE_CONFIRMATION', 'CANCELLED', 'ARCHIVE_LIMIT']) {
    assert.match(safeDiagnostic(new RecoveryFailure(reason), 'secret-input'), new RegExp(`^\\[GT-RECOVERY:${reason}\\]`));
  }
});
test('CLI usage and terminal errors never echo supplied arguments', () => {
  for (const args of [[secret], ['backup', secret]]) {
    const run = spawnSync(process.execPath, ['scripts/recovery/vault.mjs', ...args], {encoding: 'utf8'});
    assert.equal(run.status, 1);
    assert.equal(run.stderr.includes(secret), false);
    assert.equal(run.stdout.includes(secret), false);
    assert.match(run.stderr, /GT-RECOVERY:(USAGE|TERMINAL)/);
  }
});
