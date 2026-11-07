alter table nhf_private.challenges add exercises text[] not null default '{}',add instructions text not null default '' check(length(instructions)<=1500),
 add badge_key text check(badge_key in ('precision_builder','one_more_rep','footwork_wizard','mission_complete','game_iq','body_guardian'));
alter table nhf_private.challenge_entries add exercise text;
create or replace function nhf_private.challenge_action(action text,t uuid,c uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();day date:=(now() at time zone 'Europe/Oslo')::date;ch nhf_private.challenges;
 coach boolean:=nhf_private.coaches(t);player boolean; recorded integer; oldexercise text; exer text; items text[]; k uuid;
begin
 if actor is null then raise exception 'Logg inn';end if;
 select exists(select from public.beta_members where id=actor and squad=t and role='athlete') into player;
 if not (coach or player) then raise exception 'Ingen lagtilgang';end if;
 if action='awards' then
   -- Ended challenges cannot receive new entries; ties earn the same winner achievement.
   insert into nhf_private.challenge_awards
     select s.challenge,s.athlete,s.total,s.place=1,z.ends from nhf_private.challenge_scores s join nhf_private.challenges z on z.id=s.challenge
     where z.ends<day and exists(select from nhf_private.challenge_players p where p.challenge=z.id and p.athlete=actor)
     on conflict(challenge,athlete) do nothing;
   return coalesce((select jsonb_agg(jsonb_build_object('id',z.id,'title',z.title,'ends',a.earned_on,'total',a.total,'unit',z.unit,'winner',a.winner) order by a.earned_on desc,z.id)
     from nhf_private.challenge_awards a join nhf_private.challenges z on z.id=a.challenge where a.athlete=actor),'[]');
 elsif action='list' then
   return coalesce((select jsonb_agg(to_jsonb(z)-'creator' order by z.starts desc,z.title,z.id) from nhf_private.challenges z where z.team=t),'[]');
 elsif action='create' and coach then
   if (v->>'starts')::date<day then raise exception 'Velg dagens dato eller senere';end if;
   if jsonb_typeof(coalesce(v->'exercises','[]'))<>'array' or jsonb_array_length(coalesce(v->'exercises','[]'))>12 then raise exception 'Velg maks 12 øvelser';end if;
   items:=array(select trim(x) from jsonb_array_elements_text(coalesce(v->'exercises','[]')) with ordinality e(x,i) order by i);
   if exists(select from unnest(items) x where length(coalesce(x,'')) not between 1 and 100) or (select count(distinct lower(x)) from unnest(items) x)<>cardinality(items) then raise exception 'Kontroller øvelsene';end if;
   insert into nhf_private.challenges(team,title,unit,starts,ends,anonymous,creator,exercises,instructions,badge_key)
    values(t,trim(v->>'title'),trim(v->>'unit'),(v->>'starts')::date,(v->>'ends')::date,(v->>'anonymous')::boolean,actor,items,trim(coalesce(v->>'instructions','')),nullif(v->>'badge_key','')) returning id into c;return to_jsonb(c);
 end if;
 select * into strict ch from nhf_private.challenges where id=c and team=t;
 if action='log' and player then
   k:=(v->>'entry')::uuid;
   exer:=nullif(trim(v->>'exercise'),'');
   if cardinality(ch.exercises)=1 and exer is null then exer:=ch.exercises[1];end if;
   if cardinality(ch.exercises)>0 and (exer is null or not(exer=any(ch.exercises))) or cardinality(ch.exercises)=0 and exer is not null then raise exception 'Velg en øvelse fra utfordringen';end if;
   select amount,exercise into recorded,oldexercise from nhf_private.challenge_entries where challenge=c and athlete=actor and entry=k;
   if found and recorded=(v->>'amount')::int and oldexercise is not distinct from exer then return 'true';end if;
   if day not between ch.starts and ch.ends then raise exception 'Utfordringen er ikke åpen';end if;
   insert into nhf_private.challenge_players(challenge,athlete) values(c,actor) on conflict(challenge,athlete) do nothing;
   insert into nhf_private.challenge_entries(challenge,athlete,entry,amount,exercise) values(c,actor,k,(v->>'amount')::int,exer)
    on conflict(challenge,athlete,entry) do nothing;
   if not exists(select from nhf_private.challenge_entries where challenge=c and athlete=actor and entry=k and amount=(v->>'amount')::int and exercise is not distinct from exer) then raise exception 'Registreringen er allerede brukt';end if;
   return 'true';
 elsif action='mine' and player then
   return coalesce((select jsonb_agg(to_jsonb(q) order by logged_at desc) from (select entry,exercise,amount,logged_at from nhf_private.challenge_entries where challenge=c and athlete=actor order by logged_at desc,entry limit 50) q),'[]');
 elsif action='board' then
   return coalesce((select jsonb_agg(jsonb_build_object('place',s.place,'total',s.total,'mine',s.athlete=actor,
    'label',case when s.athlete=actor then 'Du' when ch.anonymous then p.alias else coalesce(m.name,'Tidligere spiller') end)
    order by s.place,p.alias) from nhf_private.challenge_scores s join nhf_private.challenge_players p using(challenge,athlete)
    left join public.beta_members m on m.id=s.athlete and m.squad=t where s.challenge=c),'[]');
 end if;
 raise exception 'Handlingen er ikke tillatt';
end $$;
create or replace function nhf_private.challenge_merits(person uuid) returns table(key text,n bigint) language sql stable set search_path='' as $$
 select c.badge_key,count(distinct c.id) from nhf_private.challenges c join nhf_private.challenge_entries e on e.challenge=c.id
 where e.athlete=person and c.badge_key is not null and c.ends<(now() at time zone 'Europe/Oslo')::date group by c.badge_key
$$;
revoke all on function nhf_private.challenge_merits(uuid) from public,anon,authenticated;
