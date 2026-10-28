import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {publicConfig} from './config.mjs';

const {supabaseUrl,supabaseKey}=publicConfig();
assert.ok(supabaseUrl && supabaseKey,'Configure the public Supabase environment first.');
const client=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const response=await fetch(`${supabaseUrl}/auth/v1/settings`,{headers:{apikey:supabaseKey}});
assert.equal(response.status,200,'Auth settings endpoint must be reachable.');
const settings=await response.json();
assert.equal(settings.external?.email,true,'Email authentication must be enabled.');
console.log('PASS: live Auth endpoint and public API key.');
const {data,error}=await client.rpc('get_order_tracking',{p_token:'0'.repeat(64)});
assert.equal(error,null);assert.equal(data,null);
console.log('PASS: live tracking RPC rejects an unknown token.');
for(const name of ['get_receipt_tracking','ensure_receipt_tracking','import_receipt_tracking']){
  const args={p_order:crypto.randomUUID(),...(name==='import_receipt_tracking'?{p_token:'0'.repeat(64)}:{})};
  const denied=await client.rpc(name,args);
  assert.equal(denied.error?.code,'42501','Anonymous receipt capability operations must be denied.');
}
console.log('PASS: live receipt recovery, creation and import deny anonymous callers.');
const records=await client.from('repair_orders').select('id').limit(1);
assert.ok(records.error,'Anonymous order-table access must be denied.');
assert.equal(records.error.code,'42501');
console.log('PASS: live Data API denies anonymous order reads.');
const upload=await client.storage.from('repair-photos').upload('unreserved/smoke-test.jpg',new Uint8Array([255,216,255,217]),{contentType:'image/jpeg',upsert:false});
assert.ok(upload.error,'Anonymous unreserved upload must be denied.');
console.log('PASS: live Storage API denies anonymous uploads.');
console.log(`Email confirmation required: ${!settings.mailer_autoconfirm}. No accounts, orders or objects were created.`);
