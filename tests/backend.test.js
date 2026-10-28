import test from 'node:test';
import assert from 'node:assert/strict';
import {singleRow,toOrder,connect} from '../dist/backend.js';
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
