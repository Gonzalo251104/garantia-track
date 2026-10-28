-- PGlite contract double only. This is NOT encryption and is never deployed.
-- Real Vault authenticated encryption and its role grants are tested on Supabase.
create schema vault;
create schema extensions;
create table vault.secrets(id uuid primary key default gen_random_uuid(),secret text not null,name text unique);
alter table vault.secrets enable row level security;
create view vault.decrypted_secrets as select id,convert_from(decode(secret,'base64'),'UTF8') as decrypted_secret from vault.secrets;
create function vault.create_secret(new_secret text,new_name text default null,new_description text default '',new_key_id uuid default null) returns uuid
language plpgsql as $$ declare result uuid; begin
  insert into vault.secrets(secret,name) values(encode(convert_to(new_secret,'UTF8'),'base64'),new_name) returning id into result; return result;
end $$;
create function vault.update_secret(secret_id uuid,new_secret text default null,new_name text default null,new_description text default null,new_key_id uuid default null) returns void
language sql as $$update vault.secrets set secret=coalesce(encode(convert_to(new_secret,'UTF8'),'base64'),secret),name=coalesce(new_name,name) where id=secret_id$$;
create function extensions.gen_random_bytes(length integer) returns bytea language plpgsql as $$begin
  if length<>32 then raise exception 'Contract fixture expects 32 bytes'; end if;
  return sha256(convert_to(gen_random_uuid()::text,'UTF8'));
end$$;
revoke all on schema vault,extensions from public,anon,authenticated;
revoke all on all tables in schema vault from public,anon,authenticated;
revoke all on all functions in schema vault,extensions from public,anon,authenticated;
