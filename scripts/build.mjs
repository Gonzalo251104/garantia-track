import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { configScript } from './config.mjs';
await mkdir('dist/vendor',{recursive:true});
await build({stdin:{contents:"export { createClient } from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/vendor/supabase.js'});
await writeFile('dist/config.js',configScript());
if (process.env.REQUIRE_SUPABASE_CONFIG === '1' && (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error('A connected production build requires public Supabase configuration.');
}
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const commit = process.env.RELEASE_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Release commit must be a full Git SHA.');
await writeFile('dist/version.json', JSON.stringify({ version, commit }) + '\n');
console.log('Supabase browser SDK and public configuration built.');
