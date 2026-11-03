import { validateRecord, assertDestination, orderId, sourceProject } from './archive.mjs';

export async function exportRecord(db) {
  await db.query('begin isolation level repeatable read read only');
  try {
    const { rows } = await db.query(`select o.number::text, l.token_hash,
      to_char(l.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as expires_at, l.revoked_at, v.decrypted_secret
      from public.repair_orders o join public.tracking_links l on l.order_id=o.id
      join vault.decrypted_secrets v on v.id=l.vault_secret_id where o.id=$1`, [orderId]);
    if (rows.length !== 1) throw new Error('Missing source record');
    const row = rows[0];
    const record = validateRecord({ version: 1, source: sourceProject, orderId, number: row.number,
      token: row.decrypted_secret, tokenHash: row.token_hash, expiresAt: row.expires_at, revokedAt: row.revoked_at });
    await db.query('commit');
    return record;
  } catch (error) { await db.query('rollback'); throw error; }
}
export async function restoreRecord(db, record) {
  validateRecord(record);
  await db.query('begin');
  try {
    await db.query('select id from public.repair_orders where id=$1 for update', [orderId]);
    const { rows } = await db.query(`select l.order_id,l.token_hash,l.revoked_at,l.vault_secret_id,o.number::text,
      to_char(l.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as expires_at from public.tracking_links l
      join public.repair_orders o on o.id=l.order_id where l.order_id=$1 for update of l`, [orderId]);
    assertDestination(record, rows[0]);
    const created = await db.query('select vault.create_secret($1) as id', [record.token]);
    const secretId = created.rows[0].id;
    const updated = await db.query('update public.tracking_links set vault_secret_id=$1 where order_id=$2 and vault_secret_id is null', [secretId, orderId]);
    if (updated.rowCount !== 1) throw new Error('Reference update failed');
    const verified = await db.query(`select encode(sha256(convert_to(v.decrypted_secret,'UTF8')),'hex')=l.token_hash as valid
      from public.tracking_links l join vault.decrypted_secrets v on v.id=l.vault_secret_id where l.order_id=$1`, [orderId]);
    if (verified.rows[0]?.valid !== true) throw new Error('Recovered hash mismatch');
    await db.query('commit');
  } catch (error) { await db.query('rollback'); throw error; }
}
