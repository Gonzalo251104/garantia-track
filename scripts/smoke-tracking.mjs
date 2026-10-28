import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {publicConfig} from './config.mjs';

// Read bearer URLs from stdin so they never become shell arguments or log output.
let input='';
for await (const chunk of process.stdin) input+=chunk;
const fixture=JSON.parse(input);
const token=new URL(fixture.url).hash.match(/^#\/tracking\/([a-f0-9]{64})$/)?.[1];
assert.ok(token,'Provide a tracking URL in the stdin fixture.');
const config=publicConfig();
const client=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
assert.equal((await client.auth.getSession()).data.session,null);
const {data,error}=await client.rpc('get_order_tracking',{p_token:token});
assert.equal(error,null,'Tracking RPC must respond successfully.');
if(process.argv.includes('--expect-revoked')){
  assert.equal(data,null,'Old or revoked link must not resolve.');
  console.log('PASS: anonymous access to the old tracking link is rejected.');
}else{
  assert.ok(data,'A valid link must resolve without an Auth session.');
  assert.equal(Number(data.number),fixture.number);
  assert.deepEqual(Object.keys(data).sort(),['number','device','model','status','message','created','events','workshop'].sort());
  assert.ok(!JSON.stringify(data).includes('QA-INTERNAL-ONLY'));
  if(fixture.status)assert.equal(data.status,fixture.status);
  console.log('PASS: anonymous customer tracking returns the expected order and field allowlist.');
}
if(fixture.photoPath){
  const download=await client.storage.from('repair-photos').download(fixture.photoPath);
  assert.ok(download.error,'Anonymous direct photo downloads must be denied.');
  console.log('PASS: anonymous direct download of the private evidence photo is denied.');
}
