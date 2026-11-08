import {randomBytes} from 'node:crypto';
import {identifier,requireLab} from './lab-support.mjs';
import {labProject} from './archive.mjs';
const check=requireLab;
const schemas=new Set(['public','private','auth','storage','vault','supabase_migrations']);
export function validateRestore(bundle){
  check(bundle.source===labProject&&bundle.format==='GT-LAB-COMPLETE-1'&&bundle.privateSchemaIncluded===true&&bundle.managedDataSupplemented===true);
  check(Array.isArray(bundle.tables)&&bundle.tables.length>0&&bundle.tables.length<=200);
  const seen=new Set();
  for(let index=0;index<bundle.tables.length;index++){
    const row=bundle.tables[index],key=JSON.stringify([row.schemaname,row.tablename]);
    check(schemas.has(row.schemaname)&&/^[a-z_][a-z0-9_]{0,62}$/.test(row.tablename)&&!seen.has(key)
      &&/^[a-f0-9]{32}$/.test(bundle.snapshot?.[index]));seen.add(key);
  }
  for(const part of ['roles','schema','data']){
    let copying=false;
    for(const line of bundle.parts[part].split(/\r?\n/)){
      if(copying){if(line==='\\.')copying=false;continue;}
      if(/^COPY .+ FROM stdin;$/.test(line)){copying=true;continue;}
      if(line.trimStart().startsWith('\\'))check(/^\\(?:unrestrict|restrict) [a-zA-Z0-9]+$/.test(line));
    }
    check(!copying);
  }
}
function prepareRoles(sql){
  return sql.split('\n').filter(line=>! /\bcli_login_postgres\b/.test(line)).join('\n')
    .replace(/^ALTER ROLE (?:postgres|supabase_admin)\b[^;]*;$/gm,'-- Retain destination-local administrative role attributes.')
    .replace(/\bPASSWORD '(?:[^']|'')*'/g,'PASSWORD NULL')
    .replace(/^CREATE ROLE ([^;\r\n]+);$/gm,(_line,name)=>{
      check(/^(?:[a-z_][a-z0-9_$]*|"(?:[^"]|"")+")$/i.test(name));
      const raw=name.startsWith('"')?name.slice(1,-1).replaceAll('""','"'):name;
      const delimiter='$gt_role_'+randomBytes(8).toString('hex')+'$';
      return `DO ${delimiter} BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${raw.replaceAll("'","''")}') THEN CREATE ROLE ${name}; END IF; END ${delimiter};`;
    });
}

export function restoreDatabase(bundle,runtime,onStage=()=>{}){
  const psql=runtime.psql.bind(runtime);
  onStage('database-input-validation');
  validateRestore(bundle);
  check(bundle.parts.vault.every(row=>/^[a-f0-9-]{36}$/.test(row.old_id)&&/^[a-f0-9-]{36}$/.test(row.order_id)));
  for(const name of ['roles','schema','data'])check(!/^\s*\\(?:connect|!|include|i\s|o\s)/mi.test(bundle.parts[name]));
  const schema=bundle.parts.schema.replace(/^CREATE SCHEMA (?!IF NOT EXISTS)([^;\r\n]+);$/gm,'CREATE SCHEMA IF NOT EXISTS $1;');
  onStage('database-role-adaptation');
  const roles=prepareRoles(bundle.parts.roles);
  const protectedSession=`set log_parameter_max_length=0; set log_parameter_max_length_on_error=0; set log_error_verbosity=terse;
    do $$ begin if current_setting('log_parameter_max_length')<>'0' or current_setting('log_parameter_max_length_on_error')<>'0' then raise exception 'Unprotected restore session'; end if; end $$;`;
  const values=bundle.parts.vault.map(row=>`${row.old_id}\t${row.token}`).join('\n');
  const extraTables=bundle.parts.extraTables||[];
  check(extraTables.every(row=>bundle.tables.some(table=>table.schemaname===row.schema&&table.tablename===row.table)
    &&row.schema!=='vault'&&typeof row.rows_json==='string'));
  const copyText=value=>value.replaceAll('\\','\\\\').replaceAll('\t','\\t').replaceAll('\n','\\n').replaceAll('\r','\\r');
  const extraValues=extraTables.map(row=>[row.schema,row.table,row.rows_json].map(copyText).join('\t')).join('\n');
  const extraCopy=extraTables.length?`copy gt_restore_extra from stdin;\n${extraValues}\n\\.\n`:'';
  const vaultCopy=bundle.parts.vault.length?`copy gt_restore_vault(old_id,token) from stdin;\n${values}\n\\.\n`:'';
  const assertions=[];
  for(let index=0;index<bundle.tables.length;index++){
    const row=bundle.tables[index],expected=bundle.snapshot[index];check(/^[a-f0-9]{32}$/.test(expected));
    if(row.schemaname==='vault')continue;
    const relation=identifier(row.schemaname)+'.'+identifier(row.tablename);
    const items=row.schemaname==='public'&&row.tablename==='tracking_links'
      ? `select (to_jsonb(l)-'vault_secret_id')||jsonb_build_object('vault_secret_id',coalesce(m.old_id,l.vault_secret_id)) as item from public.tracking_links l left join gt_restore_vault m on m.new_id=l.vault_secret_id`
      : `select to_jsonb(x) as item from ${relation} x`;
    assertions.push(`do $$ begin if (select md5(coalesce(jsonb_agg(item order by item::text)::text,'[]')) from (${items}) items) is distinct from '${expected}' then raise exception 'Restored data fingerprint mismatch at table index ${index}'; end if; end $$;`);
  }
  const sql=`begin;
${protectedSession}
create extension if not exists supabase_vault cascade;
drop schema auth cascade; drop schema storage cascade; drop schema public cascade; drop schema if exists supabase_migrations cascade;
set session_replication_role=replica;
${roles}
${schema}
${bundle.parts.data}
${protectedSession}
create temp table gt_restore_extra(table_schema text,table_name text,rows_json jsonb);
${extraCopy}
do $$ declare item record; columns text; begin
  for item in select * from gt_restore_extra loop
    select string_agg(format('%I',a.attname),',' order by a.attnum) into columns from pg_attribute a
      where a.attrelid=format('%I.%I',item.table_schema,item.table_name)::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated='';
    execute format('insert into %I.%I (%s) overriding system value select %s from jsonb_populate_recordset(null::%I.%I,$1)',item.table_schema,item.table_name,columns,columns,item.table_schema,item.table_name) using item.rows_json;
  end loop;
end $$;
set session_replication_role=origin;
create temp table gt_restore_vault(old_id uuid primary key,token text not null,new_id uuid);
${vaultCopy}
update gt_restore_vault set new_id=vault.create_secret(token);
update public.tracking_links l set vault_secret_id=m.new_id from gt_restore_vault m where l.vault_secret_id=m.old_id;
do $$ begin if (select count(*) from vault.secrets)<>${bundle.parts.vault.length} or exists(select 1 from public.tracking_links l join vault.decrypted_secrets v on v.id=l.vault_secret_id where encode(sha256(convert_to(v.decrypted_secret,'UTF8')),'hex')<>l.token_hash) then raise exception 'Vault hash mismatch'; end if; end $$;
${assertions.join('\n')}
select json_build_object('orders',(select count(*) from public.repair_orders),'authUsers',(select count(*) from auth.users),'photoMetadata',(select count(*) from storage.objects where bucket_id='repair-photos'),'vaultRecords',(select count(*) from vault.secrets),'allDataFingerprintsMatch',true,'photoBytesRestored',false);
commit;`;
  onStage('database-atomic-import');
  const result=psql(sql).trim().split(/\r?\n/).filter(line=>line.startsWith('{')).at(-1);check(result);
  onStage('database-summary');
  return JSON.parse(result);
}
