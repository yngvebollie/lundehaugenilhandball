-- A shirt identifies a row in a report, not a player across matches.
-- Keep raw identities and reviews intact. Do not group namesakes who appear
-- together, explicit player identities, or players from other registrations.
create view nhf_private.season_player_keys with (security_invoker=true) as
with evidence as (
 select distinct i.registration,i.player_id,i.norm from nhf_private.report_identities i
), ambiguous as (
 select registration,norm from evidence group by registration,norm
 having count(*) filter(where exists(select from nhf_private.match_players p where p.id=player_id and p.nif_person_id is not null)
 or exists(select from public.beta_members m where m.id=player_id))>0
 union
 select e.registration,e.norm from evidence e join nhf_private.match_participants p using(player_id)
 join public.beta_matches m on m.id=p.match_id and m.registration=e.registration
 group by e.registration,e.norm,m.id having count(distinct p.player_id)>1
 union
 select e.registration,e.norm from evidence e where exists(select from evidence x where x.registration=e.registration and x.player_id=e.player_id and x.norm<>e.norm)
)
select distinct e.registration,e.player_id,case when a.norm is not null then e.player_id else
 (min(e.player_id::text) over(partition by e.registration,e.norm))::uuid end as season_player
from evidence e left join ambiguous a using(registration,norm);
revoke all on nhf_private.season_player_keys from public,anon,authenticated;

create or replace function nhf_private.player_form(t uuid,m uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict g from public.beta_matches where team=t and id=m;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,'player_form');
 return (with keys as materialized (select * from nhf_private.season_player_keys where registration=g.registration),
 played as (
 select coalesce(k.season_player,a.player_id) pid,h.id,coalesce(a.report_goals,s.shots_hit) goals
 from nhf_private.match_participants a join public.beta_matches h on h.id=a.match_id
 left join nhf_private.player_match_statistics s using(match_id,player_id) left join keys k on k.player_id=a.player_id
 where h.team=t and h.registration is not distinct from g.registration
 and (h.day<g.day or h.id=m or (h.day=g.day and h.start_time<g.start_time))
 and h.day<=(now() at time zone 'Europe/Oslo')::date and h.completed and coalesce(a.local_played,a.report_played,a.nif_played,false)
 ), totals as (select pid,count(*) games,count(goals) scored_games,sum(goals) goals,count(goals) filter(where id<>m) prior_games,
 sum(goals) filter(where id<>m) prior_goals from played group by pid)
 select coalesce(jsonb_object_agg(cur.player_id,to_jsonb(z)-'pid'),'{}') from nhf_private.match_participants cur
 left join keys k on k.player_id=cur.player_id join totals z on z.pid=coalesce(k.season_player,cur.player_id) where cur.match_id=m);
end $$;
create or replace view nhf_private.match_season_totals as
 select a.team,m.registration,m.competition,coalesce(k.season_player,a.player_id) as player_id,count(*) matches_played,coalesce(sum(coalesce(a.report_goals,s.shots_hit)),0) goals,coalesce(sum(s.shots_missed),0) missed,
 coalesce(sum(coalesce(a.report_goals,s.shots_hit,0)+coalesce(s.shots_missed,0)),0) attempts,
 100.0*sum(coalesce(a.report_goals,s.shots_hit,0))/nullif(sum(coalesce(a.report_goals,s.shots_hit,0)+coalesce(s.shots_missed,0)),0) shooting_percent,
 coalesce(sum(s.technical_errors),0) technical_errors,coalesce(sum(s.goalkeeper_saves),0) saves,avg(s.rating) rating,count(*) filter(where s.is_best_player) awards
 from nhf_private.match_participants a join public.beta_matches m on m.id=a.match_id left join nhf_private.player_match_statistics s using(match_id,player_id)
 left join nhf_private.season_player_keys k on k.registration=m.registration and k.player_id=a.player_id
 where coalesce(a.local_played,a.report_played,a.nif_played,false) and m.completed and m.day<=(now() at time zone 'Europe/Oslo')::date
 group by a.team,m.registration,m.competition,coalesce(k.season_player,a.player_id);
create function nhf_private.squad_stat_lines(reg uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare team_id uuid;
begin
 select team into strict team_id from public.beta_team_seasons where id=reg;
 if auth.uid() is null or not nhf_private.coaches(team_id) then raise exception 'Trenertilgang kreves';end if;
 return (with games as materialized (
 select g.*,case when g.opponent=g.away then 'A' when g.opponent=g.home then 'B' end side
 from public.beta_matches g where g.team=team_id and g.registration=reg and g.completed and g.day<=(now() at time zone 'Europe/Oslo')::date
 ), source as (
 select g.id match_id,i.player_id,x.value r from games g join nhf_private.match_reports doc on doc.match_id=g.id
 cross join lateral jsonb_array_elements(doc.reviewed->'players') x
 join nhf_private.report_identities i on i.registration=reg and i.norm=lower(regexp_replace(trim(x.value->>'name'),'[[:space:]]+',' ','g')) and i.shirt=x.value->>'shirt'
 where x.value->>'side'=g.side
 ), keys as materialized (select * from nhf_private.season_player_keys where registration=reg)
 select coalesce(jsonb_agg(to_jsonb(z) order by z.day,z.match_id,z.name),'[]') from (
 select g.id match_id,g.day,g.side='A' home,coalesce(k.season_player,a.player_id) player,p.name,coalesce(r->>'shirt',a.shirt_number) shirt,
 coalesce(a.local_played,a.report_played,a.nif_played,false) played,coalesce(a.report_goals,s.shots_hit) goals,
 (r->>'goals')::int field_goals,(r->>'penalty')::int penalty,a.report_warnings warnings,(r->>'suspensions')::int suspensions,
 ((r->>'disqualification')::boolean)::int disqualifications,s.shots_missed missed,s.technical_errors errors,s.goalkeeper_saves saves,s.rating,
 s.is_best_player::int awards
 from games g join nhf_private.match_participants a on a.match_id=g.id join nhf_private.match_players p on p.id=a.player_id
 left join source on source.match_id=g.id and source.player_id=a.player_id left join keys k on k.player_id=a.player_id
 left join nhf_private.player_match_statistics s on s.match_id=g.id and s.player_id=a.player_id
 where a.report_listed or coalesce(a.local_played,a.nif_played,false) or s.player_id is not null
 ) z);
end $$;
create function public.beta_squad_stat_lines(reg uuid) returns jsonb language sql security invoker set search_path='' as
$$select nhf_private.squad_stat_lines(reg)$$;
revoke all on function nhf_private.squad_stat_lines(uuid), public.beta_squad_stat_lines(uuid) from public,anon;
grant execute on function nhf_private.squad_stat_lines(uuid), public.beta_squad_stat_lines(uuid) to authenticated;
