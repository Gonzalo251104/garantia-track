import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { seal, unseal, validateRecord, assertDestination, orderId, sourceProject } from '../scripts/recovery/archive.mjs';
import { restoreRecord } from '../scripts/recovery/database.mjs';

const token = 'a'.repeat(64);
const record = { version: 1, source: sourceProject, orderId, number: '1044', token,
  tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: '2099-01-01T00:00:00.000Z', revokedAt: null };
const row = { order_id: orderId, number: '1044', token_hash: record.tokenHash, expires_at: record.expiresAt, revoked_at: null, vault_secret_id: null };
const passphrase = 'Fictional-test-passphrase';

test('Vault archive encrypts all record fields, authenticates changes and rejects a wrong password', () => {
  const archive = seal(record, passphrase);
  assert.equal(archive.includes(Buffer.from(token)), false);
  assert.equal(archive.includes(Buffer.from(orderId)), false);
  assert.deepEqual(unseal(archive, passphrase), record);
  assert.notDeepEqual(seal(record, passphrase), archive);
  assert.throws(() => unseal(archive, 'wrong-passphrase'));
  for (const index of [0, 5, 21, 33, archive.length - 1]) {
    const modified = Buffer.from(archive); modified[index] ^= 1;
    assert.throws(() => unseal(modified, passphrase));
  }
  assert.throws(() => unseal(Buffer.alloc(20000), passphrase));
  assert.throws(() => seal(record, 'short'));
});
test('Recovery rejects mismatched hashes, wrong orders, revocations, expiry changes and existing secrets', () => {
  assert.throws(() => validateRecord({ ...record, token: 'b'.repeat(64) }));
  assert.throws(() => validateRecord({ ...record, revokedAt: '2026-01-01' }));
  assertDestination(record, row);
  for (const change of [{ token_hash: 'b'.repeat(64) }, { order_id: 'other' }, { number: '1043' },
    { expires_at: '2100-01-01' }, { revoked_at: '2026-01-01' }, { vault_secret_id: 'already-present' }]) {
    assert.throws(() => assertDestination(record, { ...row, ...change }));
  }
  assert.throws(() => assertDestination(record, row, Date.parse('2100-01-01')));
  assert.throws(() => assertDestination(record, { ...row, expires_at: '2099-01-01T00:00:00.000001Z' }));
});

function databaseFixture({ badHash = false, destination = row } = {}) {
  const calls = [];
  return { calls, async query(sql, params) {
    calls.push({ sql, params });
    assert.equal(sql.includes(token), false);
    if (sql.includes('for update of l')) return { rows: [destination] };
    if (sql.includes('vault.create_secret')) return { rows: [{ id: 'new-secret' }] };
    if (sql.startsWith('update public.tracking_links')) return { rowCount: 1 };
    if (sql.includes(' as valid')) return { rows: [{ valid: !badHash }] };
    return { rows: [] };
  } };
}
test('Vault restore uses bound values and changes only the secret reference in one transaction', async () => {
  const db = databaseFixture();
  await restoreRecord(db, record);
  assert.equal(db.calls.at(-1).sql, 'commit');
  assert.deepEqual(db.calls.find(c => c.sql.includes('vault.create_secret')).params, [token]);
  const update = db.calls.find(c => c.sql.startsWith('update public.tracking_links'));
  assert.equal(update.sql.includes('expires_at='), false);
  assert.equal(update.sql.includes('revoked_at='), false);
});
test('Failed hash verification and ineligible destinations roll back and never commit', async () => {
  for (const config of [{ badHash: true }, { destination: { ...row, vault_secret_id: 'existing' } }]) {
    const db = databaseFixture(config);
    await assert.rejects(restoreRecord(db, record));
    assert.equal(db.calls.at(-1).sql, 'rollback');
    assert.equal(db.calls.some(c => c.sql === 'commit'), false);
  }
});
