import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertContainer, LabRuntime, images, finalServerProcess } from '../scripts/recovery/lab-runtime.mjs';
import { validateRestore } from '../scripts/recovery/lab-database.mjs';
import { copyExternal, exclusiveFile } from '../scripts/recovery/lab-copy.mjs';
import { labProject, sourceProject } from '../scripts/recovery/archive.mjs';
import { sha256, outsideRepository } from '../scripts/recovery/lab-support.mjs';
import { captureLab } from '../scripts/recovery/lab-capture.mjs';

const expected = { id: 'a'.repeat(64), name: 'fictional-recovery', image: images.database, session: 'synthetic-session', network: 'none' };
const info = () => ({ Id: expected.id, Name: '/' + expected.name, Config: { Image: expected.image,
  Labels: { 'garantiatrack-recovery-session': expected.session } }, HostConfig: { NetworkMode: 'none', PortBindings: {} }, Mounts: [] });

test('restore and cleanup reject foreign identities, shared data, external networking and published ports', () => {
  for (const name of ['bash', 'sh', 'docker-entrypoin']) assert.equal(finalServerProcess(name), false);
  for (const name of ['postgres', '.postgres-wrapp']) assert.equal(finalServerProcess(name), true);
  assert.doesNotThrow(() => assertContainer(info(), expected));
  for (const mutate of [value => { value.Id = 'b'.repeat(64); }, value => { value.Name = '/unrelated'; },
    value => { value.Config.Image = 'untrusted:latest'; }, value => { value.Config.Labels = {}; },
    value => { value.HostConfig.NetworkMode = 'bridge'; }, value => { value.HostConfig.PortBindings = { '5432/tcp': [{}] }; },
    value => { value.Mounts = [{ Type: 'bind' }]; }, value => { value.Mounts = [{ Type: 'volume' }]; }]) {
    const changed = info(); mutate(changed); assert.throws(() => assertContainer(changed, expected));
  }
  const commands = [];
  const runtime = new LabRuntime((_executable, args) => { commands.push(args); return args[0] === 'inspect' ? JSON.stringify([{ ...info(), Id: 'b'.repeat(64) }]) : ''; });
  runtime.created = [expected]; assert.deepEqual(runtime.cleanup(), { removed: 0, failures: 1 });
  assert.equal(commands.some(args => args[0] === 'rm'), false);
});

test('database validation rejects production bundles and psql host-command escape routes before import', () => {
  const bundle = { source: labProject, format: 'GT-LAB-COMPLETE-1', privateSchemaIncluded: true, managedDataSupplemented: true,
    tables: [{ schemaname: 'auth', tablename: 'users' }], snapshot: { 0: 'a'.repeat(32) },
    parts: { roles: 'select 1;', schema: 'select 2;', data: 'COPY auth.users (id) FROM stdin;\n\\N\n\\.\n' } };
  assert.doesNotThrow(() => validateRestore(bundle));
  assert.throws(() => validateRestore({ ...bundle, source: sourceProject }));
  for (const command of ['\\! whoami', '\\ir private.sql', '\\copy x from program anything', '\\connect remote', '\\o output']) {
    assert.throws(() => validateRestore({ ...bundle, parts: { ...bundle.parts, schema: command } }));
  }
  assert.throws(() => validateRestore({ ...bundle, tables: [...bundle.tables, ...bundle.tables] }));
  assert.throws(() => validateRestore({ ...bundle, snapshot: {} }));
});

test('external-copy hashes ciphertext and tools, writes no passphrase and never overwrites existing files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gt-recovery-test-'));
  try {
    const source = join(root, 'source'), device = join(root, 'synthetic-device'); await mkdir(source); await mkdir(device);
    const archive = Buffer.concat([Buffer.from('GTLAB1'), Buffer.alloc(60, 7)]), kit = Buffer.from('PK synthetic source kit');
    const file = join(source, 'sample.gtlab'), tools = join(source, 'tools.zip'); await writeFile(file, archive); await writeFile(tools, kit);
    const volume = () => ({ external: true, busType: 'USB', fileSystem: 'synthetic', freeBytes: 1e9 });
    const copied = await copyExternal(file, sha256(archive), tools, device, volume);
    assert.equal(sha256(await readFile(join(copied.folder, 'laboratory-complete.gtlab'))), sha256(archive));
    const manifest = JSON.parse(await readFile(join(copied.folder, 'copy-manifest.json'), 'utf8'));
    assert.equal(manifest.passphraseIncluded, false); assert.equal(manifest.decryptedIntegrityVerified, false);
    assert.equal(manifest.files.length, 2); assert.equal(JSON.stringify(manifest).includes(source), false);
    await assert.rejects(exclusiveFile(join(copied.folder, 'laboratory-complete.gtlab'), Buffer.from('replacement')), { code: 'EEXIST' });
    const before = await readdir(join(device, 'GarantiaTrack-Recovery'));
    await assert.rejects(copyExternal(file, '0'.repeat(64), tools, device, volume));
    assert.deepEqual(await readdir(join(device, 'GarantiaTrack-Recovery')), before);
    await assert.rejects(copyExternal(file, sha256(archive), tools, device, () => ({ external: false })));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('repository locations and secret-shaped extra CLI arguments are rejected without echo', async () => {
  await assert.rejects(outsideRepository(join(process.cwd(), 'private.gtlab')));
  const secret = 'synthetic-secret-never-echoed';
  const result = spawnSync(process.execPath, ['scripts/recovery/lab.mjs', 'restore', 'missing', 'directory', secret], { encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.equal((result.stdout + result.stderr).includes(secret), false);
});

test('capture preserves managed table data omitted by native dumps and rejects a changing source', async () => {
  function fixture(changing = false, unreferencedVault = false) {
    let snapshots = 0;
    return { dump() { return 'select 1;'; }, query(sql) {
      if (sql.includes('from pg_tables')) return [{ schemaname: 'auth', tablename: 'schema_migrations' }];
      if (sql.includes(' as snapshot')) return [{ snapshot: { 0: changing && snapshots++ ? 'b'.repeat(32) : 'a'.repeat(32) } }];
      if (sql.includes(' as tables')) return [{ tables: [{ schema: 'auth', table: 'schema_migrations', rows_json: '[{"version":"synthetic"}]' }] }];
      if (sql.includes(' as secrets')) return [{ secrets: unreferencedVault ? 1 : 0, referenced: 0 }];
      if (sql.includes('vault.decrypted_secrets') || sql.includes('from storage.objects')) return [];
      throw new Error('Unexpected synthetic query');
    } };
  }
  const bundle = await captureLab(fixture(), { photos: [] });
  assert.equal(bundle.parts.extraTables[0].table, 'schema_migrations');
  assert.equal(JSON.parse(bundle.parts.extraTables[0].rows_json)[0].version, 'synthetic');
  await assert.rejects(captureLab(fixture(true), { photos: [] }));
  await assert.rejects(captureLab(fixture(false, true), { photos: [] }));
});
