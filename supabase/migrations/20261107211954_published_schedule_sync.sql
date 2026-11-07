create table nhf_private.nhf_sync_jobs(token uuid primary key default gen_random_uuid(),reg uuid references public.beta_team_seasons on delete cascade,expires timestamptz not null default now()+interval '15 minutes',claimed boolean not null default false,used boolean not null default false);
revoke all on nhf_private.nhf_sync_jobs from public,anon,authenticated;
create function nhf_private.claim_schedule_job(reg uuid,job uuid) returns jsonb language plpgsql security definer set search_path='' as $job$
declare result jsonb;
begin
 update nhf_private.nhf_sync_jobs j set claimed=true where j.token=$2 and j.reg=$1 and not claimed and expires>now();
 if not found then raise exception 'Ugyldig jobb';end if;
 select to_jsonb(r) into strict result from public.beta_team_seasons r join nhf_private.active_seasons a on a.team=r.team and a.season=r.season where r.id=$1 and r.active;
 return result;
end $job$;
create function public.beta_claim_schedule_job(reg uuid,job uuid) returns jsonb language sql security invoker set search_path='' as $job$
 select nhf_private.claim_schedule_job(reg,job)
$job$;
revoke all on function nhf_private.claim_schedule_job(uuid,uuid),public.beta_claim_schedule_job(uuid,uuid) from public,anon,authenticated;
grant execute on function nhf_private.claim_schedule_job(uuid,uuid),public.beta_claim_schedule_job(uuid,uuid) to service_role;
-- Only the server-side reader of the public NHF schedule may submit source rows.
create function nhf_private.save_published_schedule(reg uuid,actor uuid,sid uuid,items jsonb,job uuid default null)
returns text language plpgsql security definer set search_path='' as $$
declare r public.beta_team_seasons;x jsonb;msg text;scheduled boolean:=false;
begin
 select * into strict r from public.beta_team_seasons where id=reg and active for update;
 if job is not null then update nhf_private.nhf_sync_jobs j set used=true where j.reg=$1 and j.token=job and j.claimed and not j.used and j.expires>now();scheduled:=found;end if;
 if not exists(select from nhf_private.active_seasons where team=r.team and season=r.season) or not scheduled and not exists(select from public.beta_members m where m.id=actor and m.role='coach' and
 (m.squad=r.team or exists(select from nhf_private.extra_coaches where coach=actor and team=r.team)
 or exists(select from nhf_private.club_sessions s join auth.sessions a on a.id=s.session_id and a.user_id=s.account where s.account=actor and s.session_id=sid))) then raise exception 'Trenertilgang til aktiv sesong kreves';end if;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)>500 then raise exception 'Ugyldig terminliste';end if;
 if r.synced_at>now()-interval '60 seconds' then return coalesce(r.sync_result,'Terminlisten er nylig oppdatert.');end if;
 for x in select value from jsonb_array_elements(items) loop
  if (x->>'season')::int is distinct from r.season or (x->>'org')::int is distinct from r.org_id
   or cardinality(r.leagues)>0 and not coalesce((x->>'league')::int=any(r.leagues),false) or (x->>'id')::int<=0 then raise exception 'Feil lag, serie eller sesong';end if;
  -- A temporarily unpublished score must not blank an existing final result.
  if x->>'score' is null and exists(select from public.beta_matches where registration=reg and nif_id=(x->>'id')::int and completed and score is not null) then continue;end if;
  if nullif(x->>'age','') is null then x:=x||jsonb_build_object('age',(select age_class from public.beta_matches where registration=reg and nif_id=(x->>'id')::int));end if;
  perform nhf_private.import_fixture(reg,x,'[]'::jsonb,false);
 end loop;
 msg:='NHFs offentlige terminliste: '||jsonb_array_length(items)||' kamper i utvalget. Ingen spillerdata lagret.';
 update public.beta_team_seasons set sync_result=msg,synced_at=now() where id=reg;return msg;
end $$;
create function public.beta_save_published_schedule(reg uuid,actor uuid,sid uuid,items jsonb,job uuid default null) returns text language sql security invoker set search_path='' as $$select nhf_private.save_published_schedule(reg,actor,sid,items,job)$$;
revoke all on function nhf_private.save_published_schedule(uuid,uuid,uuid,jsonb,uuid),public.beta_save_published_schedule(uuid,uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function nhf_private.save_published_schedule(uuid,uuid,uuid,jsonb,uuid),public.beta_save_published_schedule(uuid,uuid,uuid,jsonb,uuid) to service_role;
