-- Requires the project's existing Supabase Vault and pgcrypto extensions.
-- No existing token hash, expiry or revocation state is changed by this migration.
do $$ begin
  if to_regclass('vault.secrets') is null or to_regclass('vault.decrypted_secrets') is null then
    raise exception 'Supabase Vault must be installed before this migration';
  end if;
end $$;

alter table public.tracking_links add column vault_secret_id uuid unique references vault.secrets(id) on delete set null;

create function private.lock_receipt_order(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.repair_orders o where o.id=p_order and private.is_member(o.workshop_id) for update of o;
  if not found then raise exception 'Order access denied' using errcode='42501'; end if;
end;
$$;

create function private.receipt_tracking_state(p_order uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item public.tracking_links; recovered text;
begin
  select * into item from public.tracking_links where order_id=p_order;
  if not found then return jsonb_build_object('state','missing'); end if;
  if item.revoked_at is not null then return jsonb_build_object('state','revoked','expires_at',item.expires_at); end if;
  if item.expires_at<=now() then return jsonb_build_object('state','expired','expires_at',item.expires_at); end if;
  if item.vault_secret_id is null then return jsonb_build_object('state','legacy','expires_at',item.expires_at); end if;
  select decrypted_secret into recovered from vault.decrypted_secrets where id=item.vault_secret_id;
  if recovered is null or recovered !~ '^[a-f0-9]{64}$' or encode(sha256(convert_to(recovered,'UTF8')),'hex')<>item.token_hash then
    return jsonb_build_object('state','unavailable','expires_at',item.expires_at);
  end if;
  return jsonb_build_object('state','active','token',recovered,'expires_at',item.expires_at);
end;
$$;

create function private.store_receipt_token(p_order uuid,p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid tracking token' using errcode='22023'; end if;
  select vault_secret_id into secret_id from public.tracking_links where order_id=p_order;
  if secret_id is null then
    secret_id:=vault.create_secret(p_token,'garantiatrack_tracking_'||p_order::text,'Private customer tracking capability');
  else
    perform vault.update_secret(secret_id,p_token);
  end if;
  return secret_id;
end;
$$;

create function public.get_receipt_tracking(p_order uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.lock_receipt_order(p_order);
  return private.receipt_tracking_state(p_order);
end;
$$;

create function public.ensure_receipt_tracking(p_order uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare token text; secret_id uuid;
begin
  -- A common per-order lock serializes creation, retrieval, import, rotation and revocation.
  perform private.lock_receipt_order(p_order);
  if exists(select 1 from public.tracking_links where order_id=p_order) then
    return private.receipt_tracking_state(p_order);
  end if;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  secret_id:=private.store_receipt_token(p_order,token);
  insert into public.tracking_links(order_id,token_hash,expires_at,vault_secret_id)
    values(p_order,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '30 days',secret_id);
  return private.receipt_tracking_state(p_order);
end;
$$;

create function public.import_receipt_tracking(p_order uuid,p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item public.tracking_links; secret_id uuid;
begin
  perform private.lock_receipt_order(p_order);
  select * into item from public.tracking_links where order_id=p_order;
  if not found or p_token is null or p_token !~ '^[a-f0-9]{64}$' or item.revoked_at is not null or item.expires_at<=now()
    or item.token_hash<>encode(sha256(convert_to(p_token,'UTF8')),'hex') then
    raise exception 'Active tracking link required for this order' using errcode='22023';
  end if;
  -- Escrow the already issued capability; preserve its hash and original expiry exactly.
  secret_id:=private.store_receipt_token(p_order,p_token);
  update public.tracking_links set vault_secret_id=secret_id where order_id=p_order;
  return private.receipt_tracking_state(p_order);
end;
$$;

create or replace function public.rotate_tracking_link(p_order uuid,p_token text) returns void
language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  perform private.lock_receipt_order(p_order);
  secret_id:=private.store_receipt_token(p_order,p_token);
  insert into public.tracking_links(order_id,token_hash,expires_at,vault_secret_id)
    values(p_order,encode(sha256(convert_to(p_token,'UTF8')),'hex'),now()+interval '30 days',secret_id)
  on conflict(order_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,revoked_at=null,vault_secret_id=excluded.vault_secret_id;
end;
$$;

create or replace function public.revoke_tracking_link(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare secret_id uuid;
begin
  perform private.lock_receipt_order(p_order);
  select vault_secret_id into secret_id from public.tracking_links where order_id=p_order;
  update public.tracking_links set revoked_at=now(),vault_secret_id=null where order_id=p_order;
  if secret_id is not null then delete from vault.secrets where id=secret_id; end if;
end;
$$;

revoke all on function private.lock_receipt_order(uuid),private.receipt_tracking_state(uuid),private.store_receipt_token(uuid,text) from public,anon,authenticated;
revoke all on function public.get_receipt_tracking(uuid),public.ensure_receipt_tracking(uuid),public.import_receipt_tracking(uuid,text),public.rotate_tracking_link(uuid,text),public.revoke_tracking_link(uuid) from public,anon,authenticated;
grant execute on function public.get_receipt_tracking(uuid),public.ensure_receipt_tracking(uuid),public.import_receipt_tracking(uuid,text),public.rotate_tracking_link(uuid,text),public.revoke_tracking_link(uuid) to authenticated;
-- Vault keeps its existing restrictive grants. No table or decrypted-view API access is added.
