import { mkdir, readFile, realpath, open } from 'node:fs/promises';
import { basename, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { command, isWithin, outsideRepository, readArchive, requireLab, sha256 } from './lab-support.mjs';

export async function exclusiveFile(file, bytes) {
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}
export function verifyUsb(root, source) {
  requireLab(process.platform === 'win32' && /^[a-z]:[\\/]?$/i.test(root));
  const letter = root[0].toUpperCase(), sourceLetter = parse(source).root[0]?.toUpperCase();
  requireLab(/^[A-Z]$/.test(sourceLetter) && letter !== sourceLetter);
  const helper = fileURLToPath(new URL('./lab-volume.ps1', import.meta.url));
  const result = JSON.parse(command('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', helper,
    '-Destination', letter, '-Source', sourceLetter]));
  requireLab(result.external === true && result.busType === 'USB'); return result;
}
export async function copyExternal(archivePath, expectedHash, kitPath, root, volumeCheck = verifyUsb) {
  requireLab(/^[a-f0-9]{64}$/i.test(expectedHash));
  const source = await realpath(await outsideRepository(archivePath));
  const archive = await readArchive(source); requireLab(archive.sha256 === expectedHash.toLowerCase());
  const kitFile = await realpath(await outsideRepository(kitPath)), kit = await readFile(kitFile);
  requireLab(kit.length >= 4 && kit.length < 5 * 1024 * 1024 && kit.subarray(0, 2).equals(Buffer.from('PK')));
  const volume = volumeCheck(root, source); volumeCheck(root, kitFile);
  requireLab(volume.external && volume.freeBytes > archive.bytes.length + kit.length + 1024 * 1024);
  const device = await realpath(root), parent = join(device, 'GarantiaTrack-Recovery');
  await mkdir(parent, { recursive: true }); requireLab(isWithin(device, await realpath(parent)));
  const folder = join(parent, 'lab-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(4).toString('hex'));
  await mkdir(folder); // Exclusive directory: never merge a previous recovery set.
  const files = [{ name: 'laboratory-complete.gtlab', bytes: archive.bytes }, { name: basename(kitFile), bytes: kit }];
  const entries = [];
  for (const item of files) {
    const destination = join(folder, item.name); await exclusiveFile(destination, item.bytes);
    const hash = sha256(await readFile(destination)); requireLab(hash === sha256(item.bytes));
    entries.push({ file: item.name, bytes: item.bytes.length, sha256: hash });
  }
  const manifest = { format: 'GT-EXTERNAL-COPY-1', createdAt: new Date().toISOString(), externalMedia: true,
    fileSystem: volume.fileSystem, files: entries, passphraseIncluded: false, decryptedIntegrityVerified: false };
  await exclusiveFile(join(folder, 'copy-manifest.json'), Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  await exclusiveFile(join(folder, 'README.txt'), Buffer.from('GarantiaTrack fictional laboratory recovery set.\nKeep the passphrase separately. Files were copied with exclusive creation and verified SHA-256.\nExtract the versioned tools ZIP. Follow docs/lab-recovery-runbook.md. Restore only the trusted laboratory archive into a fresh isolated local destination. No hosted project is required.\nPassword login, production readiness and off-site retention are separate acceptance gates.\n'));
  return { folder, archiveSha256: archive.sha256, toolKitSha256: sha256(kit), externalMedia: true, filesVerified: entries.length };
}
