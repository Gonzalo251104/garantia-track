import test from 'node:test';
import assert from 'node:assert/strict';
import {seedOrders,validateIntake,nextOrderNumber,parseAmount,publicOrder,escapeHtml,deviceTypes,deviceLabel} from '../dist/domain.js';
test('intake rejects incomplete and invalid contact details',()=>{
  const valid={customer:'Demo',phone:'900000006',device:'console',model:'PS5',issue:'No power'};
  assert.doesNotThrow(()=>validateIntake(valid));
  for(const device of ['console','controller','other'])assert.doesNotThrow(()=>validateIntake({...valid,device}));
  for(const patch of [{customer:' '},{phone:'123'},{model:''},{issue:''},{device:'unknown'},{device:null}]) assert.throws(()=>validateIntake({...valid,...patch}));
  assert.throws(()=>validateIntake({...valid,device:'other',model:' '}));
});

test('device labels distinguish all supported types and never mislabel an unknown type',()=>{
  assert.deepEqual(deviceTypes.map(([key])=>key),['console','controller','other']);
  assert.deepEqual(['console','controller','other','unknown'].map(deviceLabel),['Consola','Mando','Otro','Equipo']);
  assert.equal(publicOrder({...seedOrders()[0],device:'other'}).device,'other');
});
test('order numbers increase independently of sort order',()=>{
  assert.equal(nextOrderNumber(seedOrders().reverse()),1046);
  assert.equal(nextOrderNumber([]),1041);
});
test('money uses cents and rejects ambiguous or invalid values',()=>{
  assert.equal(parseAmount('85.15'),8515);
  assert.equal(parseAmount('0'),0);
  for(const value of ['-1','12,50','NaN','1.123','1e3','']) assert.throws(()=>parseAmount(value));
});
test('tracking projection excludes personal and internal fields',()=>{
  const order=seedOrders()[0];
  const result=publicOrder({...order,events:[...order.events,{status:'ready',at:new Date().toISOString(),secret:'private'}]});
  for(const key of ['customer','phone','serial','notes','photos','quote']) assert.equal(key in result,false);
  assert.equal('secret' in result.events.at(-1),false);
});
test('user input is escaped in HTML output',()=>{
  assert.equal(escapeHtml('<img src="x" onerror="alert(1)">'), '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;');
});
test('seed data has unique identifiers and fictional serials',()=>{
  const orders=seedOrders();assert.equal(new Set(orders.map(o=>o.number)).size,5);
  assert.ok(orders.every(o=>o.serial.startsWith('DEMO-')));
});
