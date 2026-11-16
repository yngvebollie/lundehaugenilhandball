-- Self-only read model. The caller cannot supply a player or team identifier.
create function nhf_private.my_fixture_log() returns jsonb
language sql stable security definer set search_path='' as $$
 with me as (select id,squad from public.beta_members where id=auth.uid() and role='athlete'),
 regs as (select r.* from me join nhf_private.active_seasons s on s.team=me.squad
 join public.beta_team_seasons r on r.team=s.team and r.season=s.season),
 own_keys as (select distinct l.reg,coalesce(k.season_player,l.player) player from me
 join nhf_private.badge_links l on l.athlete=me.id join regs on regs.id=l.reg
 left join nhf_private.season_player_keys k on k.registration=l.reg and k.player_id=l.player),
 fixtures as (select m.*,coalesce(nullif(r.display_name,''),'Lag '||r.org_id) team_name from regs r
 join public.beta_matches m on m.team=r.team and m.registration=r.id),
 personal as (select m.id, max(coalesce(p.report_goals,s.shots_hit)) goals,max(p.report_warnings) warnings,
 max(s.goalkeeper_saves) saves from fixtures m join nhf_private.match_participants p on p.team=m.team and p.match_id=m.id
 left join nhf_private.season_player_keys k on k.registration=m.registration and k.player_id=p.player_id
 join own_keys l on l.reg=m.registration and l.player=coalesce(k.season_player,p.player_id)
 left join nhf_private.player_match_statistics s on s.match_id=m.id and s.player_id=p.player_id
 where m.completed and coalesce(p.local_played,p.report_played,p.nif_played,false)
 group by m.id having count(distinct coalesce(k.season_player,p.player_id))=1),
 games as (select m.id,coalesce('nif:'||m.nif_id::text,m.id::text) fixture,m.registration reg,m.team_name,m.day,m.start_time::text time,m.opponent,
 coalesce(nullif(concat_ws(' – ',m.home,m.away),''),m.opponent) title,m.venue,m.score,m.completed,p.id is not null played,p.goals,p.warnings,p.saves
 from fixtures m left join personal p on p.id=m.id
 union all select g.id,'cup:'||g.id::text,r.id,coalesce(r.display_name,'Lag '||r.org_id),g.day,null,g.opponent,
 c.name||' · mot '||g.opponent,null,case when g.scored is not null then g.scored||'-'||g.conceded||' (egne mål først)' end,
 g.scored is not null,(me.id=any(g.played)),null,null,null from regs r join public.beta_cups c on c.registration=r.id and c.team=r.team
 join public.beta_cup_games g on g.team=c.team and g.cup=c.id cross join me)
 select coalesce(jsonb_agg(to_jsonb(games) order by day,time,id),'[]'::jsonb) from games
$$;
create function public.beta_my_fixture_log() returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.my_fixture_log()$$;
revoke all on function nhf_private.my_fixture_log(),public.beta_my_fixture_log() from public,anon;
grant execute on function nhf_private.my_fixture_log(),public.beta_my_fixture_log() to authenticated;

-- Preserve the catalog reference and each set; keep the normal history and ratings readable.
alter table public.beta_assignments add column logged_sets jsonb;
create function public.beta_quick_training_sets(t uuid,k uuid,label text,at_time timestamptz,minutes_done int,entries jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a uuid:=auth.uid(); d timestamp:=at_time at time zone 'Europe/Oslo'; x jsonb; lines text[]:='{}'; vals text;
begin
 if a is null or not exists(select from public.beta_members where id=a and role='athlete' and squad=t) then raise exception 'Utøvertilgang kreves';end if;
 if k is null or coalesce(length(trim(label)),0) not between 1 and 100 or at_time is null or not isfinite(at_time) or at_time>now() or coalesce(minutes_done,0) not between 1 and 600 then raise exception 'Ugyldig treningsøkt';end if;
 if jsonb_typeof(entries) is distinct from 'array' or octet_length(entries::text)>40000 or jsonb_array_length(entries) not between 1 and 30 then raise exception 'Ugyldig øvelsesliste';end if;
 for x in select value from jsonb_array_elements(entries) loop
  if coalesce(length(x->>'id'),0) not between 1 and 160 or coalesce(length(trim(x->>'name')),0) not between 1 and 120 or coalesce(x->>'unit','') not in ('rep','sek','min','m')
   or jsonb_typeof(x->'sets') is distinct from 'array' or jsonb_array_length(x->'sets') not between 1 and 30 then raise exception 'Kontroller øvelsen og settene';end if;
  if exists(select from jsonb_array_elements(x->'sets') n where jsonb_typeof(n)<>'number' or n::text !~ '^[1-9][0-9]{0,3}$') then raise exception 'Antall må være mellom 1 og 9999';end if;
  select string_agg(v, ' / ' order by i) into vals from jsonb_array_elements_text(x->'sets') with ordinality n(v,i);
  lines:=array_append(lines,(x->>'name')||' · '||vals||' '||(x->>'unit'));
 end loop;
 if exists(select from public.beta_assignments where id=k and squad=t and athlete=a and personal and logged_sets=entries and title=trim(label) and day=d::date and start_time=d::time and minutes=minutes_done) then return k;end if;
 insert into public.beta_assignments(id,squad,athlete,title,day,start_time,minutes,kind,personal,exercises,logged_sets)
 values(k,t,a,trim(label),d::date,d::time,minutes_done,'Session',true,lines,entries);
 insert into public.beta_checks(assignment,step) select k,i from generate_series(0,cardinality(lines)-1) i;
 return k;
end $$;
revoke all on function public.beta_quick_training_sets(uuid,uuid,text,timestamptz,int,jsonb) from public,anon;
grant execute on function public.beta_quick_training_sets(uuid,uuid,text,timestamptz,int,jsonb) to authenticated;
