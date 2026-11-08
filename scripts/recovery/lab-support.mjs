import { spawnSync } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';

export function requireLab(value) { if (!value) throw new Error('Laboratory precondition failed'); }
export function command(executable, args, { input, env, timeout = 180000 } = {}) {
  const result = spawnSync(executable, args, { input, env: env ? { ...process.env, ...env } : process.env,
    encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout, maxBuffer: 70 * 1024 * 1024 });
  if (result.status !== 0 || result.error) {
    const error = new Error('Laboratory command failed');
    error.sqlstate = result.stderr?.match(/ERROR:\s+([A-Z0-9]{5})(?:\s|$)/)?.[1];
    throw error;
  }
  return result.stdout;
}
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const identifier = value => '"' + value.replaceAll('"', '""') + '"';
export const copyText = value => value.replaceAll('\\', '\\\\').replaceAll('\t', '\\t').replaceAll('\n', '\\n').replaceAll('\r', '\\r');
export function isWithin(root, target) {
  const rel = relative(root, target);
  return !rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep));
}
export async function outsideRepository(path, { directory = false } = {}) {
  const location = await realpath(directory ? resolve(path) : dirname(resolve(path)));
  const root = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
  requireLab(!isWithin(root, location));
  // A worktree is nested in the canonical checkout in this project. Check the common root too.
  let common;
  try { common = command('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir']).trim(); } catch { /* Standalone source kit has no .git. */ }
  if (common) requireLab(!isWithin(await realpath(dirname(common)), location));
  return directory ? location : resolve(location, resolve(path).split(/[\\/]/).at(-1));
}
export async function readArchive(path) {
  const file = await outsideRepository(path);
  requireLab((await stat(file)).isFile() && (await stat(file)).size <= 64 * 1024 * 1024 + 50);
  // Resolve the file itself so a symlink cannot point back into the checkout.
  const actual = await realpath(file); await outsideRepository(actual);
  const bytes = await readFile(actual);
  requireLab(bytes.length >= 51 && bytes.subarray(0, 6).equals(Buffer.from('GTLAB1')));
  return { bytes, sha256: sha256(bytes) };
}
export async function hidden(prompt) {
  requireLab(process.stdin.isTTY && process.stdout.isTTY);
  process.stdout.write(prompt); emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((accept, reject) => {
    let value = '';
    function finish(cancelled) {
      process.stdin.off('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n');
      const result = value; value = ''; if (cancelled) reject(new Error('Cancelled')); else accept(result);
    }
    function onKey(text, key = {}) {
      if (key.ctrl && key.name === 'c') finish(true);
      else if (key.name === 'return' || key.name === 'enter') finish(false);
      else if (key.name === 'backspace') value = [...value].slice(0, -1).join('');
      else if (text && !key.ctrl && !key.meta && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    process.stdin.on('keypress', onKey);
  });
}
