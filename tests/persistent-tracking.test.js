import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('persistent receipt capabilities preserve old tickets and enforce tenant boundaries',async t=>{
  const db=new PGlite();
  const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002';
  await db.exec(`
    create role anon nologin;create role authenticated nologin;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,storage to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;
    insert into auth.users values('${alice}'),('${bob}');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/20261028060929_workshop_backend.sql',import.meta.url),'utf8'));
  const asUser=async(id,fn,role='authenticated')=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);try{return await fn();}finally{await db.exec('reset role');}};
  const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
  const call=(name,id)=>value(`select public.${name}($1)`,[id]);
  let wa,legacy,fresh,original;
  const oldToken='c'.repeat(64),newToken='d'.repeat(64);
  try{
    wa=await asUser(alice,()=>value("select public.create_workshop('Persistent QA')"));
    await asUser(bob,()=>value("select public.create_workshop('Other QA')"));
    const create=()=>value('select to_jsonb(public.create_repair_order($1,$2,$3::jsonb))',[wa,crypto.randomUUID(),JSON.stringify({customer:'Fictional QA',phone:'900000001',device:'controller',model:'DualSense',issue:'Drift',accessories:[]})]);
    legacy=await asUser(alice,create);fresh=await asUser(alice,create);
    await asUser(alice,()=>db.query('select public.rotate_tracking_link($1,$2)',[legacy.id,oldToken]));
    original=(await db.query('select token_hash,expires_at from public.tracking_links where order_id=$1',[legacy.id])).rows[0];
    await db.exec(await readFile(new URL('./fixtures/vault-contract.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261028212715_persistent_receipt_tracking.sql',import.meta.url),'utf8'));

    await t.test('migration and ensure leave a pre-existing QR and expiry unchanged',async()=>{
      assert.equal((await asUser(alice,()=>call('get_receipt_tracking',legacy.id))).state,'legacy');
      assert.equal((await asUser(alice,()=>call('ensure_receipt_tracking',legacy.id))).state,'legacy');
      assert.deepEqual((await db.query('select token_hash,expires_at from public.tracking_links where order_id=$1',[legacy.id])).rows[0],original);
      assert.equal((await asUser(null,()=>value('select public.get_order_tracking($1)',[oldToken]),'anon')).number,legacy.number);
      assert.equal(await value('select count(*)::integer from vault.secrets'),0);
    });
    await t.test('anonymous, other workshops and direct secret/helper access are denied',async()=>{
      for(const name of ['get_receipt_tracking','ensure_receipt_tracking']){
        await assert.rejects(asUser(null,()=>call(name,legacy.id),'anon'));
        await assert.rejects(asUser(bob,()=>call(name,legacy.id)),/access denied/i);
      }
      await assert.rejects(asUser(bob,()=>db.query('select public.import_receipt_tracking($1,$2)',[legacy.id,oldToken])),/access denied/i);
      await assert.rejects(asUser(null,()=>db.query('select public.import_receipt_tracking($1,$2)',[legacy.id,oldToken]),'anon'));
      for(const role of ['anon','authenticated'])for(const target of ['vault.secrets','vault.decrypted_secrets','public.tracking_links'])await assert.rejects(asUser(alice,()=>db.query(`select * from ${target}`),role));
      await assert.rejects(asUser(alice,()=>db.query('select private.receipt_tracking_state($1)',[legacy.id])));
      await assert.rejects(asUser(alice,()=>db.query('select private.store_receipt_token($1,$2)',[legacy.id,oldToken])));
    });
    await t.test('legacy import requires the exact active token and preserves every earlier ticket',async()=>{
      for(const token of ['bad','e'.repeat(64),null])await assert.rejects(asUser(alice,()=>db.query('select public.import_receipt_tracking($1,$2)',[legacy.id,token])));
      const saved=await asUser(alice,()=>value('select public.import_receipt_tracking($1,$2)',[legacy.id,oldToken]));
      assert.equal(saved.state,'active');assert.equal(saved.token,oldToken);assert.equal(new Date(saved.expires_at).getTime(),original.expires_at.getTime());
      assert.deepEqual((await db.query('select token_hash,expires_at from public.tracking_links where order_id=$1',[legacy.id])).rows[0],original);
      assert.equal(await value('select count(*)::integer from vault.secrets'),1);
      assert.equal((await asUser(null,()=>value('select public.get_order_tracking($1)',[oldToken]),'anon')).number,legacy.number);
    });
    await t.test('fresh retrieval and repeated prepare/create reuse the same token and never extend expiry',async()=>{
      const first=await asUser(alice,()=>call('ensure_receipt_tracking',fresh.id));
      assert.equal(first.state,'active');assert.match(first.token,/^[a-f0-9]{64}$/);
      for(let n=0;n<4;n++){
        assert.deepEqual(await asUser(alice,()=>call('get_receipt_tracking',fresh.id)),first);
        assert.deepEqual(await asUser(alice,()=>call('ensure_receipt_tracking',fresh.id)),first);
      }
      assert.equal(await value('select count(*)::integer from vault.secrets'),2);
    });
    await t.test('revocation cannot be undone by reload, import or ensure; explicit renewal is separate',async()=>{
      await asUser(alice,()=>db.query('select public.revoke_tracking_link($1)',[legacy.id]));
      const revoked=await asUser(alice,()=>call('get_receipt_tracking',legacy.id));
      assert.equal(revoked.state,'revoked');assert.ok(!('token' in revoked));
      assert.equal((await asUser(alice,()=>call('ensure_receipt_tracking',legacy.id))).state,'revoked');
      await assert.rejects(asUser(alice,()=>db.query('select public.import_receipt_tracking($1,$2)',[legacy.id,oldToken])));
      assert.equal(await asUser(null,()=>value('select public.get_order_tracking($1)',[oldToken]),'anon'),null);
      await asUser(alice,()=>db.query('select public.rotate_tracking_link($1,$2)',[legacy.id,newToken]));
      assert.equal((await asUser(alice,()=>call('get_receipt_tracking',legacy.id))).token,newToken);
      assert.equal(await asUser(null,()=>value('select public.get_order_tracking($1)',[oldToken]),'anon'),null);
    });
    await t.test('expired QR remains expired on retrieval/ensure and cannot be imported to extend it',async()=>{
      const old=await asUser(alice,()=>call('get_receipt_tracking',fresh.id));
      await db.query("update public.tracking_links set expires_at=now()-interval '1 second' where order_id=$1",[fresh.id]);
      for(const name of ['get_receipt_tracking','ensure_receipt_tracking']){
        const result=await asUser(alice,()=>call(name,fresh.id));assert.equal(result.state,'expired');assert.ok(!('token' in result));
      }
      await assert.rejects(asUser(alice,()=>db.query('select public.import_receipt_tracking($1,$2)',[fresh.id,old.token])));
    });
    await t.test('mismatched secret is never returned, and hash-verified recovery does not rotate it',async()=>{
      const before=await asUser(alice,()=>call('get_receipt_tracking',legacy.id));
      await db.query("update vault.secrets set secret=encode(convert_to($1,'UTF8'),'base64') where id=(select vault_secret_id from public.tracking_links where order_id=$2)",['f'.repeat(64),legacy.id]);
      const broken=await asUser(alice,()=>call('get_receipt_tracking',legacy.id));assert.equal(broken.state,'unavailable');assert.ok(!('token' in broken));
      await asUser(alice,()=>db.query('select public.import_receipt_tracking($1,$2)',[legacy.id,newToken]));
      assert.deepEqual(await asUser(alice,()=>call('get_receipt_tracking',legacy.id)),before);
    });
  }finally{await db.close();}
});
