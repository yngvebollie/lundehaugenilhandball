alter table public.beta_matches add column fixture_override jsonb, add column fixture_source jsonb;

-- A sync writes the source fields together. Keep the latest source while a coach correction is in force.
create function nhf_private.fixture_projection() returns trigger language plpgsql set search_path='' as $$
declare s jsonb; v jsonb;
begin
 if tg_argv[0]='sync' then
   if new.fixture_override is null then return new; end if;
   s=jsonb_build_object('score',new.score,'completed',new.completed,'status',new.status,'day',new.day,'start_time',new.start_time,'venue',new.venue);
 else
   s=coalesce(old.fixture_source,jsonb_build_object('score',old.score,'completed',old.completed,'status',old.status,'day',old.day,'start_time',old.start_time,'venue',old.venue));
 end if;
 v=s||coalesce(new.fixture_override,'{}'::jsonb);
 new:=jsonb_populate_record(new,v);
 new.fixture_source=case when new.fixture_override is not null then s end;
 return new;
end $$;
create trigger fixture_sync_projection before update of day,start_time,venue,score,completed,status on public.beta_matches for each row execute function nhf_private.fixture_projection('sync');
create trigger fixture_edit_projection before update of fixture_override on public.beta_matches for each row execute function nhf_private.fixture_projection('edit');

create function public.beta_edit_fixture(t uuid,m uuid,patch jsonb,expected jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves'; end if;
 if patch is not null then
   if jsonb_typeof(patch)<>'object' or patch-array['score','day','start_time','venue']<>'{}'::jsonb
      or exists(select from jsonb_each(patch) as f where jsonb_typeof(f.value)<>'string')
      or (patch?'score' and (patch->>'score')!~ '^[0-9]{1,3}-[0-9]{1,3}$')
      or (patch?'day' and (patch->>'day')!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      or (patch?'start_time' and (patch->>'start_time')!~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
      or length(patch->>'venue')>160 then raise exception 'Ugyldige kampverdier'; end if;
   if patch?'score' then patch=patch||'{"completed":true,"status":"Ferdig"}'::jsonb; end if;
 end if;
 update public.beta_matches set fixture_override=nullif(patch,'{}'::jsonb) where id=m and team=t and fixture_override is not distinct from expected;
 if not found then raise exception 'Kampen er endret eller finnes ikke. Last inn på nytt.'; end if;
end $$;
revoke all on function public.beta_edit_fixture(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.beta_edit_fixture(uuid,uuid,jsonb,jsonb) to authenticated;
