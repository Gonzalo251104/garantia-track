import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { readFile, writeFile, stat, realpath } from 'node:fs/promises';
import { resolve, dirname, relative, sep, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { sourceProject, labProject, seal, unseal } from './archive.mjs';
import { exportRecord, restoreRecord } from './database.mjs';
import { RecoveryFailure, safeDiagnostic } from './diagnostics.mjs';

let stage = 'arguments';
function fail(reason) { throw new RecoveryFailure(reason); }

async function hidden(prompt) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) fail('TERMINAL');
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
      if (key.ctrl && key.name === 'c') return finish(new RecoveryFailure('CANCELLED'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') value = [...value].slice(0, -1).join('');
      else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    process.stdin.on('keypress', onKey);
  });
}

async function main() {
  const [mode, file, ...extra] = process.argv.slice(2);
  if (!['backup', 'restore-lab'].includes(mode) || !file || extra.length) fail('USAGE');
  if (!process.stdin.isTTY || !process.stdout.isTTY) fail('TERMINAL');
  stage = 'archive-location';
  const archivePath = resolve(file);
  const parent = await realpath(dirname(archivePath));
  const repo = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  const rel = relative(repo, parent);
  if (!rel || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) fail('ARCHIVE_LOCATION');
  stage = 'connection-settings';
  const ref = mode === 'backup' ? sourceProject : labProject;
  const input = createInterface({ input: process.stdin, output: process.stdout });
  let host, user, port, caPath;
  try {
    if (await input.question(`Type project reference (${ref}): `) !== ref) fail('PROJECT');
    host = (await input.question('Database hostname (no URL): ')).trim();
    user = (await input.question('Database user: ')).trim();
    port = Number(await input.question('Database port (5432 session pooler or direct): '));
    caPath = (await input.question('Optional CA certificate path (Enter for system trust): ')).trim();
    if (port !== 5432 || !((host === `db.${ref}.supabase.co` && user === 'postgres')
      || (/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${ref}`))) fail('ENDPOINT');
  } finally { input.close(); }
  stage = 'secret-input';
  const password = await hidden('Database password (hidden): ');
  const passphrase = await hidden('Backup passphrase (hidden, at least 16 characters): ');
  if (passphrase.length < 16) fail('PASSPHRASE_LENGTH');
  if (mode === 'backup' && passphrase !== await hidden('Confirm backup passphrase (hidden): ')) fail('PASSPHRASE_CONFIRMATION');
  let record;
  if (mode === 'restore-lab') {
    stage = 'archive-read';
    if ((await stat(archivePath)).size > 16384) fail('ARCHIVE_LIMIT');
    record = unseal(await readFile(archivePath), passphrase);
  }
  stage = 'certificate-read';
  const db = new pg.Client({ host, user, port, database: 'postgres', password,
    ssl: { rejectUnauthorized: true, ...(caPath ? { ca: await readFile(caPath, 'utf8') } : {}) }, connectionTimeoutMillis: 15000,
    statement_timeout: 15000, application_name: 'garantiatrack-recovery-drill' });
  db.on('error', () => {});
  try {
    stage = 'database-connect';
    await db.connect();
    // Fail closed if this session cannot suppress PostgreSQL bind-parameter logging.
    stage = 'privacy-setup';
    await db.query('set log_parameter_max_length=0');
    await db.query('set log_parameter_max_length_on_error=0');
    if (mode === 'backup') {
      stage = 'export-record';
      const archive = seal(await exportRecord(db), passphrase);
      stage = 'archive-write';
      await writeFile(archivePath, archive, { flag: 'wx', mode: 0o600 });
      console.log('PASS: one encrypted GT-1044 record written. Verify an independent restore.');
    } else {
      stage = 'restore-record';
      await restoreRecord(db, record);
      console.log('PASS: missing lab secret recovered and hash verified; expiry preserved.');
    }
  } finally { await db.end().catch(() => {}); }
}
main().catch(error => {
  console.error(safeDiagnostic(error, stage));
  process.exitCode = 1;
});
