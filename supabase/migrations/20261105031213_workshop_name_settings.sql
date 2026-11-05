-- Keep table writes closed; the private implementation checks current ownership.
create function private.rename_workshop(p_workshop uuid,p_previous_name text,p_name text)
returns public.workshops
language plpgsql security definer set search_path = '' as $$
declare
  result public.workshops;
  clean_name text := btrim(p_name);
begin
  if auth.uid() is null then
    raise exception 'Workshop owner access required' using errcode='42501';
  end if;
  select w.* into result
  from public.workshops w
  join public.workshop_members m on m.workshop_id=w.id and m.user_id=auth.uid() and m.role='owner'
  where w.id=p_workshop and w.owner_id=auth.uid()
  for update of w;
  if not found then
    raise exception 'Workshop owner access required' using errcode='42501';
  end if;
  if clean_name is null or length(clean_name) not between 2 and 80 or p_name ~ '[[:cntrl:]]' then
    raise exception 'Workshop name must contain 2 to 80 characters without control characters' using errcode='23514';
  end if;
  -- Accept a retry after a lost response, without overwriting a newer name.
  if result.name=clean_name then return result; end if;
  if result.name is distinct from p_previous_name then
    raise exception 'Workshop name changed in another session' using errcode='40001';
  end if;
  update public.workshops set name=clean_name where id=p_workshop returning * into result;
  return result;
end;
$$;

-- Expose only an invoker wrapper through the Data API.
create function public.rename_workshop(p_workshop uuid,p_previous_name text,p_name text)
returns public.workshops
language sql security invoker set search_path = '' as $$
  select private.rename_workshop(p_workshop,p_previous_name,p_name);
$$;

revoke all on function private.rename_workshop(uuid,text,text),public.rename_workshop(uuid,text,text) from public,anon,authenticated;
grant execute on function private.rename_workshop(uuid,text,text),public.rename_workshop(uuid,text,text) to authenticated;
