-- The same NIF org may enter again in another season; the registration, not its label, owns match data.
alter table public.beta_team_seasons drop constraint beta_team_seasons_team_org_id_key,
 add column display_name text not null default '' check(length(display_name)<=100);
grant insert(display_name),update(display_name) on public.beta_team_seasons to authenticated;
create table nhf_private.season_choices(team uuid references public.beta_teams on delete cascade,season int check(season>0),label text not null check(length(trim(label)) between 1 and 40),primary key(team,season));
create table nhf_private.active_seasons(team uuid primary key references public.beta_teams on delete cascade,season int not null,foreign key(team,season) references nhf_private.season_choices);
revoke all on nhf_private.season_choices,nhf_private.active_seasons from public,anon,authenticated;
insert into nhf_private.season_choices select distinct team,season,case when season=201068 then '2026/27' else 'NIF '||season end from public.beta_team_seasons where season>0;
insert into nhf_private.active_seasons select team,max(season) from nhf_private.season_choices group by team;
update public.beta_team_seasons set display_name='Hundvåg J13' where org_id=226751 and season=201068;
create function nhf_private.season_settings(action text,t uuid,sid int,title text) returns jsonb language plpgsql security definer set search_path='' as $$
declare chosen int;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 if action='save' then
  if not nhf_private.admin_of(t) or sid is null or sid<1 or length(trim(coalesce(title,''))) not between 1 and 40 then raise exception 'Velg gyldig sesong som admintrener';end if;
  insert into nhf_private.season_choices values(t,sid,trim(title)) on conflict(team,season) do update set label=excluded.label;
  insert into nhf_private.active_seasons values(t,sid) on conflict(team) do update set season=excluded.season;
 elsif action is distinct from 'read' then raise exception 'Ukjent handling';end if;
 select season into chosen from nhf_private.active_seasons where team=t;
 return jsonb_build_object('active',chosen,'options',coalesce((select jsonb_agg(jsonb_build_object('id',season,'label',label) order by season desc) from nhf_private.season_choices where team=t),'[]'));
end $$;
create function public.beta_season_settings(action text,t uuid,sid int default null,title text default '') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.season_settings(action,t,sid,title)$$;
revoke all on function public.beta_season_settings(text,uuid,int,text),nhf_private.season_settings(text,uuid,int,text) from public,anon;
grant execute on function public.beta_season_settings(text,uuid,int,text),nhf_private.season_settings(text,uuid,int,text) to authenticated;
alter policy season_add on public.beta_team_seasons with check(nhf_private.admin_of(team) and season>0 and season=(nhf_private.season_settings('read',team,null,'')->>'active')::int);
create function nhf_private.sync_targets() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(r.id),'[]') from public.beta_team_seasons r join nhf_private.active_seasons s on r.team=s.team and r.season=s.season where r.active
$$;
create function public.beta_sync_targets() returns jsonb language sql stable security invoker set search_path='' as $$ select nhf_private.sync_targets() $$;
revoke all on function nhf_private.sync_targets(),public.beta_sync_targets() from public,anon,authenticated;
grant execute on function nhf_private.sync_targets(),public.beta_sync_targets() to service_role;
create or replace function nhf_private.player_form(t uuid,m uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict g from public.beta_matches where team=t and id=m;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,'player_form');
 return coalesce((select jsonb_object_agg(player_id,jsonb_build_object('games',games,'goals',goals,'prior_games',prior_games,'prior_goals',prior_goals)) from (
 select a.player_id,count(*) games,sum(coalesce(a.report_goals,s.shots_hit)) goals,count(*) filter(where h.id<>m) prior_games,
 sum(coalesce(a.report_goals,s.shots_hit)) filter(where h.id<>m) prior_goals from nhf_private.match_participants a join public.beta_matches h on h.id=a.match_id
 left join nhf_private.player_match_statistics s using(match_id,player_id) where h.team=t and h.registration is not distinct from g.registration
 and (h.day<g.day or h.id=m or (h.day=g.day and h.start_time<g.start_time))
 and h.day<=(now() at time zone 'Europe/Oslo')::date and h.completed and coalesce(a.local_played,a.report_played,a.nif_played,false)
 and coalesce(a.report_goals,s.shots_hit) is not null and exists(select from nhf_private.match_participants cur where cur.match_id=m and cur.player_id=a.player_id)
 group by a.player_id) z),'{}');
end $$;
