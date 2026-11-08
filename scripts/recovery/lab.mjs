import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openLabBundle } from './lab-bundle.mjs';
import { hidden, outsideRepository, readArchive, requireLab } from './lab-support.mjs';
import { LabRuntime } from './lab-runtime.mjs';
import { restoreDatabase, validateRestore } from './lab-database.mjs';
import { verifyServices } from './lab-services.mjs';
import { copyExternal } from './lab-copy.mjs';

let stage = 'arguments', reportFile, runtime;
const report = { format: 'GT-LAB-RESTORE-REPORT-1', startedAt: new Date().toISOString(), state: 'starting' };
async function save() { if (reportFile) await writeFile(reportFile, JSON.stringify({ ...report, stage }, null, 2) + '\n', { mode: 0o600 }); }
async function main() {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === '--help' && args.length === 0) {
    console.log('Laboratory recovery only. Secrets are entered at hidden prompts.\ninspect ARCHIVE\nrestore ARCHIVE PRIVATE_REPORT_DIRECTORY\ncopy-external ARCHIVE EXPECTED_SHA256 TOOLS_ZIP USB_DRIVE\ncapture OUTPUT_ARCHIVE PINNED_CLI PRIVATE_PHOTO_MANIFEST\nSee docs/lab-recovery-runbook.md.'); return;
  }
  requireLab(['inspect', 'restore', 'copy-external', 'capture'].includes(mode));
  if (mode === 'capture') {
    requireLab(args.length === 3); stage = 'capture-preconditions';
    const { captureArchive } = await import('./lab-capture.mjs');
    const result = await captureArchive(...args, async value => { stage = value; });
    console.log(JSON.stringify({ state: 'encrypted-capture-created', ...result })); return;
  }
  if (mode === 'copy-external') {
    requireLab(args.length === 4); stage = 'external-copy';
    const result = await copyExternal(...args);
    console.log(JSON.stringify({ state: 'copied-and-hash-verified', ...result })); return;
  }
  requireLab(args.length === (mode === 'restore' ? 2 : 1));
  stage = 'archive-read'; const archive = await readArchive(args[0]);
  if (mode === 'inspect') { console.log(JSON.stringify({ bytes: archive.bytes.length, sha256: archive.sha256, decryptedIntegrityVerified: false })); return; }
  const directory = await outsideRepository(args[1], { directory: true });
  reportFile = join(directory, 'restore-' + randomBytes(12).toString('hex') + '.json');
  await writeFile(reportFile, '{}\n', { flag: 'wx', mode: 0o600 });
  report.archiveSha256 = archive.sha256; stage = 'private-passphrase'; report.state = 'waiting'; await save();
  const passphrase = await hidden('Retained backup passphrase (hidden; isolated local restore only): ');
  stage = 'archive-authentication'; report.state = 'running'; await save();
  const bundle = openLabBundle(archive.bytes, passphrase); validateRestore(bundle);
  stage = 'new-isolated-destination'; await save(); runtime = new LabRuntime(); await runtime.prepare();
  stage = 'database-auth-vault-restore'; await save(); report.database = restoreDatabase(bundle, runtime);
  report.http = await verifyServices(bundle, runtime, async value => { stage = value; await save(); });
  report.state = 'verified'; report.sourceContacted = false; report.network = 'none'; report.publishedPorts = 0;
  stage = 'complete';
}
main().catch(async error => {
  report.state = 'failed';
  if (/^[A-Z0-9]{5}$/.test(error.sqlstate || '')) report.sqlstate = error.sqlstate;
  process.exitCode = 1;
  console.error('LAB_RECOVERY_FAILED:' + stage + '. Raw errors, arguments and private values suppressed.');
}).finally(async () => {
  if (runtime) {
    report.cleanup = runtime.cleanup();
    if (report.cleanup.failures) { report.state = 'cleanup-required'; process.exitCode = 1; }
  }
  report.completedAt = new Date().toISOString();
  try { await save(); } catch { process.exitCode = 1; console.error('LAB_REPORT_WRITE_FAILED'); }
  if (reportFile) console.log(JSON.stringify({ state: report.state, stage, reportFile, cleanup: report.cleanup }));
});
