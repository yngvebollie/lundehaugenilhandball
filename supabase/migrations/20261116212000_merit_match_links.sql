-- Derive repeats from current, confirmed player lines; never accumulate them on reads.
create or replace view nhf_private.scoring_match_history with (security_invoker=true) as
 select g.team,l.athlete,coalesce(g.nif_id::text,g.id::text) fixture,min(g.day) as day,min(g.opponent) opponent,min(p.report_goals) goals,min(g.id::text) game_id
 from public.beta_matches g join nhf_private.match_participants p on p.match_id=g.id and p.team=g.team
 left join nhf_private.season_player_keys k on k.registration=g.registration and k.player_id=p.player_id
 join nhf_private.badge_links l on l.reg=g.registration
 left join nhf_private.season_player_keys lk on lk.registration=l.reg and lk.player_id=l.player
 join public.beta_members u on u.id=l.athlete and u.squad=g.team and u.role='athlete'
 where coalesce(k.season_player,p.player_id)=coalesce(lk.season_player,l.player)
 and g.completed and g.day<=(now() at time zone 'Europe/Oslo')::date and coalesce(p.local_played,p.report_played,p.nif_played,false)
 group by g.team,l.athlete,coalesce(g.nif_id::text,g.id::text)
 having count(distinct p.report_goals)=1 and min(p.report_goals)>0;
revoke all on nhf_private.scoring_match_history from public,anon,authenticated;
create or replace function nhf_private.repeat_scoring_badges(action text,t uuid,a uuid,v jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; awards jsonb; best int;
begin
 if action='targets' and v->>'key'='hat_trick_hero' then raise exception 'Dette kampmerket har faste målgrenser';end if;
 result:=nhf_private.badge_season_view(action,t,a,v); -- performs membership and role checks
 select coalesce(jsonb_agg(jsonb_build_object('key','hat_trick_hero','level',tier,'at',day,'fixture',fixture,'match',game_id,'opponent',opponent,'goals',goals) order by day desc,fixture,tier),'[]'),coalesce(max(goals),0)
 into awards,best from nhf_private.scoring_match_history h cross join (values (1,1),(2,5),(3,10)) levels(tier,threshold)
 where h.team=t and h.athlete=a and h.goals>=threshold;
 return result||jsonb_build_object('counts',(result->'counts')||jsonb_build_object('hat_trick_hero',best),
 'targets',coalesce(result->'targets','{}')-'hat_trick_hero','earned',
 coalesce((select jsonb_agg(e) from jsonb_array_elements(result->'earned') e where e->>'key'<>'hat_trick_hero'),'[]')||awards);
end $$;
