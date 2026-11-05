import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspace,routeData} from '../dist/workspace-navigation.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

test('intake and unsupported routes check membership without downloading orders',async()=>{
  let checks=0;
  const backend={workshop:async()=>{checks++;return {id:'A'};},load:()=>assert.fail('Unneeded list read'),loadOne:()=>assert.fail('Unneeded order read')};
  for(const route of ['/intake','/workshop','/unknown','/track/1042']){
    const result=await loadWorkspace(backend,route,'A');
    assert.equal(result.orders,null);assert.equal(result.workshop.id,'A');
  }
  assert.equal(checks,4);
});

test('known-workshop navigation starts fresh membership and data reads concurrently',async()=>{
  const membership=deferred(),data=deferred(),calls=[];
  const pending=loadWorkspace({workshop:()=>{calls.push('membership');return membership.promise;},load:id=>{calls.push(id);return data.promise;}},'/orders','A');
  assert.deepEqual(calls.sort(),['A','membership']);
  data.resolve([{number:1042}]);
  let displayed=false;pending.then(()=>{displayed=true;});await Promise.resolve();assert.equal(displayed,false);
  membership.resolve({id:'A'});
  assert.deepEqual((await pending).orders,[{number:1042}]);
});

test('direct order and ticket routes fetch only the requested scoped order after membership',async()=>{
  assert.deepEqual(routeData('/orders/1042'),{kind:'order',number:1042});
  assert.deepEqual(routeData('/ticket/1042'),{kind:'order',number:1042});
  const calls=[];
  const result=await loadWorkspace({workshop:async()=>{calls.push('membership');return {id:'A'};},loadOne:async(id,number)=>{calls.push([id,number]);return {number};}},'/orders/1042');
  assert.deepEqual(calls,['membership',['A',1042]]);assert.deepEqual(result.orders,[{number:1042}]);
});

test('a workshop change discards old-workshop data and errors',async()=>{
  for(const fail of [false,true]){
    const calls=[];
    const result=await loadWorkspace({workshop:async()=>({id:'B'}),load:async id=>{calls.push(id);if(id==='A'&&fail)throw new Error('Obsolete request');return [{workshop_id:id}];}},'/orders','A');
    assert.deepEqual(calls,['A','B']);assert.deepEqual(result.orders,[{workshop_id:'B'}]);assert.equal(result.workshop.id,'B');
  }
});

test('removed membership never returns previous-workshop data',async()=>{
  const result=await loadWorkspace({workshop:async()=>null,load:async()=>[{notes:'Must not display'}]},'/orders','A');
  assert.equal(result.workshop,null);assert.equal(result.orders,null);
});

test('superseded navigation and account changes discard late results',async()=>{
  const data=deferred();let current=true;
  const pending=loadWorkspace({workshop:async()=>({id:'A'}),load:()=>data.promise},'/orders','A',()=>current);
  await Promise.resolve();current=false;data.resolve([{number:1042}]);assert.equal(await pending,null);
  let reads=0;
  assert.equal(await loadWorkspace({workshop:async()=>({id:'B'}),load:async()=>{reads++;return []; }},'/orders',undefined,()=>false),null);
  assert.equal(reads,0);
});

test('missing orders clear the requested result instead of returning a cached order',async()=>{
  const result=await loadWorkspace({workshop:async()=>({id:'A'}),loadOne:async()=>null},'/orders/1042','A');
  assert.deepEqual(result.orders,[]);
});

test('current membership and order failures remain errors with no offline fallback',async()=>{
  await assert.rejects(loadWorkspace({workshop:async()=>{throw new Error('Membership unavailable');},load:async()=>{throw new Error('Order unavailable');}},'/orders','A'),/Membership unavailable/);
  await assert.rejects(loadWorkspace({workshop:async()=>({id:'A'}),load:async()=>{throw new Error('Order unavailable');}},'/orders','A'),/Order unavailable/);
});

test('membership invalidation is reported before waiting for data from a changed workshop',async()=>{
  const data=deferred(),checked=[];
  const pending=loadWorkspace({workshop:async()=>({id:'B'}),load:id=>id==='B'?data.promise:Promise.resolve([])},'/orders','A',()=>true,workshop=>checked.push(workshop.id));
  await Promise.resolve();assert.deepEqual(checked,['B']);
  data.resolve([{workshop_id:'B'}]);assert.equal((await pending).orders[0].workshop_id,'B');
  await loadWorkspace({workshop:async()=>null},'/intake','A',()=>true,workshop=>checked.push(workshop));
  assert.deepEqual(checked,['B',null]);
});

test('an obsolete membership response cannot invalidate or unlock a newer view',async()=>{
  const membership=deferred();let current=true;
  const pending=loadWorkspace({workshop:()=>membership.promise},'/intake','A',()=>current,()=>assert.fail('Obsolete membership callback'));
  current=false;membership.resolve({id:'B'});assert.equal(await pending,null);
});
