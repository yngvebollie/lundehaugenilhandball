create table nhf_private.session_load_entries (
 team uuid not null references public.beta_teams on delete cascade,
 athlete uuid not null references auth.users on delete cascade,
 source text not null check(source in ('assignment','court')), event uuid not null,
 day date not null, category text not null check(category in ('other','team','game')),
 minutes int not null check(minutes between 0 and 600),
 weight int not null check(weight between 0 and 5 and ((minutes=0)=(weight=0))),
 primary key(team,athlete,source,event)
);
create index session_load_period on nhf_private.session_load_entries(team,day);
alter table nhf_private.session_load_entries enable row level security;
revoke all on nhf_private.session_load_entries from public,anon,authenticated;
create function nhf_private.session_load(t uuid,lo date,hi date,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); player boolean; coach boolean; eid uuid; src text; d date; cat text; n int; w int;
begin
 player:=exists(select from public.beta_members where id=me and squad=t and role='athlete');
 coach:=coalesce(nhf_private.coaches(t),false);
 if me is null or not (player or coach) then raise exception 'Ingen lagtilgang'; end if;
 if lo is null or hi is null or hi-lo not between 1 and 31 then raise exception 'Ugyldig periode'; end if;
 if v is not null then
  if not player then raise exception 'Kun egne registreringer';end if;
  src:=v->>'source';eid:=(v->>'event')::uuid;
  if src='assignment' then
   select a.day,case a.kind when 'Game' then 'game' when 'Practice' then 'team' else 'other' end into d,cat
    from public.beta_assignments a where a.id=eid and a.squad=t and a.athlete=me;
  elsif src='court' then
   select ((a.shared->>'start')::timestamptz at time zone 'Europe/Oslo')::date,case when a.shared->>'purpose'='team' then 'team' else 'other' end into d,cat
    from nhf_private.court_sessions a where a.team=t and a.id=eid and a.shared is not null and not a.archived and (a.audience is null or me=any(a.audience));
  end if;
  if d is null or d<lo or d>=hi or d>(now() at time zone 'Europe/Oslo')::date then raise exception 'Aktiviteten er ikke tilgjengelig for registrering';end if;
  if v->>'action'='clear' then delete from nhf_private.session_load_entries where team=t and athlete=me and source=src and event=eid;
  elsif v->>'action'='save' then
   n:=(v->>'minutes')::int;w:=(v->>'weight')::int;
   insert into nhf_private.session_load_entries values(t,me,src,eid,d,cat,n,w)
   on conflict(team,athlete,source,event) do update set day=excluded.day,category=excluded.category,minutes=excluded.minutes,weight=excluded.weight;
  else raise exception 'Ukjent handling';end if;
 end if;
 return coalesce((select jsonb_agg(to_jsonb(e)) from nhf_private.session_load_entries e where e.team=t and e.day>=lo and e.day<hi and (coach or e.athlete=me)
 and exists(select from public.beta_members m where m.squad=t and m.id=e.athlete and m.role='athlete')),'[]'::jsonb);
end $$;
create function public.beta_session_load(t uuid,lo date,hi date,v jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.session_load(t,lo,hi,v)$$;
revoke all on function public.beta_session_load(uuid,date,date,jsonb),nhf_private.session_load(uuid,date,date,jsonb) from public,anon,authenticated;
grant execute on function public.beta_session_load(uuid,date,date,jsonb),nhf_private.session_load(uuid,date,date,jsonb) to authenticated;
