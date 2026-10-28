import test from 'node:test';
import assert from 'node:assert/strict';
import {publicConfig,configScript} from '../scripts/config.mjs';
test('configuration is empty until explicitly supplied',()=>assert.deepEqual(publicConfig({}),{supabaseUrl:'',supabaseKey:''}));
test('configuration accepts only public keys and safe project origins',()=>{
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(publicConfig({SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:jwt('anon')}).supabaseUrl,'https://project.supabase.co');
  for(const key of ['sb_secret_example',jwt('service_role'),''])assert.throws(()=>publicConfig({SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:key}));
  for(const url of ['http://remote.test','https://user:pass@project.supabase.co','https://project.supabase.co/path'])assert.throws(()=>publicConfig({SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'}));
});
test('server-only environment values are never serialized',()=>{
  assert.ok(!configScript({DATABASE_PASSWORD:'PRIVATE',SUPABASE_SERVICE_ROLE_KEY:'PRIVATE'}).includes('PRIVATE'));
});

test('canonical QR origin is optional and accepts only a public HTTPS origin',()=>{
  const config={SUPABASE_URL:'https://project.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
  assert.equal(publicConfig({...config,APP_PUBLIC_URL:'https://app.example/'}).publicAppUrl,'https://app.example');
  for(const value of ['http://app.example','https://localhost','https://127.0.0.1','https://user:pass@app.example','https://app.example/path','https://app.example/?x=1','https://app.example/#/orders'])assert.throws(()=>publicConfig({...config,APP_PUBLIC_URL:value}));
});
