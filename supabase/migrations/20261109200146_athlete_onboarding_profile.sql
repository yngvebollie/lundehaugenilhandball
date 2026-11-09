alter table nhf_private.regular_activities add column profile_gym boolean not null default false;
-- The planner and the wizard write to the same schedule. An untimed gym class
-- must not be registered again as a timed class on the same weekday.
create function nhf_private.guard_profile_gym() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='gym' and exists(select from nhf_private.regular_activities a
  where a.team=new.team and a.athlete=new.athlete and a.kind='gym' and (a.profile_gym or new.profile_gym)
    and a.days && new.days and daterange(a.starts,a.ends,'[]') && daterange(new.starts,new.ends,'[]')) then
  raise exception 'Skolegym er allerede planlagt på en av disse dagene';
 end if;
 return new;
end $$;
revoke all on function nhf_private.guard_profile_gym() from public,anon,authenticated;
create trigger guard_profile_gym before insert on nhf_private.regular_activities for each row execute function nhf_private.guard_profile_gym();
create table nhf_private.athlete_preferences(
 team uuid not null references public.beta_teams on delete cascade, athlete uuid not null references auth.users on delete cascade,
 skills text[] not null, physical text[] not null, positions text[] not null,
 gym_rule uuid references nhf_private.regular_activities on delete set null, primary key(team,athlete),
 check(skills <@ array['passing','teamwork','shooting','attack','defence','keeper','counter','duel','feint','decisions']),
 check(physical <@ array['strength','speed','footwork','jump','shotpower']),
 check(positions <@ array['lw','lb','cb','rb','rw','pivot','gk'])
);
alter table nhf_private.athlete_preferences enable row level security;
revoke all on nhf_private.athlete_preferences from public,anon,authenticated;
create function nhf_private.athlete_wizard(t uuid,cmd text,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); d date:=(now() at time zone 'Europe/Oslo')::date; begins date:=d;
 prefs nhf_private.athlete_preferences; old nhf_private.regular_activities; rid uuid;
 gym_days int[]; mins int; skills text[]; physical text[]; pos text[]; first_name text; last_name text; shirt text;
begin
 if cmd='board' then
  if me is null or not coalesce(nhf_private.coaches(t),false) then raise exception 'Trenertilgang kreves';end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'shirt',m.shirt_number,'positions',coalesce(p.positions,'{}')) order by m.name,m.id)
   from public.beta_members m left join nhf_private.athlete_preferences p on p.athlete=m.id and p.team=m.squad where m.squad=t and m.role='athlete'),'[]');
 end if;
 if me is null or not exists(select from public.beta_members where id=me and squad=t and role='athlete') then raise exception 'Bare egen utøverprofil';end if;
 if cmd='save' then
  perform pg_advisory_xact_lock(hashtextextended(t::text||me::text,0));
  first_name:=trim(v->>'given');last_name:=trim(v->>'family');shirt:=nullif(v->>'shirt','');
  if coalesce(first_name,'')='' or coalesce(last_name,'')='' or length(first_name||' '||last_name)>100 or shirt !~ '^[1-9][0-9]{0,2}$' then raise exception 'Kontroller navn og draktnummer';end if;
  gym_days:=array(select distinct x::int from jsonb_array_elements_text(v->'days') x order by 1);
  mins:=(v->>'minutes')::int;
  if not gym_days <@ array[1,2,3,4,5] or mins is null or mins not between 1 and 600 then raise exception 'Kontroller gymdager og varighet';end if;
  skills:=array(select distinct x from jsonb_array_elements_text(v->'skills') x);
  physical:=array(select distinct x from jsonb_array_elements_text(v->'physical') x);
  pos:=array(select distinct x from jsonb_array_elements_text(v->'positions') x);
  select a.* into old from nhf_private.athlete_preferences p join nhf_private.regular_activities a on a.id=p.gym_rule where p.team=t and p.athlete=me and (a.ends is null or a.ends>=d);
  if old.id is not null and old.ends is null and old.days=gym_days and old.minutes=mins then rid:=old.id;
  else
   if exists(select from nhf_private.regular_checkins c join nhf_private.regular_activities a on a.id=c.rule where a.team=t and a.athlete=me and a.profile_gym and c.day=d) then begins:=d+1;end if;
   if old.id is not null then
    if old.starts>=begins then delete from nhf_private.regular_activities where id=old.id;
    else update nhf_private.regular_activities set ends=begins-1 where id=old.id;end if;
   end if;
   if cardinality(gym_days)>0 then
    if exists(select from nhf_private.regular_activities where team=t and athlete=me and kind='gym' and days && gym_days and (ends is null or ends>=begins)) then raise exception 'Det finnes allerede skolegym på en valgt dag. Behold den i Plan og fjern dagen her, eller avslutt den gamle planen først.';end if;
    insert into nhf_private.regular_activities(team,athlete,title,kind,days,clock,minutes,weight,starts,profile_gym) values(t,me,'Skolegym','gym',gym_days,'00:00',mins,3,begins,true) returning id into rid;
   end if;
  end if;
  insert into nhf_private.athlete_preferences as p values(t,me,skills,physical,pos,rid) on conflict(team,athlete) do update set skills=excluded.skills,physical=excluded.physical,positions=excluded.positions,gym_rule=excluded.gym_rule;
  update public.beta_members set given_name=first_name,family_name=last_name,name=first_name||' '||last_name,shirt_number=shirt where id=me and squad=t and role='athlete';
 elsif cmd is distinct from 'read' then raise exception 'Ukjent handling';end if;
 select * into prefs from nhf_private.athlete_preferences where team=t and athlete=me;
 select * into old from nhf_private.regular_activities where id=prefs.gym_rule and (ends is null or ends>=d);
 return (select jsonb_build_object('completed',prefs.athlete is not null,'name',m.name,'given',m.given_name,'family',m.family_name,'shirt',coalesce(m.shirt_number,''),'email',u.email,'skills',coalesce(prefs.skills,'{}'),'physical',coalesce(prefs.physical,'{}'),'positions',coalesce(prefs.positions,'{}'),'days',coalesce(old.days,'{}'),'minutes',coalesce(old.minutes,45)) from public.beta_members m join auth.users u on u.id=m.id where m.id=me);
end $$;
create function public.beta_athlete_wizard(t uuid,cmd text,v jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.athlete_wizard(t,cmd,v)$$;
revoke all on function public.beta_athlete_wizard(uuid,text,jsonb),nhf_private.athlete_wizard(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.beta_athlete_wizard(uuid,text,jsonb),nhf_private.athlete_wizard(uuid,text,jsonb) to authenticated;
