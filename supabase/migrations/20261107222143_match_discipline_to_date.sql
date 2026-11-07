create or replace function nhf_private.player_form(t uuid,m uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict g from public.beta_matches where team=t and id=m;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,'player_form');
 return (with keys as materialized (select * from nhf_private.season_player_keys where registration=g.registration),
 fixtures as materialized (select h.id,case when h.opponent=h.away and h.home<>h.away then 'A' when h.opponent=h.home and h.home<>h.away then 'B' end side
 from public.beta_matches h where h.team=t and h.registration is not distinct from g.registration and h.completed
 and (h.day<g.day or h.id=m or (h.day=g.day and h.start_time<g.start_time)) and h.day<=(now() at time zone 'Europe/Oslo')::date),
 played as (select coalesce(k.season_player,a.player_id) pid,h.id,coalesce(a.report_goals,s.shots_hit) goals
 from fixtures h join nhf_private.match_participants a on a.match_id=h.id left join nhf_private.player_match_statistics s using(match_id,player_id)
 left join keys k on k.player_id=a.player_id where coalesce(a.local_played,a.report_played,a.nif_played,false)),
 totals as (select pid,count(*) games,count(goals) scored_games,sum(goals) goals,count(goals) filter(where id<>m) prior_games,
 sum(goals) filter(where id<>m) prior_goals from played group by pid),
 cards as (select coalesce(k.season_player,i.player_id) pid,h.id,(x->>'suspensions')::int susp,
 case x->>'warning' when 'true' then 1 when 'false' then 0 else (x->>'warning')::int end warn
 from fixtures h join nhf_private.match_reports r on r.match_id=h.id cross join lateral jsonb_array_elements(r.reviewed->'players') x
 join nhf_private.report_identities i on i.registration=g.registration and i.norm=lower(regexp_replace(trim(x->>'name'),'[[:space:]]+',' ','g')) and i.shirt=x->>'shirt'
 left join keys k on k.player_id=i.player_id where x->>'side'=h.side),
 discipline as (select pid,sum(susp) season_suspensions,sum(warn) season_warnings,sum(susp) filter(where id=m) game_suspensions from cards group by pid)
 select coalesce(jsonb_object_agg(cur.player_id,jsonb_build_object('games',coalesce(z.games,0),'scored_games',coalesce(z.scored_games,0),'goals',z.goals,
 'prior_games',coalesce(z.prior_games,0),'prior_goals',z.prior_goals,'game_suspensions',d.game_suspensions,'season_suspensions',d.season_suspensions,'season_warnings',d.season_warnings)),'{}')
 from nhf_private.match_participants cur left join keys k on k.player_id=cur.player_id left join totals z on z.pid=coalesce(k.season_player,cur.player_id)
 left join discipline d on d.pid=coalesce(k.season_player,cur.player_id) where cur.match_id=m);
end $$;
