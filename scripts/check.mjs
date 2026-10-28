import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
for(const folder of ['dist','scripts']) for(const name of await readdir(folder)) {
  if(!/\.(js|mjs)$/.test(name)) continue;
  const result=spawnSync(process.execPath,['--check',`${folder}/${name}`],{stdio:'inherit'});
  if(result.status!==0) process.exit(result.status||1);
}
