import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { resolve, dirname, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { sourceProject, labProject, seal, unseal } from './archive.mjs';
import { exportRecord, restoreRecord } from './database.mjs';

async function hidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Interactive terminal required');
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((accept, reject) => {
    let value = '';
    function finish(error) {
      process.stdin.off('keypress', onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else accept(value);
      value = '';
    }
    function onKey(text, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('Cancelled'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') value = [...value].slice(0, -1).join('');
      else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    process.stdin.on('keypress', onKey);
  });
}

async function main() {
  const [mode, file, ...extra] = process.argv.slice(2);
  if (!['backup', 'restore-lab'].includes(mode) || !file || extra.length) throw new Error('Usage: node scripts/recovery/vault.mjs backup|restore-lab <archive.gtvc>');
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Interactive terminal required');
  const archivePath = resolve(file);
  const parent = await realpath(dirname(archivePath));
  const repo = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  const rel = relative(repo, parent);
  if (!rel || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) throw new Error('Keep archives outside the repository');
  const ref = mode === 'backup' ? sourceProject : labProject;
  const input = createInterface({ input: process.stdin, output: process.stdout });
  let host, user, port, caPath;
  try {
    if (await input.question(`Type project reference (${ref}): `) !== ref) throw new Error('Project confirmation mismatch');
    host = (await input.question('Database hostname (no URL): ')).trim();
    user = (await input.question('Database user: ')).trim();
    port = Number(await input.question('Database port (5432 session pooler or direct): '));
    caPath = (await input.question('Optional CA certificate path (Enter for system trust): ')).trim();
    if (port !== 5432 || !((host === `db.${ref}.supabase.co` && user === 'postgres')
      || (/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${ref}`))) throw new Error('Endpoint is outside this drill scope');
  } finally { input.close(); }
  const password = await hidden('Database password (hidden): ');
  const passphrase = await hidden('Backup passphrase (hidden, at least 16 characters): ');
  if (passphrase.length < 16) throw new Error('Passphrase is too short');
  if (mode === 'backup' && passphrase !== await hidden('Confirm backup passphrase (hidden): ')) throw new Error('Passphrase confirmation mismatch');
  let record;
  if (mode === 'restore-lab') {
    if ((await stat(archivePath)).size > 16384) throw new Error('Archive exceeds drill limit');
    record = unseal(await readFile(archivePath), passphrase);
  }
  const db = new pg.Client({ host, user, port, database: 'postgres', password,
    ssl: { rejectUnauthorized: true, ...(caPath ? { ca: await readFile(caPath, 'utf8') } : {}) }, connectionTimeoutMillis: 15000,
    statement_timeout: 15000, application_name: 'garantiatrack-recovery-drill' });
  db.on('error', () => {});
  try {
    await db.connect();
    // Fail closed if this session cannot suppress PostgreSQL bind-parameter logging.
    await db.query('set log_parameter_max_length=0');
    await db.query('set log_parameter_max_length_on_error=0');
    if (mode === 'backup') {
      const archive = seal(await exportRecord(db), passphrase);
      await writeFile(archivePath, archive, { flag: 'wx', mode: 0o600 });
      console.log('PASS: one encrypted GT-1044 record written. Verify an independent restore.');
    } else {
      await restoreRecord(db, record);
      console.log('PASS: missing lab secret recovered and hash verified; expiry preserved.');
    }
  } finally { await db.end().catch(() => {}); }
}
main().catch(() => {
  console.error('Recovery stopped. No sensitive error details are printed. Check mode, endpoint, permissions, passphrases and destination eligibility.');
  process.exitCode = 1;
});
