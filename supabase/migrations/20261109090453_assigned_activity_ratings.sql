alter table nhf_private.court_exercise_ratings
 add column origin text not null default 'catalog',
 add column activity_id uuid,
 add column item_key text,
 add column exercise_label text;

create function nhf_private.assigned_rating(t uuid,kind text,activity uuid,item text,caption text,score integer)
returns integer language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); actual text; slot integer; rating_key text;
begin
 if me is null or not exists(select from public.beta_members where id=me and squad=t and role='athlete')
 then raise exception 'Utøvertilgang kreves'; end if;
 if kind in ('assignment','challenge') and item ~ '^[0-9]{1,5}$' then slot:=item::integer+1; end if;
 if kind='assignment' then
   select case when item='activity' and cardinality(p.exercises)=0 then p.title
     when p.kind<>'Session' and p.exercises[slot]='Attended '||lower(p.kind) then p.title
     else p.exercises[slot] end into actual
   from public.beta_assignments p where p.id=activity and p.squad=t and p.athlete=me;
 elsif kind='challenge' then
   select case when item='activity' and cardinality(c.exercises)=0 then c.title else c.exercises[slot] end
   into actual from nhf_private.challenges c where c.id=activity and c.team=t;
 elsif kind='manual' then
   select x->>'manual' into actual from nhf_private.court_sessions s
   cross join lateral jsonb_array_elements(s.shared->'items') x
   where s.team=t and s.id=activity and not s.archived and (s.audience is null or me=any(s.audience))
    and x->>'id'=item and coalesce(x->>'ex','')='';
 end if;
 if actual is null or actual='' or actual is distinct from caption then raise exception 'Aktiviteten er ikke tilgjengelig eller er endret';end if;
 rating_key:=kind||':'||activity::text||':'||item||':'||md5(actual);
 if score is not null then
   if score not between 1 and 5 then raise exception 'Velg 1 til 5 stjerner';end if;
   insert into nhf_private.court_exercise_ratings(team,athlete,exercise,stars,origin,activity_id,item_key,exercise_label)
   values(t,me,rating_key,score,kind,activity,item,actual)
   on conflict(team,athlete,exercise) do update set stars=excluded.stars,updated_at=now();
 end if;
 return (select stars from nhf_private.court_exercise_ratings where team=t and athlete=me and exercise=rating_key);
end $$;
create function public.beta_assigned_rating(t uuid,kind text,activity uuid,item text,caption text,score integer default null)
returns integer language sql security invoker set search_path='' as $$select nhf_private.assigned_rating(t,kind,activity,item,caption,score)$$;
revoke all on function nhf_private.assigned_rating(uuid,text,uuid,text,text,integer),public.beta_assigned_rating(uuid,text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function nhf_private.assigned_rating(uuid,text,uuid,text,text,integer),public.beta_assigned_rating(uuid,text,uuid,text,text,integer) to authenticated;

-- Preserve existing per-line workout feedback. Overall stars are never copied.
insert into nhf_private.court_exercise_ratings(team,athlete,exercise,stars,origin,activity_id,item_key,exercise_label,updated_at)
select p.squad,p.athlete,'assignment:'||p.id::text||':'||(r.n-1)::text||':'||md5(p.exercises[r.n::int]),
 r.star,'assignment',p.id,(r.n-1)::text,p.exercises[r.n::int],coalesce(w.reviewed_at,now())
from public.beta_workout_reviews w join public.beta_assignments p on p.id=w.assignment
cross join lateral unnest(w.exercise_stars) with ordinality as r(star,n)
where r.star between 1 and 5 and p.exercises[r.n::int] is not null
on conflict do nothing;
