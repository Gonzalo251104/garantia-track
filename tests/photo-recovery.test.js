import test from 'node:test';
import assert from 'node:assert/strict';
import {connect} from '../dist/backend.js';
import {recoverPhotoSelection,photoRecoveryMarkup} from '../dist/photo-recovery-view.js';

function recoveryClient(row,{queryError=null,completed=false}={}) {
  const filters=[],calls=[],uploads=[];
  const query={select(){return this;},eq(key,value){filters.push([key,value]);return this;},async maybeSingle(){return {data:row,error:queryError};}};
  const client={from:()=>query,rpc:async(name,args)=>{
    calls.push([name,args]);
    assert.equal(name,'complete_order_photo','Recovery must not reserve slots, create orders or mutate tracking.');
    return {data:completed,error:null};
  },storage:{from:()=>({upload:async(path,blob,options)=>{uploads.push({path,blob,options});completed=true;return {error:null};}})}};
  return {client,filters,calls,uploads};
}

test('existing pending recovery is scoped to its order, reuses its path and never reserves or replaces',async()=>{
  const fake=recoveryClient({id:'photo',path:'existing/path.jpg',state:'pending'});
  const backend=await connect({},()=>fake.client);
  await backend.retryPhoto('saved-order','photo','data:image/jpeg;base64,/9j/2Q==');
  assert.deepEqual(fake.filters,[['order_id','saved-order'],['id','photo']]);
  assert.equal(fake.uploads.length,1);assert.equal(fake.uploads[0].path,'existing/path.jpg');
  assert.equal(fake.uploads[0].options.upsert,false);assert.equal(fake.uploads[0].options.contentType,'image/jpeg');
  assert.ok(fake.calls.every(([,args])=>args.p_photo==='photo'));
});
test('ready photos and previously uploaded pending objects are confirmed without resending bytes',async()=>{
  for(const state of ['ready','pending']){
    const fake=recoveryClient({id:'photo',path:'existing/path.jpg',state},{completed:true});
    const backend=await connect({},()=>fake.client);
    await backend.retryPhoto('saved-order','photo','not-a-fetchable-image');
    assert.equal(fake.uploads.length,0);
    assert.equal(fake.calls.length,state==='ready'?0:1);
  }
});
test('missing, foreign and denied photo queries cannot trigger completion or Storage writes',async()=>{
  for(const options of [{},{queryError:new Error('Denied')}]){
    const fake=recoveryClient(null,options),backend=await connect({},()=>fake.client);
    await assert.rejects(backend.retryPhoto('saved-order','foreign-photo','unused'));
    assert.equal(fake.calls.length,0);assert.equal(fake.uploads.length,0);
    assert.deepEqual(fake.filters,[['order_id','saved-order'],['id','foreign-photo']]);
  }
});
test('recovery stops when the view or account changes before or during upload/refresh',async()=>{
  let current=false,reads=0,mutations=0;
  const backend={retryPhoto:async()=>{mutations++;current=false;},photoRecords:async()=>{reads++;return [];}};
  const options={backend,orderId:'saved',photoId:'photo',src:'image',existing:true,isCurrent:()=>current};
  assert.equal(await recoverPhotoSelection(options),null);assert.equal(mutations,0);
  current=true;assert.equal(await recoverPhotoSelection(options),null);assert.equal(mutations,1);assert.equal(reads,0);
  backend.retryPhoto=async()=>{mutations++;};backend.photoRecords=async()=>{reads++;current=false;return [{id:'photo',state:'ready'}];};
  current=true;assert.equal(await recoverPhotoSelection(options),null);assert.equal(reads,1);
});
test('unreserved selections preserve the chosen photo identity without creating another order',async()=>{
  const calls=[],records=[{id:'stable-new-photo',state:'ready'}];
  const backend={upload:async(...args)=>calls.push(args),photoRecords:async()=>records};
  const result=await recoverPhotoSelection({backend,orderId:'saved',photoId:'stable-new-photo',src:'image',existing:false,isCurrent:()=>true});
  assert.equal(result,records);assert.deepEqual(calls,[['saved',[{id:'stable-new-photo',src:'image'}]]]);
});
test('recovery never reports success when refreshed metadata hides or has not confirmed the target photo',async()=>{
  for(const records of [[],[{id:'other',state:'ready'}],[{id:'photo',state:'pending'}]]){
    const backend={retryPhoto:async()=>{},photoRecords:async()=>records};
    await assert.rejects(recoverPhotoSelection({backend,orderId:'saved',photoId:'photo',src:'image',existing:true,isCurrent:()=>true}),/confirmar/);
  }
});
test('markup only offers pending slots or spare capacity and escapes content/attributes',()=>{
  const ready=Array.from({length:5},(_,index)=>({id:String(index),slot:index+1,state:'ready'}));
  assert.equal((photoRecoveryMarkup(ready,'new').match(/<form /g)||[]).length,0);
  const pending=[...ready.slice(0,4),{id:'" onfocus="bad',slot:5,state:'pending'}];
  const output=photoRecoveryMarkup(pending,'new',new Map(),'<img src=x onerror=bad>');
  assert.equal((output.match(/<form /g)||[]).length,1);
  assert.ok(output.includes('Foto de ingreso 5 pendiente'));assert.ok(output.includes('&lt;img'));
  assert.equal(output.includes('data-photo-id="" onfocus='),false);
  assert.equal((photoRecoveryMarkup([],'new').match(/<form /g)||[]).length,1);
});
