import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { connect } from '../dist/backend.js';
import { startPhotoRetryFixture } from '../scripts/fixtures/photo-retry-server.mjs';

test('single-order HTTP reads include workshop and number filters and preserve nested evidence',async t=>{
  const fixture=await startPhotoRetryFixture(0,{failures:0});t.after(()=>fixture.close());
  const requests=[];
  const backend=await connect({supabaseUrl:fixture.origin,supabaseKey:'sb_publishable_local_fixture_only'},(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>{requests.push(new URL(url));return fetch(url,options);}}}));
  const saved=await backend.receive('00000000-0000-4000-8000-000000000001','scoped-read',{customer:'Fictional operator'},[{id:'scoped-photo',src:'data:image/jpeg;base64,/9j/2Q=='}]);
  const order=await backend.loadOne('00000000-0000-4000-8000-000000000001',saved.number);
  assert.equal(order.number,9001);assert.equal(order.events[0].status,'received');assert.equal(order.photoRecords[0].state,'ready');
  const request=requests.find(url=>url.pathname==='/rest/v1/repair_orders');
  assert.equal(request.searchParams.get('workshop_id'),'eq.00000000-0000-4000-8000-000000000001');assert.equal(request.searchParams.get('number'),'eq.9001');assert.equal(request.searchParams.has('limit'),false);
  assert.equal(await backend.loadOne('different-workshop',9001),null);
  assert.equal(await backend.loadOne('00000000-0000-4000-8000-000000000001',9999),null);
});

test('real SDK over local HTTP surfaces one failed upload and reuses order and photo on retry', async t => {
  const fixture = await startPhotoRetryFixture();
  t.after(() => fixture.close());
  const config = { supabaseUrl: fixture.origin, supabaseKey: 'sb_publishable_local_fixture_only' };
  const backend = await connect(config, (url, key) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  const photo = { id: 'http-photo', src: 'data:image/jpeg;base64,/9j/2Q==' };
  await assert.rejects(backend.receive('00000000-0000-4000-8000-000000000001', 'http-request', { customer: 'Fictional operator' }, [photo]), /La orden GT-9001 se guardó, pero faltan fotos/);
  assert.deepEqual(fixture.summary(), { orders: 1, photos: 1, readyPhotos: 0, objects: 0, bytes: 0, initialEvents: 1, requests: ['http-request'], reservations: ['http-photo'], uploadAttempts: 1, failedUploads: 1, imageReads: 0 });
  const saved = await backend.receive('00000000-0000-4000-8000-000000000001', 'http-request', {}, [photo]);
  const loaded = await backend.load('00000000-0000-4000-8000-000000000001');
  assert.equal(saved.number, 9001);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].photoRecords[0].state, 'ready');
  const summary = fixture.summary();
  assert.equal(summary.orders, 1); assert.equal(summary.photos, 1); assert.equal(summary.objects, 1);
  assert.equal(summary.initialEvents, 1); assert.equal(summary.readyPhotos, 1);
  assert.equal(summary.uploadAttempts, 2); assert.equal(summary.bytes, 4);
  assert.equal(new Set(summary.requests).size, 1); assert.equal(new Set(summary.reservations).size, 1);
  const configScript = await fetch(`${fixture.origin}/config.js`).then(r => r.text());
  assert.ok(configScript.includes(fixture.origin));
  assert.equal(configScript.includes('supabase.co'), false);
  const page = await fetch(fixture.origin);
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes('LOCAL HTTP FIXTURE'));
  assert.equal((await fetch(`${fixture.origin}/app.js`)).status, 200);
  assert.equal((await fetch(`${fixture.origin}/.env`)).status, 404);
  assert.equal((await fetch(`${fixture.origin}/rest/v1/rpc/unsupported`, { method: 'POST', body: '{}' })).status, 400);
});

test('fresh SDK recovers a pending photo after the original intake is lost without recreating the order',async t=>{
  const fixture=await startPhotoRetryFixture(0,{failures:2});t.after(()=>fixture.close());
  const config={supabaseUrl:fixture.origin,supabaseKey:'sb_publishable_local_fixture_only'};
  const clientFactory=(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const original=await connect(config,clientFactory),photo={id:'lost-intake-photo',src:'data:image/jpeg;base64,/9j/2Q=='};
  await assert.rejects(original.receive('00000000-0000-4000-8000-000000000001','lost-intake-request',{customer:'Fictional operator'},[photo]));
  const fresh=await connect(config,clientFactory),[order]=await fresh.load('00000000-0000-4000-8000-000000000001');
  assert.equal(order.photoRecords[0].state,'pending');
  await assert.rejects(fresh.retryPhoto(order.id,order.photoRecords[0].id,photo.src));
  await fresh.retryPhoto(order.id,order.photoRecords[0].id,photo.src);
  assert.equal((await fresh.photoRecords(order.id))[0].state,'ready');
  await fresh.retryPhoto(order.id,photo.id,'not-a-fetchable-image');
  const summary=fixture.summary();
  assert.equal(summary.orders,1);assert.equal(summary.photos,1);assert.equal(summary.objects,1);assert.equal(summary.readyPhotos,1);
  assert.equal(summary.initialEvents,1);assert.equal(summary.uploadAttempts,3);assert.equal(summary.failedUploads,2);
  assert.deepEqual(summary.requests,['lost-intake-request']);assert.deepEqual(summary.reservations,['lost-intake-photo']);
});

test('an order with no reserved photo can complete its evidence without a second order',async t=>{
  const fixture=await startPhotoRetryFixture();t.after(()=>fixture.close());
  const backend=await connect({supabaseUrl:fixture.origin,supabaseKey:'sb_publishable_local_fixture_only'},(url,key)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
  const order=await backend.create('00000000-0000-4000-8000-000000000001','empty-order-request',{customer:'Fictional operator'});
  assert.deepEqual(await backend.photoRecords(order.id),[]);
  const photo={id:'stable-late-photo',src:'data:image/jpeg;base64,/9j/2Q=='};
  await assert.rejects(backend.upload(order.id,[photo]));
  const [pending]=await backend.photoRecords(order.id);
  assert.equal(pending.id,photo.id);assert.equal(pending.state,'pending');
  await backend.retryPhoto(order.id,pending.id,photo.src);
  const summary=fixture.summary();
  assert.equal(summary.orders,1);assert.equal(summary.photos,1);assert.equal(summary.objects,1);assert.equal(summary.readyPhotos,1);
  assert.equal(summary.initialEvents,1);assert.deepEqual(summary.requests,['empty-order-request']);assert.deepEqual(summary.reservations,[photo.id]);
});
