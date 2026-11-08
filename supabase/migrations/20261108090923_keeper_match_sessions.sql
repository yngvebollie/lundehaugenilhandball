-- Independent coach observations. Nothing here updates an NHF result or player report.
create table nhf_private.live_sessions (
 match_id uuid primary key references public.beta_matches on delete cascade,
 status text not null default 'idle', version int not null default 0, period int not null default 1,
 elapsed bigint not null default 0, started bigint, events jsonb not null default '[]'
);
revoke all on nhf_private.live_sessions from public,anon,authenticated;

create function nhf_private.live_match(mid uuid,cmd text,rev int,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $live$
declare t uuid; s nhf_private.live_sessions; stamp bigint; ms bigint; e jsonb; k text:=v->>'kind'; side text:=v->>'side';
begin
 select team into t from public.beta_matches where id=mid;
 if auth.uid() is null or t is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang til kampen kreves';end if;
 if cmd='read' then select * into s from nhf_private.live_sessions where match_id=mid;
 else
  if cmd='start' then insert into nhf_private.live_sessions(match_id) values(mid) on conflict do nothing;end if;
  select * into s from nhf_private.live_sessions where match_id=mid for update;
  if not found or rev is distinct from s.version then raise exception 'Kampen er endret. Hent oppdatert stilling før du registrerer.';end if;
  stamp:=floor(extract(epoch from clock_timestamp())*1000);
  ms:=s.elapsed+case when s.status='running' then greatest(0,stamp-s.started) else 0 end;
  if cmd='start' and s.status='idle' or cmd='resume' and s.status='paused' then s.status:='running';
  elsif cmd='pause' and s.status='running' then s.status:='paused';
  elsif cmd='period' and s.status='paused' and s.period<6 then s.period:=s.period+1;s.status:='running';
  elsif cmd='finish' and s.status in ('running','paused') then s.status:='finished';
  elsif cmd='undo' and s.status in ('running','paused') and jsonb_array_length(s.events)>0 then s.events:=s.events - (jsonb_array_length(s.events)-1);
  elsif cmd='event' and s.status='running' then
   if v is null or jsonb_typeof(v)<>'object' or pg_column_size(v)>3000 or jsonb_array_length(s.events)>=2000
    or coalesce(side,'') not in ('own','opp') or coalesce(k,'') not in ('goal','save','wide','block','turnover','steal','warning','two','red')
    or length(coalesce(v->>'player',''))>100 or length(coalesce(v->>'keeper',''))>100 or length(coalesce(v->>'assist',''))>100
    or coalesce(v->>'phase','') not in ('Etablert','Kontring','Retur','Overtall','Undertall','7 m')
    or coalesce(v->>'origin','') not in ('Ukjent','Venstre kant','6 m','9 m','Høyre kant','7 m','Gjennombrudd')
    then raise exception 'Ugyldig hendelse';end if;
   if k in ('goal','save') then
    if coalesce(jsonb_typeof(v->'x'),'')<>'number' or coalesce(jsonb_typeof(v->'y'),'')<>'number' or (v->>'x')::numeric not between 0 and 100 or (v->>'y')::numeric not between 0 and 100
     or side='opp' and nullif(trim(v->>'keeper'),'') is null then raise exception 'Velg keeper og treffpunkt';end if;
   end if;
   e:=jsonb_build_object('seq',s.version+1,'ms',ms,'period',s.period,'side',side,'kind',k,'phase',v->>'phase','origin',v->>'origin','player',trim(v->>'player'),'keeper',trim(v->>'keeper'),
    'assist',case when k='goal' then trim(v->>'assist') end,'x',case when k in ('goal','save') then v->'x' end,'y',case when k in ('goal','save') then v->'y' end);
   s.events:=s.events||jsonb_build_array(e);
  else raise exception 'Handlingen passer ikke med kampklokka';end if;
  update nhf_private.live_sessions set status=s.status,version=s.version+1,period=s.period,elapsed=ms,
   started=case when s.status='running' then stamp end,events=s.events where match_id=mid returning * into s;
 end if;
 return jsonb_build_object('status',coalesce(s.status,'idle'),'version',coalesce(s.version,0),'period',coalesce(s.period,1),
  'elapsed',coalesce(s.elapsed,0),'started',s.started,'now',floor(extract(epoch from clock_timestamp())*1000),'events',coalesce(s.events,'[]'::jsonb));
end $live$;
create function public.beta_live_match(mid uuid,cmd text default 'read',rev int default 0,v jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.live_match(mid,cmd,rev,v)$$;
revoke all on function nhf_private.live_match(uuid,text,int,jsonb),public.beta_live_match(uuid,text,int,jsonb) from public,anon;
grant execute on function nhf_private.live_match(uuid,text,int,jsonb),public.beta_live_match(uuid,text,int,jsonb) to authenticated;
create function nhf_private.live_season(t uuid,reg uuid) returns jsonb language plpgsql stable security definer set search_path='' as $season$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('match',m.id,'day',m.day,'opponent',m.opponent,'events',s.events) order by m.day),'[]')
 from nhf_private.live_sessions s join public.beta_matches m on m.id=s.match_id join public.beta_team_seasons r on r.id=m.registration and r.team=t
 join nhf_private.active_seasons a on a.team=t and a.season=r.season where m.team=t and r.id=reg);
end $season$;
create function public.beta_live_season(t uuid,reg uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.live_season(t,reg)$$;
revoke all on function public.beta_live_season(uuid,uuid),nhf_private.live_season(uuid,uuid) from public,anon;
grant execute on function public.beta_live_season(uuid,uuid),nhf_private.live_season(uuid,uuid) to authenticated;
