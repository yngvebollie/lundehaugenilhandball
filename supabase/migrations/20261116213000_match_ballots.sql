create table nhf_private.match_ballots(team uuid not null references public.beta_teams on delete cascade,fixture text not null,giver uuid not null references public.beta_members on delete cascade,category text not null check(category in ('vote_teammate','vote_best','defensive_guardian')),recipient uuid not null references public.beta_members on delete cascade,at_time timestamptz not null default now(),check(giver<>recipient),primary key(team,fixture,giver,category));
create index match_ballots_recipient on nhf_private.match_ballots(team,recipient);
revoke all on nhf_private.match_ballots from public,anon,authenticated;
create view nhf_private.ballot_participants with (security_invoker=true) as
select distinct g.team,g.id mid,coalesce('nif:'||g.nif_id::text,g.id::text) fixture,l.athlete
from public.beta_matches g join nhf_private.match_participants p on p.match_id=g.id and p.team=g.team
left join nhf_private.season_player_keys k on k.registration=g.registration and k.player_id=p.player_id
join nhf_private.badge_links l on l.reg=g.registration
left join nhf_private.season_player_keys lk on lk.registration=l.reg and lk.player_id=l.player
join public.beta_members u on u.id=l.athlete and u.squad=g.team and u.role='athlete'
where coalesce(k.season_player,p.player_id)=coalesce(lk.season_player,l.player) and g.completed and g.day<=(now() at time zone 'Europe/Oslo')::date and coalesce(p.local_played,p.report_played,p.nif_played,false)
union all select distinct g.team,g.id,'cup:'||g.id::text,u.id from public.beta_cup_games g join public.beta_members u on u.squad=g.team and u.role='athlete' and u.id=any(g.played)
where g.scored is not null and g.day<=(now() at time zone 'Europe/Oslo')::date;
revoke all on nhf_private.ballot_participants from public,anon,authenticated;
create function nhf_private.match_ballot(mid uuid,cat text,person uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); t uuid; f text;
begin
 select p.team,p.fixture into strict t,f from nhf_private.ballot_participants p where p.mid=match_ballot.mid and p.athlete=uid;
 if exists(select from nhf_private.badge_privacy where athlete=uid and not receive) then raise exception 'Aktiver anerkjennelser under Mine merker for å stemme.';end if;
 if cat is not null then
  if cat not in ('vote_teammate','vote_best','defensive_guardian') then raise exception 'Ukjent kategori';end if;
  if person is null then delete from nhf_private.match_ballots where team=t and fixture=f and giver=uid and category=cat;
  else
   if person=uid or not exists(select from nhf_private.ballot_participants p where p.mid=match_ballot.mid and p.team=t and p.athlete=person) or exists(select from nhf_private.badge_privacy where athlete=person and not receive) then raise exception 'Velg en annen deltaker';end if;
   insert into nhf_private.match_ballots values(t,f,uid,cat,person,now()) on conflict(team,fixture,giver,category) do update set recipient=excluded.recipient,at_time=excluded.at_time where match_ballots.recipient<>excluded.recipient;
  end if;
 end if;
 return jsonb_build_object('players',coalesce((select jsonb_agg(jsonb_build_object('id',p.athlete,'name',u.name) order by u.name) from nhf_private.ballot_participants p join public.beta_members u on u.id=p.athlete where p.mid=match_ballot.mid and p.team=t and p.athlete<>uid and not exists(select from nhf_private.badge_privacy where athlete=p.athlete and not receive)),'[]'),
 'votes',coalesce((select jsonb_object_agg(category,recipient) from nhf_private.match_ballots where team=t and fixture=f and giver=uid),'{}'));
end $$;
create function public.beta_match_ballot(mid uuid,cat text default null,person uuid default null) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.match_ballot(mid,cat,person)$$;
revoke all on function nhf_private.match_ballot(uuid,text,uuid),public.beta_match_ballot(uuid,text,uuid) from public,anon;
grant execute on function nhf_private.match_ballot(uuid,text,uuid),public.beta_match_ballot(uuid,text,uuid) to authenticated;
create function nhf_private.ballot_badges(action text,t uuid,a uuid,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; cats text[]:=array['vote_teammate','vote_best','defensive_guardian']; k text;n int; legacy int; earned jsonb; milestone record; moment timestamptz;
begin
 if action='targets' and v->>'key'=any(cats) then raise exception 'Stemmemerkene har faste nivåer';end if;
 result:=nhf_private.repeat_scoring_badges(action,t,a,v); -- checks coach or self access
 earned:=result->'earned';
 foreach k in array cats loop
  legacy:=coalesce((result->'counts'->>k)::int,0);
  select count(*) into n from nhf_private.match_ballots b where b.team=t and b.recipient=a and b.category=k
  and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=a)
  and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=b.giver);
  result:=jsonb_set(result,array['counts',k],to_jsonb(n+legacy));result:=jsonb_set(result,'{targets}',coalesce(result->'targets','{}')-k);
  for milestone in select * from (values (1,3),(2,10),(3,25)) levels(i,target) where target<=n+legacy loop
   if not exists(select from jsonb_array_elements(earned) e where e->>'key'=k and (e->>'level')::int=milestone.i) then
    select b.at_time into moment from nhf_private.match_ballots b where b.team=t and b.recipient=a and b.category=k
    and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=a)
    and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=b.giver)
    order by b.at_time,b.fixture,b.giver offset greatest(0,milestone.target-legacy-1) limit 1;
    if moment is not null then earned:=earned||jsonb_build_array(jsonb_build_object('key',k,'level',milestone.i,'at',moment));end if;
   end if;
  end loop;
 end loop;
 return jsonb_set(result,'{earned}',earned);
end $$;
create or replace function public.beta_badges(action text,t uuid,a uuid,v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.ballot_badges(action,t,a,v)$$;
revoke all on function nhf_private.ballot_badges(text,uuid,uuid,jsonb) from public,anon;
grant execute on function nhf_private.ballot_badges(text,uuid,uuid,jsonb) to authenticated;
