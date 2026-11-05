import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('workshop renaming keeps owner authorization and closed table writes',async t=>{
  const db=new PGlite();
  const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',technician='00000000-0000-4000-8000-000000000003';
  t.after(()=>db.close());
  await db.exec(`
    create role anon nologin;create role authenticated nologin;
    create schema auth;create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,storage to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;
    insert into auth.users values('${owner}'),('${other}'),('${technician}');
  `);
  for(const file of ['20261028060929_workshop_backend.sql','20261105031213_workshop_name_settings.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const asUser=async(id,fn,role='authenticated')=>{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);try{return await fn();}finally{await db.exec('reset role');}};
  const create=async(id,name)=>asUser(id,async()=>(await db.query('select * from public.create_workshop($1)',[name])).rows[0].create_workshop);
  const workshop=await create(owner,'Original Workshop'),second=await create(other,'Other Workshop');
  await db.query("insert into public.workshop_members values($1,$2,'technician')",[workshop,technician]);
  const rename=(id,previous,name,schema='public')=>db.query(`select * from ${schema}.rename_workshop($1,$2,$3)`,[id,previous,name]);
  const stored=async()=>(await db.query('select * from public.workshops where id=$1',[workshop])).rows[0];

  await t.test('owner rename trims the name and preserves workshop identity',async()=>{
    const before=await stored();
    const saved=(await asUser(owner,()=>rename(workshop,before.name,'  Taller Reparación Ñ  '))).rows[0];
    assert.equal(saved.name,'Taller Reparación Ñ');assert.deepEqual({...saved,name:before.name},before);
    assert.equal((await asUser(technician,()=>db.query('select name from public.workshops where id=$1',[workshop]))).rows[0].name,saved.name);
  });
  await t.test('anonymous, missing-session, technician, foreign-owner and missing-workshop calls are denied',async()=>{
    const before=await stored();
    for(const schema of ['public','private']){
      await assert.rejects(asUser(null,()=>rename(workshop,before.name,'Denied name',schema),'anon'));
      for(const id of [null,technician,other])await assert.rejects(asUser(id,()=>rename(workshop,before.name,'Denied name',schema)),failure=>failure.code==='42501');
      await assert.rejects(asUser(owner,()=>rename(second,'Other Workshop','Denied name',schema)),failure=>failure.code==='42501');
      await assert.rejects(asUser(owner,()=>rename('00000000-0000-4000-8000-000000000099','Unknown','Denied name',schema)),failure=>failure.code==='42501');
    }
    assert.deepEqual(await stored(),before);
  });
  await t.test('ownership and current owner membership must both match',async()=>{
    const before=await stored();
    await db.query("insert into public.workshop_members values($1,$2,'owner')",[workshop,other]);
    await assert.rejects(asUser(other,()=>rename(workshop,before.name,'Forged ownership')),failure=>failure.code==='42501');
    await db.query("update public.workshop_members set role='technician' where workshop_id=$1 and user_id=$2",[workshop,owner]);
    await assert.rejects(asUser(owner,()=>rename(workshop,before.name,'Lost owner role')),failure=>failure.code==='42501');
    await db.query('delete from public.workshop_members where workshop_id=$1 and user_id=$2',[workshop,owner]);
    await assert.rejects(asUser(owner,()=>rename(workshop,before.name,'Removed membership')),failure=>failure.code==='42501');
    await db.query("insert into public.workshop_members values($1,$2,'owner')",[workshop,owner]);
    assert.deepEqual(await stored(),before);
  });
  await t.test('invalid and stale names cannot overwrite a saved name; lost-response retries are idempotent',async()=>{
    const before=await stored();
    for(const name of [null,'','  ','X','x'.repeat(81),'New\nName','New\tName'])await assert.rejects(asUser(owner,()=>rename(workshop,before.name,name)),failure=>failure.code==='23514');
    assert.deepEqual(await stored(),before);
    await asUser(owner,()=>rename(workshop,before.name,'Current Workshop'));
    await assert.rejects(asUser(owner,()=>rename(workshop,before.name,'Stale overwrite')),failure=>failure.code==='40001');
    await assert.rejects(asUser(owner,()=>rename(workshop,null,'Missing expected name')),failure=>failure.code==='40001');
    const retry=(await asUser(owner,()=>rename(workshop,before.name,'Current Workshop'))).rows[0];
    assert.equal(retry.name,'Current Workshop');assert.deepEqual(await stored(),retry);
  });
  await t.test('only guarded RPC execution is granted, with RLS and invoker/definer boundaries intact',async()=>{
    await assert.rejects(asUser(owner,()=>db.query("update public.workshops set name='Direct bypass' where id=$1",[workshop])));
    const functions=(await db.query("select n.nspname,p.prosecdef,p.proconfig,has_function_privilege('anon',p.oid,'EXECUTE') as anon_exec,has_function_privilege('authenticated',p.oid,'EXECUTE') as member_exec from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='rename_workshop' order by n.nspname")).rows;
    assert.deepEqual(functions.map(row=>[row.nspname,row.prosecdef,row.anon_exec,row.member_exec]),[['private',true,false,true],['public',false,false,true]]);
    assert.ok(functions.every(row=>row.proconfig.includes('search_path=""')));
    assert.ok((await db.query("select relrowsecurity from pg_class where oid in ('public.workshops'::regclass,'public.workshop_members'::regclass)")).rows.every(row=>row.relrowsecurity));
  });
});
