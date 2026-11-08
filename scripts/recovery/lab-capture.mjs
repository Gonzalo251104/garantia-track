import { readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { labProject } from './archive.mjs';
import { sealLabBundle } from './lab-bundle.mjs';
import { command, hidden, identifier, outsideRepository, requireLab, sha256 } from './lab-support.mjs';
import { exclusiveFile } from './lab-copy.mjs';

// Fixed laboratory source only. No caller-supplied endpoint or project reference.
export function cliSource(executable) {
  requireLab(command(executable, ['--version']).trim() === '3.0.0');
  for (const group of ['dump', 'query']) requireLab(command(executable, ['db', group, '--help']).includes('--remote'));
  return {
    query(sql) {
      requireLab(/^select\s/i.test(sql));
      const parsed = JSON.parse(command(executable, ['db', 'query', '--remote=' + labProject, '--yes', '--output', 'json', '--log-level', 'error', sql]));
      requireLab(Array.isArray(parsed.rows)); return parsed.rows;
    },
    dump(args) { return command(executable, ['db', 'dump', '--remote=' + labProject, '--log-level', 'error', ...args]); }
  };
}
export async function captureLab(source, manifest, onStage = async () => {}) {
  await onStage('source-metadata');
  const tables = source.query("select schemaname,tablename from pg_tables where schemaname in ('public','private','auth','storage','vault','supabase_migrations') order by schemaname,tablename");
  requireLab(tables.length > 0 && tables.length <= 200 && tables.every(row => /^[a-z_][a-z0-9_]*$/.test(row.schemaname) && /^[a-z_][a-z0-9_]*$/.test(row.tablename)));
  const snapshotSql = 'select jsonb_build_object(' + tables.map((row, index) => `'${index}',(select md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text)::text,'[]')) from ${identifier(row.schemaname)}.${identifier(row.tablename)} x)`).join(',') + ') as snapshot';
  const before = source.query(snapshotSql)[0].snapshot, parts = {};
  for (const [name, flags] of [['roles', ['--role-only']], ['schema', ['--schema', 'public,private,auth,storage,supabase_migrations,extensions']],
    ['data', ['--data-only', '--use-copy', '--schema', 'public,private,auth,storage,supabase_migrations']]]) {
    await onStage('capture-' + name); parts[name] = source.dump(flags); requireLab(parts[name].length > 0);
  }
  const copied = parts.data.replaceAll('"', '').split(/\r?\n/);
  const omitted = tables.filter(row => row.schemaname !== 'vault' && !copied.some(line => line.trimStart().startsWith(`COPY ${row.schemaname}.${row.tablename} `)));
  const literal = value => "'" + value.replaceAll("'", "''") + "'";
  parts.extraTables = omitted.length ? source.query('select jsonb_build_array(' + omitted.map(row => `jsonb_build_object('schema',${literal(row.schemaname)},'table',${literal(row.tablename)},'rows_json',(select coalesce(jsonb_agg(to_jsonb(x))::text,'[]') from ${identifier(row.schemaname)}.${identifier(row.tablename)} x))`).join(',') + ') as tables')[0].tables : [];
  await onStage('capture-logical-vault');
  const counts = source.query('select (select count(*) from vault.secrets)::int as secrets,(select count(distinct vault_secret_id) from public.tracking_links)::int as referenced')[0];
  requireLab(counts.secrets === counts.referenced);
  // Secret values are SELECT results captured in memory, never SQL inputs on the hosted source.
  parts.vault = source.query(`select l.order_id::text,l.vault_secret_id::text as old_id,l.token_hash,
    to_char(l.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as expires_at,l.revoked_at,
    v.decrypted_secret as token from public.tracking_links l join vault.decrypted_secrets v on v.id=l.vault_secret_id order by l.order_id`);
  requireLab(parts.vault.length === counts.referenced && parts.vault.every(row => typeof row.token === 'string' && /^[a-f0-9]{64}$/.test(row.token) && sha256(Buffer.from(row.token)) === row.token_hash));
  await onStage('capture-photo-files');
  const inventory = source.query('select bucket_id as bucket,name,version,metadata from storage.objects order by bucket_id,name');
  requireLab(Array.isArray(manifest.photos) && manifest.photos.length === inventory.length);
  const photos = [], used = new Set();
  for (const item of inventory) {
    const matches = manifest.photos.filter(photo => photo.bucket === item.bucket && photo.name === item.name);
    requireLab(matches.length === 1);
    const path = await realpath(await outsideRepository(matches[0].file)); await outsideRepository(path);
    requireLab(!used.has(path) && (await stat(path)).size <= 64 * 1024 * 1024); used.add(path);
    const bytes = await readFile(path);
    try {
      requireLab(bytes.length === Number(item.metadata.size));
      const etag = (item.metadata.eTag || '').replaceAll('"', '');
      if (/^[a-f0-9]{32}$/.test(etag)) requireLab(createHash('md5').update(bytes).digest('hex') === etag);
      photos.push({ ...item, base64: bytes.toString('base64'), byteLength: bytes.length, sha256: sha256(bytes) });
    } finally { bytes.fill(0); }
  }
  await onStage('source-consistency');
  requireLab(JSON.stringify(source.query(snapshotSql)[0].snapshot) === JSON.stringify(before));
  return { format: 'GT-LAB-COMPLETE-1', source: labProject, capturedAt: new Date().toISOString(), parts, tables, snapshot: before,
    privateSchemaIncluded: true, managedDataSupplemented: true, photoBytesIncluded: true, photoObjectCount: photos.length, photos };
}
export async function captureArchive(output, executable, manifestPath, onStage) {
  const destination = await outsideRepository(output), path = await outsideRepository(manifestPath);
  requireLab((await stat(path)).size <= 1024 * 1024);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const passphrase = await hidden('New laboratory backup passphrase (hidden, at least 16 characters): ');
  requireLab(passphrase.length >= 16 && passphrase === await hidden('Confirm backup passphrase (hidden): '));
  const bundle = await captureLab(cliSource(executable), manifest, onStage);
  await exclusiveFile(destination, sealLabBundle(bundle, passphrase));
  return { source: labProject, photoFiles: bundle.photos.length, plaintextWritten: false };
}
