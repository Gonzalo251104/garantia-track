import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('database authorization, transactions and private storage',async t=>{
  const db=new PGlite();
  const alice='00000000-0000-4000-8000-000000000001';
  const bob='00000000-0000-4000-8000-000000000002';
  const request='00000000-0000-4000-8000-000000000003';
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,storage to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to authenticated,anon;
    insert into auth.users values('${alice}'),('${bob}');
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202610280001_workshop_backend.sql',import.meta.url),'utf8'));
  const asUser=async(id,fn,role='authenticated')=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);try{return await fn();}finally{await db.exec('reset role');}};
  const value=async(sql,params=[])=>Object.values((await db.query(sql,params)).rows[0])[0];
  let wa,wb,order,photo;
  try{
    await t.test('onboarding creates memberships without self-escalation access',async()=>{
      wa=await asUser(alice,()=>value("select public.create_workshop('Alpha Workshop')"));
      wb=await asUser(bob,()=>value("select public.create_workshop('Beta Workshop')"));
      assert.deepEqual(await asUser(alice,async()=>(await db.query('select name from public.workshops')).rows),[{name:'Alpha Workshop'}]);
      await assert.rejects(asUser(alice,()=>db.query('insert into public.workshop_members values($1,$2,\'owner\')',[wb,alice])));
      await assert.rejects(asUser(null,()=>db.query("select public.create_workshop('Anonymous')"), 'anon'));
    });
    await t.test('intake is idempotent and records one initial event',async()=>{
      const payload={customer:'Demo',phone:'900000001',device:'controller',model:'DualSense',issue:'Drift',accessories:['Cable USB']};
      const create=()=>db.query('select (public.create_repair_order($1,$2,$3::jsonb)).*',[wa,request,JSON.stringify(payload)]);
      order=(await asUser(alice,create)).rows[0];
      const retry=(await asUser(alice,create)).rows[0];assert.equal(retry.id,order.id);
      assert.equal(await value('select count(*)::integer from public.order_events'),1);
      await assert.rejects(asUser(bob,create),/access denied/i);
      assert.equal(await asUser(bob,()=>value('select count(*)::integer from public.repair_orders')),0);
    });
    await t.test('updates enforce tenant membership, atomic events and stale-version rejection',async()=>{
      await assert.rejects(asUser(bob,()=>db.query("select public.update_repair_order($1,1,'repairing',8500,'secret','Repair started')",[order.id])),/access denied/i);
      await assert.rejects(asUser(alice,()=>db.query("update public.repair_orders set customer='Bypass' where id=$1",[order.id])));
      await asUser(alice,()=>db.query("select public.update_repair_order($1,1,'repairing',8500,'private diagnosis','Repair started')",[order.id]));
      assert.equal(await value('select count(*)::integer from public.order_events'),2);
      await assert.rejects(asUser(alice,()=>db.query("select public.update_repair_order($1,1,'ready',8500,'','Ready')",[order.id])),/another session/i);
      await assert.rejects(asUser(alice,()=>db.query("select public.update_repair_order($1,2,'invalid',8500,'','Ready')",[order.id])));
      assert.equal(await value('select count(*)::integer from public.order_events'),2);
    });
    await t.test('photo reservations constrain tenant, path, slot count and overwrite access',async()=>{
      photo=(await asUser(alice,()=>db.query('select (public.reserve_order_photo($1,$2)).*',[order.id,crypto.randomUUID()]))).rows[0];
      assert.equal(await asUser(alice,()=>value('select public.complete_order_photo($1)',[photo.id])),false);
      await assert.rejects(asUser(bob,()=>db.query("insert into storage.objects(bucket_id,name) values('repair-photos',$1)",[photo.path])));
      await assert.rejects(asUser(alice,()=>db.query("insert into storage.objects(bucket_id,name) values('repair-photos','arbitrary/path.jpg')")));
      await asUser(alice,()=>db.query("insert into storage.objects(bucket_id,name) values('repair-photos',$1)",[photo.path]));
      assert.equal(await asUser(alice,()=>value('select public.complete_order_photo($1)',[photo.id])),true);
      assert.equal(await asUser(bob,()=>value('select count(*)::integer from storage.objects')),0);
      assert.equal(await asUser(null,()=>value('select count(*)::integer from storage.objects'), 'anon'),0);
      assert.equal((await asUser(alice,()=>db.query("update storage.objects set name='changed' returning id"))).rows.length,0);
      for(let i=0;i<4;i++)await asUser(alice,()=>db.query('select public.reserve_order_photo($1,$2)',[order.id,crypto.randomUUID()]));
      await assert.rejects(asUser(alice,()=>db.query('select public.reserve_order_photo($1,$2)',[order.id,crypto.randomUUID()])),/five photos/i);
      await assert.rejects(asUser(bob,()=>db.query('select public.reserve_order_photo($1,$2)',[order.id,crypto.randomUUID()])),/access denied/i);
    });
    await t.test('anonymous tracking exposes only an allowlist and supports rotation, expiry and revocation',async()=>{
      const token='a'.repeat(64),next='b'.repeat(64);
      await asUser(alice,()=>db.query('select public.rotate_tracking_link($1,$2)',[order.id,token]));
      const tracked=await asUser(null,()=>value('select public.get_order_tracking($1)',[token]),'anon');
      assert.deepEqual(Object.keys(tracked).sort(),['created','device','events','message','model','number','status','workshop'].sort());
      assert.equal(tracked.events.length,2);
      await assert.rejects(asUser(null,()=>db.query('select * from public.repair_orders'),'anon'));
      await assert.rejects(asUser(alice,()=>db.query('select * from public.tracking_links')));
      await assert.rejects(asUser(bob,()=>db.query('select public.rotate_tracking_link($1,$2)',[order.id,next])),/access denied/i);
      await asUser(alice,()=>db.query('select public.rotate_tracking_link($1,$2)',[order.id,next]));
      assert.equal(await asUser(null,()=>value('select public.get_order_tracking($1)',[token]),'anon'),null);
      await db.query("update public.tracking_links set expires_at=now()-interval '1 second'");
      assert.equal(await asUser(null,()=>value('select public.get_order_tracking($1)',[next]),'anon'),null);
      await asUser(alice,()=>db.query('select public.rotate_tracking_link($1,$2)',[order.id,token]));
      await asUser(alice,()=>db.query('select public.revoke_tracking_link($1)',[order.id]));
      assert.equal(await asUser(null,()=>value('select public.get_order_tracking($1)',[token]),'anon'),null);
    });
  }finally{await db.close();}
});
