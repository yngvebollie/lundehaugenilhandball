alter table nhf_private.court_exercise_ratings add coach_visible boolean not null default false;
-- Only the informed rating flow shares a named rating. Existing private ratings stay private.
create function nhf_private.share_rating(t uuid,k text,kind text,activity uuid,item text,caption text,score integer)
returns integer language plpgsql security definer set search_path='' as $$
declare result integer; rk text;
begin
 if score is null then raise exception 'Velg stjerner'; end if;
 if kind='catalog' then
   result:=nhf_private.court_rating(t,k,score);rk:=k;
 else
   result:=nhf_private.assigned_rating(t,kind,activity,item,caption,score);
   rk:=kind||':'||activity::text||':'||item||':'||md5(caption);
 end if;
 update nhf_private.court_exercise_ratings set coach_visible=true where team=t and athlete=auth.uid() and exercise=rk;
 return result;
end $$;
create function public.beta_share_rating(t uuid,k text,kind text,activity uuid,item text,caption text,score integer) returns integer language sql security invoker set search_path='' as $$select nhf_private.share_rating(t,k,kind,activity,item,caption,score)$$;

create function nhf_private.team_ratings(t uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(nhf_private.coaches(t),false) then raise exception 'Trenertilgang kreves';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('athlete',r.athlete,'exercise',r.exercise,'label',coalesce(r.exercise_label,e.name,c.record->>'title'),'origin',r.origin,'activity',r.activity_id,'item',r.item_key,'stars',r.stars,'updated',r.updated_at) order by r.updated_at desc)
 from nhf_private.court_exercise_ratings r join public.beta_members m on m.id=r.athlete and m.squad=t and m.role='athlete'
 left join public.beta_exercises e on e.squad=t and e.id::text=r.exercise left join nhf_private.court_catalog c on c.team=t and c.id=r.exercise
 where r.team=t and r.coach_visible and (r.origin<>'catalog' or nhf_private.court_available(t,r.exercise))),'[]'::jsonb);
end $$;
create function public.beta_team_ratings(t uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.team_ratings(t)$$;

create table nhf_private.regular_activities(
 id uuid primary key default gen_random_uuid(),team uuid not null references public.beta_teams on delete cascade,
 athlete uuid not null references auth.users on delete cascade, title text not null check(length(trim(title)) between 1 and 90),
 kind text not null check(kind in ('gym','other')),days integer[] not null check(cardinality(days) between 1 and 7 and days <@ array[1,2,3,4,5,6,7]),
 clock time not null,minutes integer not null check(minutes between 1 and 600),weight integer not null check(weight between 1 and 5),
 starts date not null,ends date,check(ends is null or ends>=starts));
create index regular_team_athlete on nhf_private.regular_activities(team,athlete,starts);
alter table nhf_private.regular_activities enable row level security;
revoke all on nhf_private.regular_activities from public,anon,authenticated;
create function nhf_private.regular(t uuid,action text,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); coach boolean:=coalesce(nhf_private.coaches(t),false); day date:=(now() at time zone 'Europe/Oslo')::date; d integer[]; s date; e date; tm time; dur int; rid uuid; w int; tag text;
begin
 if me is null or not (coach or exists(select from public.beta_members where id=me and squad=t and role='athlete')) then raise exception 'Ingen lagtilgang';end if;
 if action in ('add','stop') then
  if not exists(select from public.beta_members where id=me and squad=t and role='athlete') then raise exception 'Kun egne aktiviteter';end if;
  perform pg_advisory_xact_lock(hashtextextended(t::text||me::text,0));
  if action='add' then
   d:=array(select distinct n::int from jsonb_array_elements_text(v->'days') n order by 1);
   s:=(v->>'starts')::date;e:=nullif(v->>'ends','')::date;tm:=(v->>'clock')::time;dur:=(v->>'minutes')::int;tag:=v->>'kind';w:=(v->>'weight')::int;
   if tm+make_interval(mins=>dur)<tm or tm=time '24:00' then raise exception 'Velg en aktivitet som slutter samme dag';end if;
   if exists(select from nhf_private.regular_activities a where a.team=t and a.athlete=me and a.days && d and daterange(a.starts,a.ends,'[]') && daterange(s,e,'[]') and tm<a.clock+make_interval(mins=>a.minutes) and a.clock<tm+make_interval(mins=>dur))
   then raise exception 'Aktiviteten overlapper en annen fast aktivitet';end if;
   insert into nhf_private.regular_activities(team,athlete,title,kind,days,clock,minutes,weight,starts,ends)
    values(t,me,case when tag='gym' then 'Skolegym' else trim(v->>'title') end,tag,d,tm,dur,w,s,e);
  else
   rid:=(v->>'id')::uuid;
   if not exists(select from nhf_private.regular_activities where id=rid and team=t and athlete=me) then raise exception 'Ukjent aktivitet';end if;
   delete from nhf_private.regular_activities where id=rid and team=t and athlete=me and starts>=day;
   update nhf_private.regular_activities set ends=day-1 where id=rid and team=t and athlete=me and (ends is null or ends>=day);
  end if;
 elsif action is distinct from 'read' then raise exception 'Ukjent handling';end if;
 return coalesce((select jsonb_agg(to_jsonb(a) order by a.starts,a.clock) from nhf_private.regular_activities a where a.team=t and (a.athlete=me or coach) and exists(select from public.beta_members m where m.id=a.athlete and m.squad=t and m.role='athlete')),'[]'::jsonb);
end $$;
create function public.beta_regular(t uuid,action text default 'read',v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select nhf_private.regular(t,action,v) $$;
revoke all on function nhf_private.regular(uuid,text,jsonb),public.beta_regular(uuid,text,jsonb),nhf_private.team_ratings(uuid),public.beta_team_ratings(uuid),nhf_private.share_rating(uuid,text,text,uuid,text,text,int),public.beta_share_rating(uuid,text,text,uuid,text,text,int) from public,anon,authenticated;
grant execute on function nhf_private.regular(uuid,text,jsonb),public.beta_regular(uuid,text,jsonb),nhf_private.team_ratings(uuid),public.beta_team_ratings(uuid),nhf_private.share_rating(uuid,text,text,uuid,text,text,int),public.beta_share_rating(uuid,text,text,uuid,text,text,int) to authenticated;
