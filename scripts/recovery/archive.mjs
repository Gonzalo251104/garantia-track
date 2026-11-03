import { randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

const header = Buffer.from('GTVC1');
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const orderId = 'b3c45304-dbc0-45c2-a40c-994534b9efaa';
export const sourceProject = 'rtfhogdqsxlqfwvzisoo';
export const labProject = 'rtmswfvohwlklnswisst';
function exactInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('Invalid timestamp');
  return value.replace(/\.(\d+)Z$/, (_, fraction) => `.${fraction.padEnd(6, '0')}Z`);
}
export function validateRecord(record) {
  if (record?.version !== 1 || record.source !== sourceProject || record.orderId !== orderId || record.number !== '1044'
    || !/^[a-f0-9]{64}$/.test(record.token) || !/^[a-f0-9]{64}$/.test(record.tokenHash)
    || record.revokedAt !== null || !Number.isFinite(Date.parse(record.expiresAt))
    || createHash('sha256').update(record.token).digest('hex') !== record.tokenHash) throw new Error('Invalid recovery record');
  exactInstant(record.expiresAt);
  return record;
}
export function seal(record, password) {
  validateRecord(record);
  if (typeof password !== 'string' || password.length < 16) throw new Error('Use a backup passphrase of at least 16 characters');
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = scryptSync(password, salt, 32, options);
  const plain = Buffer.from(JSON.stringify(record));
  try {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(header);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.concat([header, salt, iv, cipher.getAuthTag(), encrypted]);
  } finally { key.fill(0); plain.fill(0); }
}
export function unseal(bytes, password) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 50 || bytes.length > 16384 || !bytes.subarray(0, 5).equals(header)) throw new Error('Invalid recovery archive');
  const key = scryptSync(password, bytes.subarray(5, 21), 32, options);
  let plain;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(21, 33));
    decipher.setAAD(header);
    decipher.setAuthTag(bytes.subarray(33, 49));
    plain = Buffer.concat([decipher.update(bytes.subarray(49)), decipher.final()]);
    return validateRecord(JSON.parse(plain.toString('utf8')));
  } finally { key.fill(0); plain?.fill(0); }
}
export function assertDestination(record, row, now = Date.now()) {
  validateRecord(record);
  if (!row || String(row.number) !== record.number || row.order_id !== record.orderId
    || row.token_hash !== record.tokenHash || exactInstant(row.expires_at) !== exactInstant(record.expiresAt)
    || row.revoked_at !== null || row.vault_secret_id !== null || Date.parse(record.expiresAt) <= now) throw new Error('Destination is not an eligible missing-secret recovery');
}
