/* global Response */
// Local HTTP contract fixture, not a Supabase emulator or an authorization test.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../dist/', import.meta.url)));
const initialWorkshop = { id: '00000000-0000-4000-8000-000000000001', name: 'Photo Retry Fixture' };
const user = { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'operator@example.test' };
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

export async function startPhotoRetryFixture(port = 0, {failures=1,readDelayMs=0,workshopRole='owner'} = {}) {
  if(!Number.isInteger(failures) || failures<0 || failures>5)throw new Error('Fixture failures must be between 0 and 5.');
  if(!Number.isInteger(readDelayMs)||readDelayMs<0||readDelayMs>5000)throw new Error('Fixture read delay must be between 0 and 5000 ms.');
  if(!['owner','technician'].includes(workshopRole))throw new Error('Unsupported fixture workshop role.');
  const workshop={...initialWorkshop,owner_id:workshopRole==='owner'?user.id:'00000000-0000-4000-8000-000000000009'};
  const orders = new Map(), photos = new Map(), objects = new Map();
  const navigationReads=[];
  const calls = { requests: [], reservations: [], uploadAttempts: 0, failedUploads: 0, imageReads: 0 };
  const summary = () => ({
    orders: orders.size, photos: photos.size, readyPhotos: [...photos.values()].filter(p => p.state === 'ready').length,
    objects: objects.size, bytes: [...objects.values()].reduce((sum, body) => sum + body.length, 0),
    initialEvents: [...orders.values()].filter(order => order.order_events.length > 0).length, ...calls
  });
  const json = (response, status, value) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(value));
  };
  const server = createServer(async (request, response) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const url = new URL(request.url, origin), route = url.pathname;
      let body = Buffer.alloc(0);
      for await (const chunk of request) {
        if (body.length + chunk.length > 10 * 1024 * 1024) return json(response, 413, { message: 'Fixture input too large' });
        body = Buffer.concat([body, chunk]);
      }
      if (route === '/__fixture/status') return json(response, 200, summary());
      if (route === '/__fixture/navigation') return json(response,200,navigationReads);
      if (['/rest/v1/workshops','/rest/v1/repair_orders'].includes(route)) {
        navigationReads.push({resource:route.split('/').at(-1),number:url.searchParams.get('number')});
        if(readDelayMs)await new Promise(resolve=>setTimeout(resolve,readDelayMs));
      }
      if (route === '/config.js') {
        response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
        return response.end(`window.GARANTIATRACK_CONFIG=${JSON.stringify({ supabaseUrl: origin, supabaseKey: 'sb_publishable_local_fixture_only' })};`);
      }
      if (route === '/auth/v1/token') {
        // Public synthetic session accepted only by this process. Never use real credentials here.
        const now = Math.floor(Date.now() / 1000);
        const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
        const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...user, sub: user.id, iat: now, exp: now + 3600 })}.fixture-not-a-real-signature`;
        return json(response, 200, { access_token: token, refresh_token: 'local-fixture-only', token_type: 'bearer', expires_in: 3600, user });
      }
      if (route === '/auth/v1/user') return json(response, 200, user);
      if (route === '/auth/v1/logout') return json(response, 200, {});
      if (route === '/rest/v1/workshops') return json(response, 200, workshop);
      if (route === '/rest/v1/repair_orders') {
        const workshopId=url.searchParams.get('workshop_id')?.replace(/^eq\./,''),number=url.searchParams.get('number')?.replace(/^eq\./,'');
        const rows=[...orders.values()].filter(order=>(!workshopId||order.workshop_id===workshopId)&&(!number||order.number===Number(number))).map(order=>({...order,order_photos:[...photos.values()].filter(p=>p.order_id===order.id)}));
        return json(response,200,request.headers.accept?.includes('object+json')?rows[0]||null:rows);
      }
      if (route === '/rest/v1/order_photos') {
        const orderId=url.searchParams.get('order_id')?.replace(/^eq\./,''),photoId=url.searchParams.get('id')?.replace(/^eq\./,'');
        const rows=[...photos.values()].filter(photo=>(!orderId || photo.order_id===orderId) && (!photoId || photo.id===photoId)).sort((a,b)=>a.slot-b.slot);
        return json(response,200,request.headers.accept?.includes('object+json')?rows[0]||null:rows);
      }
      if (route.startsWith('/rest/v1/rpc/')) {
        const args = JSON.parse(body.toString() || '{}'), name = route.split('/').at(-1);
        if (name === 'rename_workshop') {
          if(workshopRole!=='owner'||args.p_workshop!==workshop.id)return json(response,403,{code:'42501',message:'Fixture owner access required'});
          const clean=typeof args.p_name==='string'?args.p_name.trim():'';
          if([...clean].length<2||[...clean].length>80||/[\u0000-\u001f\u007f]/.test(args.p_name))return json(response,400,{code:'23514',message:'Fixture invalid workshop name'});
          if(clean===workshop.name)return json(response,200,workshop);
          if(args.p_previous_name!==workshop.name)return json(response,409,{code:'40001',message:'Fixture workshop name changed'});
          workshop.name=clean;return json(response,200,workshop);
        }
        if (name === 'create_repair_order') {
          calls.requests.push(args.p_request);
          if (!orders.has(args.p_request)) {
            orders.set(args.p_request, { ...args.p_order, id: '00000000-0000-4000-8000-000000000003', number: 9001, workshop_id: workshop.id, status: 'received', quote: 0, notes: '', message: 'Recibimos tu equipo.', version: 1, created_at: new Date().toISOString(), order_events: [{ status: 'received', at: new Date().toISOString() }] });
          }
          return json(response, 200, orders.get(args.p_request));
        }
        if (name === 'reserve_order_photo') {
          calls.reservations.push(args.p_photo);
          if (!photos.has(args.p_photo)) photos.set(args.p_photo, { id: args.p_photo, order_id: args.p_order, slot: photos.size+1, state: 'pending', path: `${workshop.id}/${args.p_order}/${args.p_photo}.jpg` });
          return json(response, 200, photos.get(args.p_photo));
        }
        if (name === 'update_repair_order') {
          const order = [...orders.values()].find(item => item.id === args.p_id);
          if (!order) return json(response, 404, { code: '42501', message: 'Fixture order unavailable' });
          if (order.version !== args.p_version) return json(response, 409, { code: '40001', message: 'Fixture stale version' });
          if (!['received','diagnosing','awaiting_approval','repairing','ready','delivered'].includes(args.p_status)) return json(response, 400, { code: '23514', message: 'Fixture invalid status' });
          if (order.status !== args.p_status) order.order_events.push({ status: args.p_status, at: new Date().toISOString() });
          Object.assign(order, { status: args.p_status, quote: args.p_quote, notes: args.p_notes, message: args.p_message, version: order.version + 1 });
          return json(response, 200, order);
        }
        if (name === 'complete_order_photo') {
          const photo = photos.get(args.p_photo), complete = Boolean(photo && objects.has(photo.path));
          if (complete) photo.state = 'ready';
          return json(response, 200, complete);
        }
        if (name === 'get_receipt_tracking') return json(response, 200, { state: 'missing' });
        return json(response, 400, { message: 'Unsupported fixture RPC' });
      }
      const uploadPrefix = '/storage/v1/object/repair-photos/';
      if (request.method === 'POST' && route.startsWith(uploadPrefix)) {
        const objectPath = route.slice(uploadPrefix.length);
        calls.uploadAttempts++;
        if (calls.uploadAttempts <= failures) {
          calls.failedUploads++;
          return json(response, 503, { statusCode: '503', error: 'ServiceUnavailable', message: 'Intentional local upload failure' });
        }
        if (![...photos.values()].some(p => p.path === objectPath)) return json(response, 400, { message: 'Unknown fixture photo' });
        if (objects.has(objectPath)) return json(response, 409, { message: 'Fixture object already exists' });
        const form = await new Response(body, { headers: { 'Content-Type': request.headers['content-type'] } }).formData();
        const file = [...form.values()].find(value => typeof value !== 'string');
        if (!file) return json(response, 400, { message: 'Missing fixture file' });
        objects.set(objectPath, Buffer.from(await file.arrayBuffer()));
        return json(response, 200, { Key: `repair-photos/${objectPath}` });
      }
      const signPrefix = '/storage/v1/object/sign/repair-photos/';
      if (route.startsWith(signPrefix)) {
        const objectPath = route.slice(signPrefix.length);
        if (!objects.has(objectPath)) return json(response, 404, { message: 'Missing fixture object' });
        if (request.method === 'POST') return json(response, 200, { signedURL: `/object/sign/repair-photos/${objectPath}?token=local-fixture-only` });
        calls.imageReads++;
        response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
        return response.end(objects.get(objectPath));
      }
      if (request.method !== 'GET' || route.startsWith('/auth/') || route.startsWith('/rest/') || route.startsWith('/storage/')) return json(response, 404, { message: 'Unsupported fixture route' });
      const filename = path.resolve(root, '.' + (route === '/' ? '/index.html' : decodeURIComponent(route)));
      if (!filename.startsWith(root + path.sep)) return json(response, 404, { message: 'Not found' });
      let content = await readFile(filename);
      if (route === '/') content = content.toString().replace('<body>', '<body><p role="status" style="margin:0;padding:8px;background:#fff2c6;text-align:center">LOCAL HTTP FIXTURE · Fictional data only · No hosted Supabase connection</p>');
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    } catch (error) {
      json(response, error.code === 'ENOENT' ? 404 : 500, { message: 'Local fixture request failed' });
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { origin: `http://127.0.0.1:${server.address().port}`, summary, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4192);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const failures=Number(process.env.PHOTO_RETRY_FAILURES || 1);
  const fixture = await startPhotoRetryFixture(port,{failures});
  console.log(`Local photo-retry fixture: ${fixture.origin}/#/intake`);
  console.log('Use only invented sign-in values. State is in memory; stop the process to discard it.');
  console.log(`Intentional upload failures: ${failures}`);
}
