import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { command, requireLab } from './lab-support.mjs';

export const images = Object.freeze({
  database: 'public.ecr.aws/supabase/postgres@sha256:c141fd17ac6a76c4323e90b3aee8ff1a23d2e89e547c2b963cfadc309c079cc2',
  auth: 'public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b',
  rest: 'public.ecr.aws/supabase/postgrest@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc',
  storage: 'public.ecr.aws/supabase/storage-api@sha256:a0420573837ee08c0afdc9cd01f90b4b8027579da99e0b9a159fe912ef756c99'
});
export const finalServerProcess = name => ['postgres', '.postgres-wrapp'].includes(name);
export function assertContainer(info, expected) {
  requireLab(info.Id === expected.id && info.Name === '/' + expected.name
    && info.Config?.Labels?.['garantiatrack-recovery-session'] === expected.session
    && info.Config?.Image === expected.image && info.HostConfig?.NetworkMode === expected.network
    && Object.keys(info.HostConfig.PortBindings || {}).length === 0
    && !(info.Mounts || []).some(mount => mount.Type === 'bind' || mount.Type === 'volume'));
}
export class LabRuntime {
  constructor(run = command) {
    this.run = run; this.session = randomBytes(12).toString('hex');
    this.name = 'garantiatrack-recovery-' + this.session; this.created = [];
  }
  docker(args, input, env) { return this.run('docker', args, { input, env }); }
  inspect(expected) {
    const info = JSON.parse(this.docker(['inspect', expected.id]))[0];
    assertContainer(info, expected); return info;
  }
  create(kind, env, extra = []) {
    const name = this.name + '-' + kind, image = images[kind], network = kind === 'database' ? 'none' : 'container:' + this.id;
    requireLab(image && !this.docker(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.ID}}']).trim());
    const id = this.docker(['run', '--detach', '--pull=never', '--name', name,
      '--label', 'garantiatrack-recovery-session=' + this.session, '--network', network,
      ...Object.keys(env).flatMap(key => ['--env', key]), ...extra, image], undefined, env).trim();
    requireLab(/^[a-f0-9]{64}$/.test(id));
    const expected = { id, name, session: this.session, image, network };
    this.created.push(expected); this.inspect(expected); return id;
  }
  async prepare() {
    // Never pull a moving image or start unrelated Supabase services implicitly.
    for (const image of Object.values(images)) this.docker(['image', 'inspect', image, '--format', '{{.Id}}']);
    this.id = this.create('database', { POSTGRES_PASSWORD: randomBytes(32).toString('hex') },
      ['--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=768m']);
    let ready = false;
    for (let attempt = 0; attempt < 180; attempt++) {
      try {
        // The image temporarily accepts SQL while its initialization shell is
        // still running. Import only after PID 1 has exec'd the final server.
        requireLab(finalServerProcess(this.docker(['exec', this.id, 'cat', '/proc/1/comm']).trim()));
        this.docker(['exec', this.id, 'pg_isready', '-U', 'postgres', '-d', 'postgres']); ready = true; break;
      } catch { await delay(500); }
    }
    requireLab(ready);
    requireLab(this.psql("select (select count(*) from auth.users)=0 and to_regclass('public.repair_orders') is null;").trim() === 't');
  }
  psql(sql) {
    requireLab(this.id && this.created.some(item => item.id === this.id));
    this.inspect(this.created.find(item => item.id === this.id));
    return this.docker(['exec', '-i', this.id, 'psql', '-X', '-U', 'supabase_admin', '-d', 'postgres', '-Atq',
      '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-f', '-'], sql);
  }
  cleanup() {
    let failures = 0;
    for (const expected of [...this.created].reverse()) {
      try { this.inspect(expected); this.docker(['rm', '-f', expected.id]); } catch { failures++; }
    }
    return { removed: this.created.length - failures, failures };
  }
}
