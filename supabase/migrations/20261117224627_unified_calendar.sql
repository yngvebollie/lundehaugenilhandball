create function nhf_private.calendar_change(t uuid, action text, items jsonb, v jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a public.beta_assignments%rowtype; x jsonb; expected jsonb; lines text[];
 d date; tm time; dur int; title_text text; kind_text text; oslo date:=(now() at time zone 'Europe/Oslo')::date;
begin
 if auth.uid() is null or not coalesce(nhf_private.coaches(t),false) then raise exception 'Trenertilgang kreves.';end if;
 if action is null or action not in ('save','remove') or jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 200 then raise exception 'Velg aktiviteter.';end if;
 if (select count(distinct i->>'id') from jsonb_array_elements(items) i)<>jsonb_array_length(items) then raise exception 'Duplikate aktiviteter.';end if;
 if action='save' then
  d:=(v->>'day')::date;tm:=nullif(v->>'start_time','')::time;dur:=(v->>'minutes')::int;title_text:=trim(v->>'title');kind_text:=v->>'kind';
  lines:=array(select jsonb_array_elements_text(v->'exercises'));
  if d is null or d<oslo or title_text is null or length(title_text) not between 1 and 100 or kind_text is null or kind_text not in ('Session','Practice','Game')
   or dur is not null and (dur not between 5 and 600 or dur%5<>0) or tm>=time '24:00'
   or cardinality(lines) not between 1 and 40 or exists(select from unnest(lines) l where l is null or length(trim(l)) not between 1 and 250) then raise exception 'Kontroller dato, navn, minutter og øvelser.';end if;
 end if;
 -- Lock in stable order; validate the complete group before any write is committed.
 for x in select value from jsonb_array_elements(items) order by value->>'id' loop
  select * into a from public.beta_assignments where id=(x->>'id')::uuid and squad=t for update;
  if not found or a.personal or a.day<oslo or not exists(select from public.beta_members where id=a.athlete and squad=t and role='athlete') then raise exception 'Aktiviteten kan ikke redigeres.';end if;
  expected:=jsonb_build_object('title',a.title,'day',a.day,'kind',coalesce(a.kind,'Session'),'minutes',a.minutes,'start_time',to_char(a.start_time,'HH24:MI'),'exercises',a.exercises);
  if expected is distinct from x->'prior' then raise exception 'En annen trener har endret planen. Lukk og åpne aktiviteten på nytt.';end if;
  if exists(select from public.beta_checks where assignment=a.id) or exists(select from public.beta_feedback where assignment=a.id)
   or exists(select from public.beta_workout_reviews where assignment=a.id)
   or exists(select from nhf_private.court_exercise_ratings where activity_id=a.id and origin='assignment')
   or exists(select from nhf_private.session_load_entries where event=a.id and source='assignment') then raise exception 'Registrert aktivitet er beskyttet. Historikken endres ikke.';end if;
  if action='remove' then delete from public.beta_assignments where id=a.id;
  else
   update public.beta_assignments set title=title_text,day=d,start_time=tm,minutes=dur,kind=kind_text where id=a.id;
   if a.exercises is distinct from lines then update public.beta_assignments set exercises=lines where id=a.id;end if;
   insert into public.beta_player_log(team,athlete,actor,action,detail,subject) values(t,a.athlete,auth.uid(),'Kalender endret',
    concat_ws(' · ','Før: '||a.title,a.day,a.start_time,a.minutes||' min')||E'\n'||concat_ws(' · ','Etter: '||title_text,d,tm,dur||' min'),a.id);
  end if;
 end loop;
end $$;
create function public.beta_calendar_change(t uuid,action text,items jsonb,v jsonb default '{}') returns void
language sql security invoker set search_path='' as $$select nhf_private.calendar_change(t,action,items,v)$$;
revoke all on function nhf_private.calendar_change(uuid,text,jsonb,jsonb),public.beta_calendar_change(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function nhf_private.calendar_change(uuid,text,jsonb,jsonb),public.beta_calendar_change(uuid,text,jsonb,jsonb) to authenticated;

create function nhf_private.calendar_regular(t uuid,k uuid,effective date,prior jsonb,v jsonb,stop boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare r nhf_private.regular_activities%rowtype; expected jsonb; d integer[]; tm time; dur int; w int; title_text text; next_end date;
begin
 if auth.uid() is null or not coalesce(nhf_private.coaches(t),false) then raise exception 'Trenertilgang kreves.';end if;
 select * into r from nhf_private.regular_activities where id=k and team=t;
 if not found then raise exception 'Ukjent aktivitet.';end if;
 perform pg_advisory_xact_lock(hashtextextended(t::text||r.athlete::text,0));
 select * into strict r from nhf_private.regular_activities where id=k and team=t for update;
 expected:=jsonb_build_object('title',r.title,'days',r.days,'clock',to_char(r.clock,'HH24:MI'),'minutes',r.minutes,'weight',r.weight,'starts',r.starts,'ends',r.ends);
 if prior is distinct from expected then raise exception 'Den faste planen er endret. Åpne aktiviteten på nytt.';end if;
 if stop is null or effective is null or effective<(now() at time zone 'Europe/Oslo')::date or effective<r.starts or effective>r.ends then raise exception 'Velg en kommende dato i planen.';end if;
 if exists(select from nhf_private.regular_checkins where rule=k and day>=effective) then raise exception 'Registrerte dager er beskyttet. Velg en senere dato.';end if;
 if not stop then
  d:=array(select distinct n::int from jsonb_array_elements_text(v->'days') n order by 1);tm:=(v->>'clock')::time;dur:=(v->>'minutes')::int;w:=(v->>'weight')::int;
  title_text:=case when r.kind='gym' then 'Skolegym' else trim(v->>'title') end;next_end:=nullif(v->>'ends','')::date;
  if cardinality(d) not between 1 and 7 or not d<@array[1,2,3,4,5,6,7] or dur is null or dur not between 5 and 600 or dur%5<>0 or w is null or w not between 1 and 5
   or tm is null or tm>=time '24:00' or extract(epoch from tm)/60+dur>=1440 or title_text is null or length(title_text) not between 1 and 90 or next_end<effective then raise exception 'Kontroller dager, minutter, intensitet og periode.';end if;
  if exists(select from nhf_private.regular_activities a where a.id<>k and a.team=t and a.athlete=r.athlete and a.days && d
   and daterange(a.starts,a.ends,'[]') && daterange(effective,next_end,'[]')
   and ((r.kind='gym' and a.kind='gym' and (r.profile_gym or a.profile_gym)) or (tm<a.clock+make_interval(mins=>a.minutes) and a.clock<tm+make_interval(mins=>dur)))) then raise exception 'Aktiviteten overlapper en annen fast aktivitet.';end if;
 end if;
 if r.starts<effective then update nhf_private.regular_activities set ends=effective-1 where id=k;
 else delete from nhf_private.regular_activities where id=k;end if;
 if not stop then insert into nhf_private.regular_activities(team,athlete,title,kind,days,clock,minutes,weight,starts,ends,profile_gym)
  values(t,r.athlete,title_text,r.kind,d,tm,dur,w,effective,next_end,r.profile_gym);end if;
 insert into public.beta_player_log(team,athlete,actor,action,detail,subject) values(t,r.athlete,auth.uid(),case when stop then 'Fast aktivitet avsluttet' else 'Fast plan endret' end,
  r.title||' fra '||effective||E'\nFør: '||expected::text||case when stop then '' else E'\nEtter: '||v::text end,k);
end $$;
create function public.beta_calendar_regular(t uuid,k uuid,effective date,prior jsonb,v jsonb,stop boolean default false) returns void
language sql security invoker set search_path='' as $$select nhf_private.calendar_regular(t,k,effective,prior,v,stop)$$;
revoke all on function nhf_private.calendar_regular(uuid,uuid,date,jsonb,jsonb,boolean),public.beta_calendar_regular(uuid,uuid,date,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function nhf_private.calendar_regular(uuid,uuid,date,jsonb,jsonb,boolean),public.beta_calendar_regular(uuid,uuid,date,jsonb,jsonb,boolean) to authenticated;
