create table nhf_private.regular_checkins (
 rule uuid not null references nhf_private.regular_activities(id) on delete cascade,
 day date not null, done boolean not null, minutes integer not null, weight integer not null,
 primary key(rule,day),
 check ((done and minutes between 1 and 600 and weight between 1 and 5)
     or (not done and minutes=0 and weight=0))
);
alter table nhf_private.regular_checkins enable row level security;
revoke all on nhf_private.regular_checkins from public,anon,authenticated;

alter function nhf_private.regular(uuid,text,jsonb) rename to regular_rules;
revoke all on function nhf_private.regular_rules(uuid,text,jsonb) from public,anon,authenticated;
create function nhf_private.regular(t uuid,action text,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); oslo date:=(now() at time zone 'Europe/Oslo')::date;
 r nhf_private.regular_activities; d date; state text; rows jsonb;
begin
 if action in ('check','stop') then
  if me is null or not exists(select from public.beta_members where id=me and squad=t and role='athlete') then raise exception 'Kun egne aktiviteter'; end if;
  perform pg_advisory_xact_lock(hashtextextended(t::text||me::text,0));
  select * into strict r from nhf_private.regular_activities where id=(v->>'id')::uuid and team=t and athlete=me for update;
  if action='check' then
   d:=(v->>'day')::date; state:=v->>'state';
   if d is null or d>oslo or d<r.starts or d>r.ends or not (extract(isodow from d)::int=any(r.days)) then raise exception 'Datoen er ikke en gjennomført eller planlagt aktivitetsdag til og med i dag'; end if;
   if state='clear' then delete from nhf_private.regular_checkins where rule=r.id and day=d;
   elsif state in ('done','skipped') then
    insert into nhf_private.regular_checkins(rule,day,done,minutes,weight) values(r.id,d,state='done',
     case when state='done' then coalesce((v->>'minutes')::int,r.minutes) else 0 end,
     case when state='done' then coalesce((v->>'weight')::int,r.weight) else 0 end)
    on conflict(rule,day) do update set done=excluded.done,minutes=excluded.minutes,weight=excluded.weight;
   else raise exception 'Ukjent registrering'; end if;
   action:='read';
  elsif exists(select from nhf_private.regular_checkins where rule=r.id and day=oslo) then
   -- A recorded day stays in the plan when the athlete stops the series today.
   update nhf_private.regular_activities set ends=oslo where id=r.id;
   action:='read';
  end if;
 end if;
 rows:=nhf_private.regular_rules(t,action,v);
 return coalesce((select jsonb_agg(a || jsonb_build_object('checks',coalesce(
  (select jsonb_object_agg(c.day::text,jsonb_build_object('done',c.done,'minutes',c.minutes,'weight',c.weight)) from nhf_private.regular_checkins c where c.rule=(a->>'id')::uuid),'{}'::jsonb)) order by n)
  from jsonb_array_elements(rows) with ordinality x(a,n)),'[]'::jsonb);
end $$;
create or replace function public.beta_regular(t uuid,action text default 'read',v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.regular(t,action,v)$$;
revoke all on function nhf_private.regular(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function nhf_private.regular(uuid,text,jsonb) to authenticated;
