import test from 'node:test';
import assert from 'node:assert/strict';
import {singleRow,toOrder,connect} from '../dist/backend.js';

test('receipt retrieval and idempotent creation never call token rotation',async()=>{
  const calls=[],token='a'.repeat(64);
  const backend=await connect({publicAppUrl:'https://app.example'},()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{state:'active',token,expires_at:'2026-11-01T00:00:00Z'},error:null};}}));
  const first=await backend.receiptLink({id:'one'}),again=await backend.receiptLink({id:'one'},true);
  assert.deepEqual(first,again);assert.equal(first.url,`https://app.example/#/tracking/${token}`);
  assert.deepEqual(calls.map(call=>call.name),['get_receipt_tracking','ensure_receipt_tracking']);
  assert.ok(calls.every(call=>!('p_token' in call.args)));
});

test('legacy import validates the application URL and sends only its token to the scoped RPC',async()=>{
  const calls=[],token='b'.repeat(64);
  const backend=await connect({publicAppUrl:'https://app.example'},()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{state:'active',token},error:null};}}));
  await assert.rejects(backend.importReceiptLink({id:'one'},`https://attacker.example/#/tracking/${token}`));assert.equal(calls.length,0);
  const imported=await backend.importReceiptLink({id:'one'},`https://app.example/#/tracking/${token}`);
  assert.equal(imported.state,'active');assert.deepEqual(calls,[{name:'import_receipt_tracking',args:{p_order:'one',p_token:token}}]);
});

test('inactive and corrupted receipt responses never become printable URLs',async()=>{
  let result={state:'revoked'};
  const backend=await connect({publicAppUrl:'https://app.example'},()=>({rpc:async()=>({data:result,error:null})}));
  for(const state of ['missing','legacy','expired','revoked','unavailable']){result={state};assert.equal((await backend.receiptLink({id:'one'})).url,undefined);}
  result={state:'active',token:'not-a-token'};await assert.rejects(backend.receiptLink({id:'one'}));
  result={state:'unknown'};await assert.rejects(backend.receiptLink({id:'one'}));
});

test('new QR links use the canonical app origin and keep the existing token rotation RPC',async()=>{
  const calls=[];
  const backend=await connect({publicAppUrl:'https://app.example'},()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:null,error:null};}}));
  const first=await backend.trackingLink({id:'order-id'}),second=await backend.trackingLink({id:'order-id'});
  assert.match(first,/^https:\/\/app\.example\/#\/tracking\/[a-f0-9]{64}$/);
  assert.notEqual(first,second);assert.equal(calls[0].name,'rotate_tracking_link');
  assert.equal(calls[0].args.p_order,'order-id');assert.ok(first.endsWith(calls[0].args.p_token));
});
test('composite RPC responses handle object and singleton collection encodings',()=>{
  const row={id:'order',number:'1041',created_at:'2026-10-28T00:00:00Z',order_events:[{status:'ready',at:'2026-10-29T00:00:00Z'},{status:'received',at:'2026-10-28T00:00:00Z'}]};
  assert.equal(toOrder([row]).number,1041);
  assert.equal(toOrder(row).events[0].status,'received');
  assert.deepEqual(toOrder(row).photos,[]);
  assert.throws(()=>singleRow([]));assert.throws(()=>singleRow([row,row]));
});
test('a retry finalizes an existing object without uploading it again',async()=>{
  let uploads=0;const calls=[];
  const fake={rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='reserve_order_photo'?[{id:'photo',path:'workshop/order/photo.jpg',state:'pending'}]:true,error:null};},storage:{from:()=>({upload:async()=>{uploads++;return {error:null};}})}};
  const backend=await connect({supabaseUrl:'https://example.supabase.co',supabaseKey:'public'},()=>fake);
  await backend.upload('order',[{id:'photo',src:'unused'}]);
  assert.equal(uploads,0);assert.equal(calls[0][1].p_photo,'photo');
});
test('a failed upload stays explicit and retries reuse the photo identifier',async()=>{
  const identifiers=[];let uploads=0;
  const fake={rpc:async(name,args)=>{if(name==='reserve_order_photo'){identifiers.push(args.p_photo);return {data:{id:'photo',path:'path',state:'pending'},error:null};}return {data:false,error:null};},storage:{from:()=>({upload:async()=>{uploads++;return {error:new Error('Upload unavailable')};}})}};
  const backend=await connect({},()=>fake);
  const item={id:'stable-photo-id',src:'data:image/jpeg;base64,/9j/2Q=='};
  await assert.rejects(backend.upload('order',[item]),/Upload unavailable/);
  await assert.rejects(backend.upload('order',[item]),/Upload unavailable/);
  assert.deepEqual(identifiers,['stable-photo-id','stable-photo-id']);assert.equal(uploads,2);
});
test('backend mutation errors are surfaced instead of a local fallback',async()=>{
  const backend=await connect({},()=>({rpc:async()=>({data:null,error:new Error('Access denied')})}));
  await assert.rejects(backend.create('workshop','request',{}),/Access denied/);
});
test('intake snapshots its photo batch before an order request completes',async()=>{
  let finishCreate,started;
  const creating=new Promise(resolve=>{started=resolve;});
  const barrier=new Promise(resolve=>{finishCreate=resolve;});
  const fake={rpc:async(name)=>{
    if(name==='create_repair_order'){started();await barrier;return {data:{id:'first-order',number:1042},error:null};}
    return {data:null,error:null};
  }};
  const backend=await connect({},()=>fake),uploaded=[];
  backend.upload=async(id,photos)=>uploaded.push({id,photos});
  const photos=[{id:'first-photo',src:'first-intake'}];
  const saving=backend.receive('first-workshop','stable-request',{model:'First controller'},photos);
  await creating;
  photos[0].src='second-intake';photos.push({id:'second-photo',src:'unrelated'});
  finishCreate();await saving;
  assert.deepEqual(uploaded,[{id:'first-order',photos:[{id:'first-photo',src:'first-intake'}]}]);
});
test('order RPC does not transmit evidence or client-forged event history',async()=>{
  let submitted;
  const backend=await connect({},()=>({rpc:async(name,args)=>{submitted=args.p_order;return {data:{number:1042},error:null};}}));
  await backend.create('workshop','request',{customer:'QA',accessories:['USB'],photos:['large-data-url'],events:[{status:'delivered'}]});
  assert.equal('photos' in submitted,false);assert.equal('events' in submitted,false);
  assert.deepEqual(submitted.accessories,['USB']);
});
test('a partial intake upload reports the already-created order without duplicating it',async()=>{
  const backend=await connect({},()=>({rpc:async()=>({data:{id:'order',number:1042},error:null})}));
  backend.upload=async()=>{throw new Error('Disconnected');};
  await assert.rejects(backend.receive('workshop','request',{},[]),/La orden GT-1042 se guardó/);
});
