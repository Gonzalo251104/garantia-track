-- Authenticated writes are transactional RPCs. Tables have read-only API grants.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 80),
  owner_id uuid not null unique references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.workshop_members (
  workshop_id uuid not null references public.workshops(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','technician')),
  primary key (workshop_id,user_id)
);
create index on public.workshop_members(user_id);
create sequence public.order_number_seq start 1041;
create table public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id),
  request_id uuid not null,
  number bigint not null default nextval('public.order_number_seq') unique,
  customer text not null check (length(btrim(customer)) between 1 and 80),
  phone text not null check (phone ~ '^9[0-9]{8}$'),
  device text not null check (device in ('console','controller')),
  model text not null check (length(btrim(model)) between 1 and 100),
  serial text not null default '' check (length(serial)<=80),
  issue text not null check (length(btrim(issue)) between 1 and 1500),
  condition text not null default '' check (length(condition)<=1500),
  accessories text[] not null default '{}' check (cardinality(accessories)<=20),
  status text not null default 'received' check (status in ('received','diagnosing','awaiting_approval','repairing','ready','delivered')),
  quote integer not null default 0 check (quote between 0 and 99999999),
  notes text not null default '' check (length(notes)<=2000),
  message text not null default 'Recibimos tu equipo. Pronto iniciaremos la revisión.' check (length(btrim(message)) between 1 and 600),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id,request_id),
  unique (workshop_id,id)
);
create index on public.repair_orders(workshop_id,number desc);
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null,
  order_id uuid not null,
  status text not null,
  at timestamptz not null default now(),
  actor_id uuid not null references auth.users(id),
  foreign key (workshop_id,order_id) references public.repair_orders(workshop_id,id)
);
create index on public.order_events(workshop_id,order_id,at);
create table public.order_photos (
  id uuid primary key,
  workshop_id uuid not null,
  order_id uuid not null,
  slot integer not null check (slot between 1 and 5),
  path text not null unique,
  state text not null default 'pending' check (state in ('pending','ready')),
  created_at timestamptz not null default now(),
  foreign key (workshop_id,order_id) references public.repair_orders(workshop_id,id),
  unique (order_id,slot)
);
create index on public.order_photos(workshop_id,order_id);
create table public.tracking_links (
  order_id uuid primary key references public.repair_orders(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create function private.is_member(p_workshop uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workshop_members where workshop_id=p_workshop and user_id=auth.uid());
$$;
revoke all on function private.is_member(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;

alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.repair_orders enable row level security;
alter table public.order_events enable row level security;
alter table public.order_photos enable row level security;
alter table public.tracking_links enable row level security;
create policy member_read on public.workshops for select to authenticated using (private.is_member(id));
create policy member_read on public.workshop_members for select to authenticated using (private.is_member(workshop_id));
create policy member_read on public.repair_orders for select to authenticated using (private.is_member(workshop_id));
create policy member_read on public.order_events for select to authenticated using (private.is_member(workshop_id));
create policy member_read on public.order_photos for select to authenticated using (private.is_member(workshop_id));
revoke all on public.workshops,public.workshop_members,public.repair_orders,public.order_events,public.order_photos,public.tracking_links from anon,authenticated;
grant select on public.workshops,public.workshop_members,public.repair_orders,public.order_events,public.order_photos to authenticated;
revoke all on sequence public.order_number_seq from anon,authenticated;

create function public.create_workshop(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.workshop_members where user_id=auth.uid()) then raise exception 'User already belongs to a workshop'; end if;
  insert into public.workshops(name,owner_id) values(btrim(p_name),auth.uid()) returning id into result;
  insert into public.workshop_members values(result,auth.uid(),'owner');
  return result;
end;
$$;

create function public.create_repair_order(p_workshop uuid,p_request uuid,p_order jsonb) returns public.repair_orders
language plpgsql security definer set search_path = '' as $$
declare result public.repair_orders;
begin
  if not private.is_member(p_workshop) then raise exception 'Workshop access denied' using errcode='42501'; end if;
  -- Serialize duplicate requests without relying on browser-generated numbering.
  perform pg_advisory_xact_lock(hashtextextended(p_workshop::text || p_request::text,0));
  select * into result from public.repair_orders where workshop_id=p_workshop and request_id=p_request;
  if found then return result; end if;
  insert into public.repair_orders(workshop_id,request_id,customer,phone,device,model,serial,issue,condition,accessories)
  values(p_workshop,p_request,btrim(p_order->>'customer'),p_order->>'phone',p_order->>'device',btrim(p_order->>'model'),coalesce(p_order->>'serial',''),btrim(p_order->>'issue'),coalesce(p_order->>'condition',''),array(select jsonb_array_elements_text(coalesce(p_order->'accessories','[]'::jsonb)))) returning * into result;
  insert into public.order_events(workshop_id,order_id,status,actor_id) values(p_workshop,result.id,result.status,auth.uid());
  return result;
end;
$$;

create function public.update_repair_order(p_id uuid,p_version integer,p_status text,p_quote integer,p_notes text,p_message text) returns public.repair_orders
language plpgsql security definer set search_path = '' as $$
declare result public.repair_orders; previous text;
begin
  select * into result from public.repair_orders where id=p_id for update;
  if not found or not private.is_member(result.workshop_id) then raise exception 'Order access denied' using errcode='42501'; end if;
  if result.version<>p_version then raise exception 'Order changed in another session. Reload before saving.' using errcode='40001'; end if;
  previous:=result.status;
  update public.repair_orders set status=p_status,quote=p_quote,notes=p_notes,message=p_message,version=version+1,updated_at=now() where id=p_id returning * into result;
  if previous<>p_status then
    insert into public.order_events(workshop_id,order_id,status,actor_id) values(result.workshop_id,p_id,p_status,auth.uid());
    if p_status='delivered' then update public.tracking_links set expires_at=least(expires_at,now()+interval '30 days') where order_id=p_id; end if;
  end if;
  return result;
end;
$$;

create function public.reserve_order_photo(p_order uuid,p_photo uuid) returns public.order_photos
language plpgsql security definer set search_path = '' as $$
declare item public.repair_orders; result public.order_photos; free_slot integer;
begin
  select * into item from public.repair_orders where id=p_order for update;
  if not found or not private.is_member(item.workshop_id) then raise exception 'Order access denied' using errcode='42501'; end if;
  select * into result from public.order_photos where id=p_photo and order_id=p_order;
  if found then return result; end if;
  select candidate.value into free_slot from generate_series(1,5) as candidate(value) where not exists(select 1 from public.order_photos p where p.order_id=p_order and p.slot=candidate.value) order by candidate.value limit 1;
  if free_slot is null then raise exception 'Maximum of five photos per order'; end if;
  insert into public.order_photos(id,workshop_id,order_id,slot,path) values(p_photo,item.workshop_id,p_order,free_slot,item.workshop_id::text || '/' || p_order::text || '/' || p_photo::text || '.jpg') returning * into result;
  return result;
end;
$$;
create function public.complete_order_photo(p_photo uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare photo public.order_photos;
begin
  select * into photo from public.order_photos where id=p_photo for update;
  if not found or not private.is_member(photo.workshop_id) then raise exception 'Photo access denied' using errcode='42501'; end if;
  if not exists(select 1 from storage.objects where bucket_id='repair-photos' and name=photo.path) then return false; end if;
  update public.order_photos set state='ready' where id=p_photo;
  return true;
end;
$$;

create function public.rotate_tracking_link(p_order uuid,p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.repair_orders where id=p_order and private.is_member(workshop_id)) then raise exception 'Order access denied' using errcode='42501'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid tracking token'; end if;
  insert into public.tracking_links(order_id,token_hash,expires_at) values(p_order,encode(sha256(convert_to(p_token,'UTF8')),'hex'),now()+interval '30 days')
  on conflict(order_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,revoked_at=null;
end;
$$;
create function public.revoke_tracking_link(p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.repair_orders where id=p_order and private.is_member(workshop_id)) then raise exception 'Order access denied' using errcode='42501'; end if;
  update public.tracking_links set revoked_at=now() where order_id=p_order;
end;
$$;
create function public.get_order_tracking(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('number',o.number,'device',o.device,'model',o.model,'status',o.status,'message',o.message,'created',o.created_at,'workshop',w.name,
    'events',coalesce((select jsonb_agg(jsonb_build_object('status',ev.status,'at',ev.at) order by ev.at,ev.id) from public.order_events ev where ev.order_id=o.id),'[]'::jsonb))
  from public.tracking_links t join public.repair_orders o on o.id=t.order_id join public.workshops w on w.id=o.workshop_id
  where p_token ~ '^[a-f0-9]{64}$' and t.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and t.revoked_at is null and t.expires_at>now();
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('repair-photos','repair-photos',false,2097152,array['image/jpeg']);
create policy workshop_photo_read on storage.objects for select to authenticated using (
  bucket_id='repair-photos' and exists(select 1 from public.order_photos p where p.path=name and private.is_member(p.workshop_id))
);
create policy workshop_photo_insert on storage.objects for insert to authenticated with check (
  bucket_id='repair-photos' and exists(select 1 from public.order_photos p where p.path=name and p.state='pending' and private.is_member(p.workshop_id))
);
-- No UPDATE/DELETE policy: uploads cannot overwrite evidence or remove it directly.

revoke all on function public.create_workshop(text),public.create_repair_order(uuid,uuid,jsonb),public.update_repair_order(uuid,integer,text,integer,text,text),public.reserve_order_photo(uuid,uuid),public.complete_order_photo(uuid),public.rotate_tracking_link(uuid,text),public.revoke_tracking_link(uuid),public.get_order_tracking(text) from public,anon,authenticated;
grant execute on function public.create_workshop(text),public.create_repair_order(uuid,uuid,jsonb),public.update_repair_order(uuid,integer,text,integer,text,text),public.reserve_order_photo(uuid,uuid),public.complete_order_photo(uuid),public.rotate_tracking_link(uuid,text),public.revoke_tracking_link(uuid) to authenticated;
grant execute on function public.get_order_tracking(text) to anon,authenticated;
