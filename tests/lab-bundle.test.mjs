import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sealLabBundle,openLabBundle} from '../scripts/recovery/lab-bundle.mjs';
import {labProject,sourceProject} from '../scripts/recovery/archive.mjs';
const token='c'.repeat(64),password='Synthetic-lab-passphrase-only';
const bundle={format:'GT-LAB-DB-1',source:labProject,photoBytesIncluded:false,parts:{roles:'select 1;',schema:'select 2;',data:'select 3;',vault:[{token,token_hash:createHash('sha256').update(token).digest('hex')}]}};
test('laboratory database bundle encrypts SQL/Auth-like content and authenticates every component',()=>{
  const bytes=sealLabBundle(bundle,password);
  assert.equal(bytes.includes(Buffer.from(token)),false);
  assert.equal(bytes.includes(Buffer.from(bundle.parts.data)),false);
  assert.deepEqual(openLabBundle(bytes,password),bundle);
  assert.throws(()=>openLabBundle(bytes,'Wrong-lab-passphrase'));
  for(const index of [0,6,22,34,bytes.length-1]){const damaged=Buffer.from(bytes);damaged[index]^=1;assert.throws(()=>openLabBundle(damaged,password));}
});
test('laboratory archive rejects production source, inconsistent token hashes and mislabeled photo completeness',()=>{
  assert.throws(()=>sealLabBundle({...bundle,source:sourceProject},password));
  assert.throws(()=>sealLabBundle({...bundle,photoBytesIncluded:true},password));
  assert.throws(()=>sealLabBundle({...bundle,parts:{...bundle.parts,vault:[{token,token_hash:'a'.repeat(64)}]}},password));
  assert.throws(()=>openLabBundle(Buffer.alloc(40),password));
});

test('complete laboratory archive authenticates photo bytes, rejects omissions, duplicates and unsafe paths',()=>{
  const bytes=Buffer.from('synthetic photograph bytes');
  const photo={bucket:'repair-photos',name:'workshop/order/photo.jpg',version:null,byteLength:bytes.length,
    base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex')};
  const complete={...bundle,format:'GT-LAB-COMPLETE-1',photoBytesIncluded:true,photoObjectCount:1,photos:[photo]};
  assert.deepEqual(openLabBundle(sealLabBundle(complete,password),password),complete);
  for(const changes of [{name:'../photo.jpg'},{name:'/photo.jpg'},{name:'a\\photo.jpg'},
    {base64:photo.base64+'='},{byteLength:1},{sha256:'0'.repeat(64)}]){
    assert.throws(()=>sealLabBundle({...complete,photos:[{...photo,...changes}]},password));
  }
  assert.throws(()=>sealLabBundle({...complete,photos:[]},password));
  assert.throws(()=>sealLabBundle({...complete,photoObjectCount:2,photos:[photo,photo]},password));
});
