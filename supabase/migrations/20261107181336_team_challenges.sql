create table nhf_private.challenges(
 id uuid primary key default gen_random_uuid(),team uuid not null references public.beta_teams on delete cascade,
 title text not null check(length(trim(title)) between 1 and 100),unit text not null check(length(trim(unit)) between 1 and 24),
 starts date not null,ends date not null,anonymous boolean not null,creator uuid references auth.users on delete set null,
 check(ends between starts and starts+365)
);
create index challenges_team_dates on nhf_private.challenges(team,ends,starts);
create table nhf_private.challenge_players(
 challenge uuid references nhf_private.challenges on delete cascade,athlete uuid references auth.users on delete cascade,
 alias text not null default ('Spiller '||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 primary key(challenge,athlete),unique(challenge,alias)
);
create table nhf_private.challenge_entries(
 challenge uuid not null,athlete uuid not null,entry uuid not null,amount integer not null check(amount between 1 and 100000),
 logged_at timestamptz not null default now(),primary key(challenge,athlete,entry),
 foreign key(challenge,athlete) references nhf_private.challenge_players on delete cascade
);
revoke all on nhf_private.challenges,nhf_private.challenge_players,nhf_private.challenge_entries from public,anon,authenticated;
-- Only aggregate totals leave this schema. Athlete UUIDs never appear in anonymous rankings.
create view nhf_private.challenge_scores as
 select challenge,athlete,sum(amount) total,rank() over(partition by challenge order by sum(amount) desc) place
 from nhf_private.challenge_entries group by challenge,athlete;
revoke all on nhf_private.challenge_scores from public,anon,authenticated;
create table nhf_private.challenge_awards(
 challenge uuid references nhf_private.challenges on delete cascade, athlete uuid references auth.users on delete cascade,
 total bigint not null, winner boolean not null, earned_on date not null,primary key(challenge,athlete)
);
revoke all on nhf_private.challenge_awards from public,anon,authenticated;
create function nhf_private.challenge_action(action text,t uuid,c uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();day date:=(now() at time zone 'Europe/Oslo')::date;ch nhf_private.challenges;
 coach boolean:=nhf_private.coaches(t);player boolean; recorded integer; k uuid;
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
   insert into nhf_private.challenges(team,title,unit,starts,ends,anonymous,creator)
    values(t,trim(v->>'title'),trim(v->>'unit'),(v->>'starts')::date,(v->>'ends')::date,(v->>'anonymous')::boolean,actor) returning id into c;return to_jsonb(c);
 end if;
 select * into strict ch from nhf_private.challenges where id=c and team=t;
 if action='log' and player then
   k:=(v->>'entry')::uuid;
   select amount into recorded from nhf_private.challenge_entries where challenge=c and athlete=actor and entry=k;
   if found and recorded=(v->>'amount')::int then return 'true';end if;
   if day not between ch.starts and ch.ends then raise exception 'Utfordringen er ikke åpen';end if;
   insert into nhf_private.challenge_players(challenge,athlete) values(c,actor) on conflict(challenge,athlete) do nothing;
   insert into nhf_private.challenge_entries(challenge,athlete,entry,amount) values(c,actor,k,(v->>'amount')::int)
    on conflict(challenge,athlete,entry) do nothing;
   if not exists(select from nhf_private.challenge_entries where challenge=c and athlete=actor and entry=k and amount=(v->>'amount')::int) then raise exception 'Registreringen er allerede brukt';end if;
   return 'true';
 elsif action='board' then
   return coalesce((select jsonb_agg(jsonb_build_object('place',s.place,'total',s.total,'mine',s.athlete=actor,
    'label',case when s.athlete=actor then 'Du' when ch.anonymous then p.alias else coalesce(m.name,'Tidligere spiller') end)
    order by s.place,p.alias) from nhf_private.challenge_scores s join nhf_private.challenge_players p using(challenge,athlete)
    left join public.beta_members m on m.id=s.athlete and m.squad=t where s.challenge=c),'[]');
 end if;
 raise exception 'Handlingen er ikke tillatt';
end $$;
create function public.beta_challenge(action text,t uuid,c uuid default null,v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.challenge_action(action,t,c,v)$$;
revoke all on function public.beta_challenge(text,uuid,uuid,jsonb),nhf_private.challenge_action(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.beta_challenge(text,uuid,uuid,jsonb),nhf_private.challenge_action(text,uuid,uuid,jsonb) to authenticated;
