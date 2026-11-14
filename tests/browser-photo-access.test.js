import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../scripts/browser/check-photo-access.js', import.meta.url), 'utf8');
const uuid = '00000000-0000-4000-8000-000000000001';
const photoPath = `${uuid}/${uuid}/${uuid}.jpg`;

async function exercise({ member = false, authenticated = true, status = 403, grant = false, origin, input = photoPath } = {}) {
  let reads = 0;
  const tables = [];
  const file = grant ? { data: { size: 4 }, error: null } : { data: null, error: { status, message: 'PRIVATE-PROVIDER-DETAIL' } };
  const signed = grant ? { data: { signedUrl: 'PRIVATE-CAPABILITY' }, error: null } : file;
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: member ? {} : null, error: null }; } };
  const client = {
    auth: { async getUser() { return { data: { user: authenticated ? { id: 'PRIVATE-USER', email: 'PRIVATE-EMAIL' } : null }, error: null }; } },
    from: () => query,
    storage: { from: () => ({ async download(path) { reads++; assert.equal(path, photoPath); return file; }, async createSignedUrl(path) { reads++; assert.equal(path, photoPath); return signed; } }) }
  };
  const run = runInNewContext(`${source}\ncheckPrivatePhotoAccess`, {
    window: { GARANTIATRACK_CONFIG: { supabaseUrl: 'https://rtfhogdqsxlqfwvzisoo.supabase.co', supabaseKey: 'PUBLIC-KEY' } },
    location: { origin: origin || 'https://garantiatrack-console-workshop.gonzaloacd.chatgpt.site' },
    document: { querySelector: selector => selector.includes('[data-workspace="connected"]') ? {} : null },
    prompt: () => input,
    console: { table(value) { tables.push(JSON.stringify(value)); } }
  });
  const summary = await run(async () => ({ createClient(url, key, options) {
    assert.equal(options.auth.persistSession, true);
    assert.equal(options.auth.autoRefreshToken, false);
    return client;
  } }));
  const output = JSON.stringify({ summary, tables });
  for (const secret of [photoPath, 'PRIVATE-USER', 'PRIVATE-EMAIL', 'PRIVATE-PROVIDER-DETAIL', 'PRIVATE-CAPABILITY', 'PUBLIC-KEY']) assert.equal(output.includes(secret), false);
  return { summary, reads };
}

test('browser operator check requires a positive owner control and reports only summary fields', async () => {
  const { summary } = await exercise({ member: true, grant: true });
  assert.equal(summary.result, 'PASS'); assert.equal(summary.context, 'owner');
  assert.equal(summary.downloadReturnedData, true); assert.equal(summary.signedUrlIssued, true);
});
test('browser operator check accepts explicit nonmember denial but rejects unauthorized access', async () => {
  assert.equal((await exercise()).summary.result, 'PASS');
  assert.equal((await exercise({ grant: true })).summary.result, 'FAIL');
});
test('browser operator check never counts an anonymous session as an authenticated denial', async () => {
  const { summary, reads } = await exercise({ authenticated: false });
  assert.equal(summary.result, 'STOPPED'); assert.equal(summary.stage, 'session'); assert.equal(reads, 0);
});
test('browser operator check treats authentication and service failures as inconclusive', async () => {
  for (const status of [0, 401, 500]) assert.equal((await exercise({ status })).summary.result, 'INCONCLUSIVE');
});
test('browser operator check stops on wrong origins or malformed input without photo calls', async () => {
  assert.equal((await exercise({ origin: 'http://localhost:4192' })).reads, 0);
  const result = await exercise({ input: 'PRIVATE-CAPABILITY' });
  assert.equal(result.summary.stage, 'input'); assert.equal(result.reads, 0);
});
