import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { connect } from '../dist/backend.js';
import { primaryStatuses, statusChanges, statusChangeMarkup, mountStatusChange } from '../dist/status-view.js';
import { startPhotoRetryFixture } from '../scripts/fixtures/photo-retry-server.mjs';

const order = () => ({ id: 'saved-order', status: 'received', version: 4, quote: 8500, notes: 'Saved internal note', message: 'Saved public message', events: [{ status: 'received', at: '2026-11-04T10:00:00Z' }] });

test('four daily stages are primary while additional current states stay selected and expanded', () => {
  assert.deepEqual(primaryStatuses, ['received', 'repairing', 'ready', 'delivered']);
  for (const current of ['received','diagnosing','awaiting_approval']) {
    const markup = statusChangeMarkup(current);
    assert.equal((markup.match(/type="radio"/g) || []).length, 6);
    assert.equal((markup.match(/ checked/g) || []).length, 1);
    assert.ok(markup.includes(`value="${current}" required checked`));
    assert.equal(markup.includes('<details open>'), current !== 'received');
    assert.equal((markup.split('<details')[0].match(/type="radio"/g) || []).length, 4);
    assert.ok(markup.includes('Listo para entregar'));
  }
  assert.equal(statusChangeMarkup('<img src=x>').includes('<img'), false);
});

test('status-only changes preserve persisted fields and history without mutating the saved order', () => {
  const original = order(), snapshot = structuredClone(original);
  const changes = statusChanges(original, 'ready', '2026-11-04T11:00:00Z');
  assert.deepEqual(original, snapshot);
  assert.equal(changes.quote, snapshot.quote);
  assert.equal(changes.notes, snapshot.notes);
  assert.equal(changes.message, snapshot.message);
  assert.deepEqual(changes.events, [...snapshot.events, { status: 'ready', at: '2026-11-04T11:00:00Z' }]);
  assert.equal(statusChanges(original, original.status).events.length, 1);
  assert.throws(() => statusChanges(original, 'invented'), /estado válido/);
});

function editor({ current = true, busy = false, selected = 'repairing', save = async () => ({ status: 'repairing' }) } = {}) {
  const nodes = Object.fromEntries(['#status-error','#status-result','#status-current'].map(key => [key, { textContent: '' }]));
  const state = { current, busy, saved: [], busyChanges: [] };
  const form = { addEventListener() {}, querySelector: selector => selector.includes(':checked') ? { value: selected } : nodes[selector] };
  mountStatusChange({ container: { querySelector: () => form }, order: order(), save,
    isCurrent: () => state.current, isBusy: () => state.busy,
    setBusy: value => { state.busy = value; state.busyChanges.push(value); },
    onSaved: saved => state.saved.push(saved), friendly: failure => failure.message });
  return { form, nodes, state, submit: () => form.onsubmit({ preventDefault() {} }) };
}

test('status editor suppresses duplicate, unchanged, invalid and inactive submissions', async () => {
  let calls = 0, finish;
  const view = editor({ save: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = view.submit();
  await view.submit();
  assert.equal(calls, 1);
  finish({ status: 'repairing' }); await first;
  assert.equal(view.state.saved.length, 1);
  assert.deepEqual(view.state.busyChanges, [true, false]);
  assert.match(view.nodes['#status-result'].textContent, /Estado guardado/);
  for (const options of [{ current: false }, { busy: true }, { selected: 'received' }, { selected: 'invented' }]) {
    await editor({ ...options, save: async () => { calls++; } }).submit();
    assert.equal(calls, 1);
  }
});

test('status editor never shows success after failure or after navigation/account change', async () => {
  const failed = editor({ save: async () => { throw new Error('Conflict; reload'); } });
  await failed.submit();
  assert.match(failed.nodes['#status-error'].textContent, /Conflict/);
  assert.equal(failed.nodes['#status-result'].textContent, '');
  assert.equal(failed.state.saved.length, 0);
  let finish;
  const stale = editor({ save: () => new Promise(resolve => { finish = resolve; }) });
  const pending = stale.submit(); stale.state.current = false;
  finish({ status: 'ready' }); await pending;
  assert.equal(stale.state.saved.length, 0);
  assert.equal(stale.nodes['#status-result'].textContent, '');
});

test('status save restores a blurred submit button without stealing focus from an edited draft', async () => {
  for (const editingDraft of [false, true]) {
    const document = { body: {}, activeElement: null }, draft = {};
    const button = { focus: () => { document.activeElement = button; } };
    const view = editor({ save: async () => {
      document.activeElement = editingDraft ? draft : document.body;
      return { status: 'repairing' };
    } });
    view.form.ownerDocument = document;
    view.nodes['[type="submit"]'] = button;
    document.activeElement = button;
    await view.submit();
    assert.equal(document.activeElement, editingDraft ? draft : button);
  }
});

test('real SDK status updates use the existing versioned RPC and preserve saved fields/events', async t => {
  const fixture = await startPhotoRetryFixture(); t.after(() => fixture.close());
  const backend = await connect({ supabaseUrl: fixture.origin, supabaseKey: 'sb_publishable_local_fixture_only' },
    (url, key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  let saved = await backend.create('00000000-0000-4000-8000-000000000001', 'status-request', { customer: 'Fictional operator' });
  saved = await backend.update(saved, { status: 'received', quote: 8500, notes: 'Saved note', message: 'Saved public message' });
  const stale = { ...saved };
  for (const status of ['repairing', 'ready', 'delivered', 'diagnosing', 'awaiting_approval']) {
    saved = await backend.update(saved, statusChanges(saved, status));
    const [fresh] = await backend.load('00000000-0000-4000-8000-000000000001');
    assert.equal(fresh.status, status);
    assert.equal(fresh.quote, 8500); assert.equal(fresh.notes, 'Saved note'); assert.equal(fresh.message, 'Saved public message');
  }
  assert.equal(fixture.summary().initialEvents, 1);
  assert.equal((await backend.load('00000000-0000-4000-8000-000000000001'))[0].events.length, 6);
  await assert.rejects(backend.update(stale, statusChanges(stale, 'ready')), failure => failure.code === '40001');
  assert.equal(fixture.summary().initialEvents, 1);
  const [fresh] = await backend.load('00000000-0000-4000-8000-000000000001');
  assert.equal(fresh.status, 'awaiting_approval');
  assert.equal(fresh.events.length, 6);
  await backend.update(fresh, statusChanges(fresh, fresh.status));
  assert.equal((await backend.load('00000000-0000-4000-8000-000000000001'))[0].events.length, 6);
});
