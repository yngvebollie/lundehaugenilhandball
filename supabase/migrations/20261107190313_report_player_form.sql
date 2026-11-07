alter table nhf_private.match_participants add column report_listed boolean not null default false,
 add column report_played boolean,add column report_goals int check(report_goals>=0),add column report_warnings int check(report_warnings between 0 and 3);
create table nhf_private.report_identities(registration uuid references public.beta_team_seasons on delete cascade,
 norm text,shirt text,player_id uuid not null references nhf_private.match_players,primary key(registration,norm,shirt));
revoke all on nhf_private.report_identities from public,anon,authenticated;
create function nhf_private.project_report(mid uuid, doc jsonb) returns void language plpgsql set search_path='' as $$
declare g public.beta_matches;side text;x jsonb;pid uuid; candidates uuid[];nm text;nr text;w int;
begin
 select * into strict g from public.beta_matches where id=mid for update;
 update nhf_private.match_participants set report_listed=false,report_played=null,report_goals=null,report_warnings=null where match_id=mid and report_listed;
 if doc is null then return;end if;
 side:=case when trim(g.opponent)=trim(g.away) and trim(g.home)<>trim(g.away) then 'A' when trim(g.opponent)=trim(g.home) and trim(g.home)<>trim(g.away) then 'B' end;
 if side is null or g.registration is null then return;end if;
 perform 1 from public.beta_team_seasons where id=g.registration for update;
 for x in select value from jsonb_array_elements(doc->'players') loop
   w:=case when x->>'warning'='true' then 1 when x->>'warning'='false' then 0
      when x->>'warning' is null then null when x->>'warning' ~ '^[0-3]$' then (x->>'warning')::int else -1 end;
   if w=-1 then raise exception 'Advarsler må være 0–3';end if;
   if x->>'side'<>side then continue;end if;
   nm:=lower(regexp_replace(trim(x->>'name'),'[[:space:]]+',' ','g'));nr:=x->>'shirt';
   select player_id into pid from nhf_private.report_identities where registration=g.registration and norm=nm and shirt=nr;
   if pid is null then
     select array_agg(distinct p.player_id) into candidates from nhf_private.match_participants p join public.beta_matches h on h.id=p.match_id
     join nhf_private.match_players b on b.id=p.player_id where h.registration=g.registration and lower(regexp_replace(trim(b.name),'[[:space:]]+',' ','g'))=nm and p.shirt_number=nr;
     if cardinality(candidates)=1 then pid:=candidates[1];
     else insert into nhf_private.match_players(name) values(trim(x->>'name')) returning id into pid;end if;
     insert into nhf_private.report_identities values(g.registration,nm,nr,pid);
   end if;
   insert into nhf_private.match_participants(team,match_id,player_id,shirt_number,report_listed,report_played,report_goals,report_warnings)
   values(g.team,mid,pid,nr,true,(x->>'played')::boolean,(x->>'total')::int,w)
   on conflict(match_id,player_id) do update set report_listed=true,report_played=excluded.report_played,report_goals=excluded.report_goals,report_warnings=excluded.report_warnings;
 end loop;
end $$;
revoke all on function nhf_private.project_report(uuid,jsonb) from public,anon,authenticated;
create function nhf_private.report_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then if exists(select from public.beta_matches where id=old.match_id) then perform nhf_private.project_report(old.match_id,null);end if;return old;end if;
 perform nhf_private.project_report(new.match_id,new.reviewed);return new;
end $$;
revoke all on function nhf_private.report_changed() from public,anon,authenticated;
create trigger report_project after insert or update of reviewed or delete on nhf_private.match_reports for each row execute function nhf_private.report_changed();
select nhf_private.project_report(match_id,reviewed) from nhf_private.match_reports;
create or replace function nhf_private.match_action(action text,t uuid,m uuid,p uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; label text; rec public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Coach access required';end if;
 if action='counts' then return coalesce((select jsonb_object_agg(match_id,n) from
 (select a.match_id,count(*) n from nhf_private.match_participants a join public.beta_matches x on x.id=a.match_id left join nhf_private.player_match_statistics s using(match_id,player_id) where x.team=t and (a.report_listed or s.match_id is not null) group by a.match_id) q),'{}');end if;
 if action='new' then
   insert into public.beta_matches(id,team,opponent,day,lineup) values(gen_random_uuid(),t,trim(v->>'opponent'),(v->>'day')::date,'{}') returning id into m;
   return to_jsonb(m);
 end if;
 select * into strict rec from public.beta_matches where id=m and team=t for update;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,action);
 if action='details' then
   return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('name',b.name,'stats',to_jsonb(s)) order by b.name)
     from nhf_private.match_participants a join nhf_private.match_players b on a.player_id=b.id
     left join nhf_private.player_match_statistics s using(match_id,player_id) where a.match_id=m),'[]'),
   'catalog',coalesce((select jsonb_agg(to_jsonb(x)) from (select distinct b.id,b.name from nhf_private.match_players b join nhf_private.match_participants a on a.player_id=b.id join public.beta_matches history on history.id=a.match_id where a.team=t and history.registration is not distinct from rec.registration) x),'[]'));
 elsif action='participant' then
   if p is null then insert into nhf_private.match_players(name) values(trim(v->>'name')) returning id into p;
   elsif not exists(select from nhf_private.match_participants where team=t and player_id=p) then
     select name into strict label from public.beta_members where id=p and squad=t and role='athlete';
     insert into nhf_private.match_players(id,name) values(p,label) on conflict(id) do nothing;
   end if;
   insert into nhf_private.match_participants(team,match_id,player_id,shirt_number,local_played)
   values(t,m,p,left(v->>'number',8),(v->>'played')::boolean)
   on conflict(match_id,player_id) do update set local_played=excluded.local_played,discrepancy=false,updated_at=now();
 elsif action='finished' then
   if rec.registration is not null or rec.day>(now() at time zone 'Europe/Oslo')::date then raise exception 'Invalid manual result';end if;
   update public.beta_matches set completed=true,status='Ferdig',score=nullif(left(v->>'score',20),'') where id=m;
 elsif action='stats' then
   if not exists(select from nhf_private.match_participants where match_id=m and player_id=p and coalesce(local_played,report_played,nif_played,false)) then raise exception 'Confirm participation first';end if;
   if (v->>'is_best_player')::boolean then update nhf_private.player_match_statistics set is_best_player=false,updated_at=now(),updated_by=auth.uid() where match_id=m and is_best_player and player_id<>p;end if;
   insert into nhf_private.player_match_statistics(match_id,player_id,shots_hit,shots_missed,technical_errors,goalkeeper_saves,rating,notes,is_best_player,created_by,updated_by)
    values(m,p,(v->>'shots_hit')::int,(v->>'shots_missed')::int,(v->>'technical_errors')::int,(v->>'goalkeeper_saves')::int,(v->>'rating')::int,v->>'notes',(v->>'is_best_player')::boolean,auth.uid(),auth.uid())
    on conflict(match_id,player_id) do update set shots_hit=excluded.shots_hit,shots_missed=excluded.shots_missed,technical_errors=excluded.technical_errors,
    goalkeeper_saves=excluded.goalkeeper_saves,rating=excluded.rating,notes=excluded.notes,is_best_player=excluded.is_best_player,updated_by=auth.uid(),updated_at=now();
 elsif action='erase' and nhf_private.admin_of(t) then delete from nhf_private.player_match_statistics where match_id=m and player_id=p;
 else raise exception 'Unknown or unauthorized match action';end if;
 return 'true';
end $$;

create function nhf_private.player_form(t uuid,m uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict g from public.beta_matches where team=t and id=m;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,'player_form');
 return coalesce((select jsonb_object_agg(player_id,jsonb_build_object('games',games,'goals',goals,'prior_games',prior_games,'prior_goals',prior_goals)) from (
 select a.player_id,count(*) games,sum(coalesce(a.report_goals,s.shots_hit)) goals,count(*) filter(where h.id<>m) prior_games,
 sum(coalesce(a.report_goals,s.shots_hit)) filter(where h.id<>m) prior_goals from nhf_private.match_participants a join public.beta_matches h on h.id=a.match_id
 left join nhf_private.player_match_statistics s using(match_id,player_id) where h.team=t and h.registration is not distinct from g.registration
 and h.day>=date_trunc('year',g.day)::date and (h.day<g.day or h.id=m or (h.day=g.day and h.start_time<g.start_time))
 and h.day<=(now() at time zone 'Europe/Oslo')::date and h.completed and coalesce(a.local_played,a.report_played,a.nif_played,false)
 and coalesce(a.report_goals,s.shots_hit) is not null and exists(select from nhf_private.match_participants cur where cur.match_id=m and cur.player_id=a.player_id)
 group by a.player_id) z),'{}');
end $$;
create function public.beta_player_form(t uuid,m uuid) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.player_form(t,m)$$;
revoke all on function public.beta_player_form(uuid,uuid),nhf_private.player_form(uuid,uuid) from public,anon;
grant execute on function public.beta_player_form(uuid,uuid),nhf_private.player_form(uuid,uuid) to authenticated;
create or replace view nhf_private.match_season_totals as
 select a.team,m.registration,m.competition,a.player_id,count(*) matches_played,coalesce(sum(coalesce(a.report_goals,s.shots_hit)),0) goals,coalesce(sum(s.shots_missed),0) missed,
 coalesce(sum(coalesce(a.report_goals,s.shots_hit,0)+coalesce(s.shots_missed,0)),0) attempts,
 100.0*sum(coalesce(a.report_goals,s.shots_hit,0))/nullif(sum(coalesce(a.report_goals,s.shots_hit,0)+coalesce(s.shots_missed,0)),0) shooting_percent,
 coalesce(sum(s.technical_errors),0) technical_errors,coalesce(sum(s.goalkeeper_saves),0) saves,avg(s.rating) rating,count(*) filter(where s.is_best_player) awards
 from nhf_private.match_participants a join public.beta_matches m on m.id=a.match_id left join nhf_private.player_match_statistics s using(match_id,player_id)
 where coalesce(a.local_played,a.report_played,a.nif_played,false) and m.completed and m.day<=(now() at time zone 'Europe/Oslo')::date
 group by a.team,m.registration,m.competition,a.player_id;

