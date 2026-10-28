import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { configScript } from './config.mjs';
await mkdir('dist/vendor',{recursive:true});
await build({stdin:{contents:"export { createClient } from '@supabase/supabase-js';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/vendor/supabase.js'});
await writeFile('dist/config.js',configScript());
console.log('Supabase browser SDK and public configuration built.');
