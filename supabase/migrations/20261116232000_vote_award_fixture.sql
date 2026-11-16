create or replace function nhf_private.ballot_badges(action text,t uuid,a uuid,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; cats text[]:=array['vote_teammate','vote_best','defensive_guardian']; k text;n int; legacy int; earned jsonb; milestone record; moment timestamptz; award_mid text;
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
    select b.at_time,(select min(p.mid::text) from nhf_private.ballot_participants p where p.team=b.team and p.fixture=b.fixture and p.athlete=a) into moment,award_mid from nhf_private.match_ballots b where b.team=t and b.recipient=a and b.category=k
    and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=a)
    and exists(select from nhf_private.ballot_participants p where p.team=t and p.fixture=b.fixture and p.athlete=b.giver)
    order by b.at_time,b.fixture,b.giver offset greatest(0,milestone.target-legacy-1) limit 1;
    if moment is not null then earned:=earned||jsonb_build_array(jsonb_build_object('key',k,'level',milestone.i,'at',moment,'match',award_mid));end if;
   end if;
  end loop;
 end loop;
 return jsonb_set(result,'{earned}',earned);
end $$;

create or replace function nhf_private.my_awarded_match(wanted uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with mine as (select distinct p.team,p.fixture from nhf_private.ballot_participants p where p.mid=wanted and p.athlete=auth.uid())
 select jsonb_build_object('id',m.id,'fixture',p.fixture,'reg',r.id,'team_name',r.display_name,'day',m.day,'time',m.start_time,'opponent',m.opponent,'title',concat_ws(' – ',m.home,m.away),'venue',m.venue,'score',m.score,'completed',true,'played',true,'goals',h.goals,'warnings',null,'saves',null)
 from mine p join public.beta_matches m on m.team=p.team and m.id=wanted join public.beta_team_seasons r on r.id=m.registration
 left join nhf_private.scoring_match_history h on h.game_id=m.id::text and h.team=p.team and h.athlete=auth.uid()
 union all select jsonb_build_object('id',g.id,'fixture',p.fixture,'reg',r.id,'team_name',r.display_name,'day',g.day,'time',null,'opponent',g.opponent,'title',c.name||' · mot '||g.opponent,'venue',null,'score',g.scored||'-'||g.conceded||' (egne mål først)','completed',true,'played',true,'goals',null,'warnings',null,'saves',null)
 from mine p join public.beta_cup_games g on g.team=p.team and g.id=wanted join public.beta_cups c on c.id=g.cup and c.team=p.team join public.beta_team_seasons r on r.id=c.registration limit 1
$$;
