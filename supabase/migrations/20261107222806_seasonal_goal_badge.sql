create table nhf_private.season_goal_awards(team uuid,season int,athlete uuid references auth.users on delete cascade,level int not null check(level between 1 and 3),
 earned_at timestamptz not null default now(), primary key(team,season,athlete,level),foreign key(team,season) references nhf_private.season_choices on delete cascade);
revoke all on nhf_private.season_goal_awards from public,anon,authenticated;
create or replace function nhf_private.refresh_badges(t uuid,a uuid) returns jsonb language plpgsql set search_path='' as $progress$
declare answer jsonb;targets jsonb;sid int;
begin
 select season into sid from nhf_private.active_seasons where team=t;
 with sessions as (
 select b.id,b.day,b.kind,coalesce(att.status,case when cardinality(b.exercises)=(select count(*) from public.beta_checks c where c.assignment=b.id) then 'present' else 'missed' end) status
 from public.beta_assignments b left join nhf_private.badge_attendance att on att.id=b.id where b.athlete=a and b.kind<>'Game' and b.day<=(now() at time zone 'Europe/Oslo')::date
 ), practice as(select *,count(*) filter(where status='missed') over(order by day,id) block from sessions where kind='Practice'),
 match_data as(select * from nhf_private.badge_played p where p.athlete=a),
 measures as(
 select key k,case when key in ('beep','kmt') then max(quantity) else sum(quantity) end n from nhf_private.badge_events where athlete=a group by key
 union all select cm.key,cm.n from nhf_private.challenge_merits(a) cm
 union all select 'level_up',count(*) from (select quantity,max(quantity) over(partition by key order by day rows between unbounded preceding and 1 preceding) prior from nhf_private.badge_events where athlete=a and key in ('beep','kmt')) tests where quantity>prior
 union all select 'iron_will',count(*) from sessions where status='present'
 union all select 'on_fire',coalesce(max(cnt),0) from (select count(*) filter(where status='present') cnt from practice group by block) s
 union all select 'consistency_king_queen',count(*) from (select date_trunc('week',day) wk from practice group by 1 having bool_and(status<>'missed') and bool_or(status='present') and date_trunc('week',day)<date_trunc('week',current_date)) w
 union all select 'goal_machine',coalesce(sum(goals),0) from (
   select min(p.report_goals) goals from match_data p join public.beta_matches m on m.id=p.mid
   join public.beta_team_seasons r on r.id=m.registration and r.team=t and r.season=sid
   where p.report_goals is not null group by coalesce(m.nif_id::text,m.id::text) having count(distinct p.report_goals)=1
 ) season_scoring
 union all select 'game_warrior',count(*) from match_data
 union all select 'hat_trick_hero',count(*) from match_data where report_goals>=3
 union all select 'the_wall',coalesce(sum(goalkeeper_saves),0) from match_data
 union all select 'mvp',count(*) from match_data where is_best_player
 union all select 'sharpshooter',count(*) from match_data where shots_hit+shots_missed>=5 and shots_hit>=0.7*(shots_hit+shots_missed)
 union all select 'versatility_master',count(distinct position) from match_data where nullif(trim(position),'') is not null
 union all select r.key,count(*) from nhf_private.badge_rec r join match_data p on r.match_id=p.mid where r.recipient=a and not r.revoked
 and exists(select from nhf_private.badge_played g where g.mid=r.match_id and g.athlete=r.giver) group by r.key
 ) select jsonb_object_agg(q.k,q.n) into answer from (select measures.k,sum(measures.n) n from measures group by measures.k) q;
 select coalesce(jsonb_object_agg(key,levels),'{}') into targets from nhf_private.badge_targets where team=t and season=sid;
 insert into nhf_private.badge_unlocks(athlete,key,level) select a,k.key,i from nhf_private.badge_defs k left join nhf_private.badge_targets custom on custom.team=t and custom.season=sid and custom.key=k.key
 cross join lateral generate_subscripts(k.levels,1) i where k.key<>'goal_machine' and coalesce((answer->>k.key)::int,0)>=(coalesce(custom.levels,k.levels))[i] on conflict do nothing;
 if sid is not null then
  insert into nhf_private.season_goal_awards(team,season,athlete,level)
  select t,sid,a,i from nhf_private.badge_defs b left join nhf_private.badge_targets custom on custom.team=t and custom.season=sid and custom.key=b.key
  cross join lateral generate_subscripts(b.levels,1) i where b.key='goal_machine' and (answer->>'goal_machine')::int>=(coalesce(custom.levels,b.levels))[i]
  on conflict do nothing;
 end if;
 return answer;
end $progress$;
create function nhf_private.badge_season_view(action text,t uuid,a uuid,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $view$
declare result jsonb;sid int;season_label text;
begin
 result:=nhf_private.badge_access(action,t,a,v);
 select ac.season,s.label into sid,season_label from nhf_private.active_seasons ac join nhf_private.season_choices s using(team,season) where ac.team=t;
 return result||jsonb_build_object('goal_season',season_label,'earned',
 coalesce((select jsonb_agg(e order by e->>'key',e->>'level') from (
 select item e from jsonb_array_elements(result->'earned') item where item->>'key'<>'goal_machine'
 union all select jsonb_build_object('key','goal_machine','level',level,'at',earned_at) from nhf_private.season_goal_awards where team=t and season=sid and athlete=a) history),'[]'::jsonb));
end $view$;
create or replace function public.beta_badges(action text,t uuid,a uuid,v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.badge_season_view(action,t,a,v)$$;
revoke all on function nhf_private.badge_season_view(text,uuid,uuid,jsonb) from public,anon;
grant execute on function nhf_private.badge_season_view(text,uuid,uuid,jsonb) to authenticated;
