create table nhf_private.badge_defs (key text primary key,category text not null,levels integer[] not null);
insert into nhf_private.badge_defs values
('on_fire','Trening',array[3,10,25]),
('iron_will','Trening',array[10,50,150]),
('early_bird','Trening',array[5,20,50]),
('goal_getter','Trening',array[3,10,25]),
('extra_mile','Trening',array[5,20,50]),
('engine_builder','Trening',array[5,20,60]),
('consistency_king_queen','Trening',array[2,8,20]),
('hard_worker','Trening',array[5,25,75]),
('never_give_up','Trening',array[3,12,30]),
('precision_builder','Trening',array[5,20,50]),
('one_more_rep','Trening',array[5,25,75]),
('student_of_game','Trening',array[3,12,30]),
('footwork_wizard','Trening',array[5,20,50]),
('mission_complete','Trening',array[5,20,60]),
('better_every_week','Trening',array[3,10,25]),
('body_guardian','Trening',array[5,25,75]),
('goal_machine','Kamp',array[10,50,150]),
('sharpshooter','Kamp',array[3,10,25]),
('the_wall','Kamp',array[20,100,300]),
('mvp','Kamp',array[1,5,15]),
('game_warrior','Kamp',array[10,40,100]),
('hat_trick_hero','Kamp',array[3,15,40]),
('defensive_guardian','Kamp',array[3,10,25]),
('playmaker','Kamp',array[10,40,100]),
('level_up','Ferdigheter',array[1,5,12]),
('game_iq','Ferdigheter',array[3,10,25]),
('versatility_master','Ferdigheter',array[2,3,4]),
('speed_demon','Ferdigheter',array[3,10,25]),
('skill_collector','Ferdigheter',array[3,10,20]),
('comeback_kid','Ferdigheter',array[1,3,6]),
('team_player','Lagånd',array[5,20,50]),
('positive_energy','Lagånd',array[5,15,40]),
('helping_hand','Lagånd',array[3,10,25]),
('rising_star','Lagånd',array[3,10,25]),
('fair_play_champion','Lagånd',array[3,10,25]),
('fan_favorite','Anerkjennelse',array[3,10,30]),
('everyones_teammate','Anerkjennelse',array[5,20,50]),
('iron_defender','Anerkjennelse',array[3,10,30]),
('simply_awesome','Anerkjennelse',array[5,20,50]),
('spirit_leader','Anerkjennelse',array[5,20,50]),
('relentless_spirit','Anerkjennelse',array[5,20,50]),
('mastermind','Anerkjennelse',array[3,10,30]),
('respect_champion','Anerkjennelse',array[3,10,30]),
('beep','Tester',array[5,6,7,8,9,10,11,12,13,14,15]),
('kmt','Tester',array[50,55,60,65,70,75,80,85,90,95,100,105,110]);
create function nhf_private.challenge_merits(person uuid) returns table (key text,n bigint) language sql stable set search_path='' as $$select null::text,0::bigint where false$$;
revoke all on function nhf_private.challenge_merits(uuid) from public,anon,authenticated;
create table nhf_private.badge_events(team uuid references public.beta_teams, athlete uuid references public.beta_members, key text references nhf_private.badge_defs,
 day date not null, quantity integer not null check(quantity between 0 and 999), verified_by uuid not null, primary key(team,athlete,key,day));
create table nhf_private.badge_unlocks(athlete uuid references public.beta_members,key text references nhf_private.badge_defs,level int,earned_at timestamptz default now(),primary key(athlete,key,level));
create table nhf_private.badge_links(reg uuid references public.beta_team_seasons on delete cascade,player uuid references nhf_private.match_players,
 athlete uuid references public.beta_members,primary key(reg,player),unique(reg,athlete));
create table nhf_private.badge_privacy(athlete uuid primary key references public.beta_members,receive boolean not null default true,
 attribution boolean not null default false, notifications boolean not null default true);
create table nhf_private.badge_targets(team uuid references public.beta_teams on delete cascade,season int not null,key text references nhf_private.badge_defs,
 levels integer[] not null,primary key(team,season,key));
revoke all on nhf_private.badge_targets from public,anon,authenticated;
create table nhf_private.badge_finish(match_id uuid primary key references public.beta_matches on delete cascade,finished_at timestamptz not null);
create table nhf_private.badge_rec(match_id uuid references public.beta_matches on delete cascade, giver uuid references public.beta_members,
 recipient uuid references public.beta_members, key text references nhf_private.badge_defs,revoked boolean not null default false,updated_at timestamptz not null default now(),
 primary key(match_id,giver,recipient),check(giver<>recipient));
alter table nhf_private.badge_rec add created_at timestamptz not null default now();
create table nhf_private.badge_seen(athlete uuid primary key references public.beta_members on delete cascade,read_at timestamptz not null);
revoke all on nhf_private.badge_seen from public,anon,authenticated;
create table nhf_private.badge_audit(actor uuid,at timestamptz default now(),team uuid,action text,subject uuid,detail jsonb);
create table nhf_private.badge_attendance(id uuid primary key references public.beta_assignments on delete cascade,status text check(status in ('present','missed','excused')));
revoke all on nhf_private.badge_defs,nhf_private.badge_events,nhf_private.badge_unlocks,nhf_private.badge_links,nhf_private.badge_privacy,
 nhf_private.badge_finish,nhf_private.badge_rec,nhf_private.badge_audit,nhf_private.badge_attendance from public,anon,authenticated;

-- A default "yes" on an unmarked report row is not verified match participation.
create view nhf_private.badge_played with (security_invoker=true) as
select distinct g.team,g.id mid,g.day,l.athlete,p.player_id,p.report_goals,s.shots_hit,s.shots_missed,s.goalkeeper_saves,s.is_best_player,p.position
from public.beta_matches g join nhf_private.match_participants p on p.match_id=g.id
left join nhf_private.season_player_keys k on k.registration=g.registration and k.player_id=p.player_id
join nhf_private.badge_links l on l.reg=g.registration
left join nhf_private.season_player_keys lk on lk.registration=l.reg and lk.player_id=l.player
join public.beta_members u on u.id=l.athlete and u.squad=g.team and u.role='athlete'
left join nhf_private.player_match_statistics s on s.match_id=g.id and s.player_id=p.player_id
left join nhf_private.match_reports r on r.match_id=g.id
where coalesce(k.season_player,p.player_id)=coalesce(lk.season_player,l.player) and g.completed and g.day<=(now() at time zone 'Europe/Oslo')::date
and coalesce(p.local_played,case when p.report_played is false then false end,p.nif_played,
 (p.report_played and exists(select from jsonb_array_elements(r.original->'players') x join nhf_private.report_identities i
 on i.registration=g.registration and i.player_id=p.player_id and i.norm=lower(regexp_replace(trim(x->>'name'),'[[:space:]]+',' ','g')) and i.shirt=x->>'shirt'
 where x->>'side'=case when g.opponent=g.away then 'A' when g.opponent=g.home then 'B' end and x->>'played'='true')),false);
revoke all on nhf_private.badge_played from public,anon,authenticated;
create function nhf_private.refresh_badges(t uuid,a uuid) returns jsonb language plpgsql set search_path='' as $progress$
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
 union all select 'goal_machine',coalesce(sum(report_goals),0) from match_data
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
 cross join lateral generate_subscripts(k.levels,1) i where coalesce((answer->>k.key)::int,0)>=(coalesce(custom.levels,k.levels))[i] on conflict do nothing;
 return answer;
end $progress$;
revoke all on function nhf_private.refresh_badges(uuid,uuid) from public,anon,authenticated;
create function nhf_private.badge_access(action text,t uuid,a uuid,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); coach boolean;myself boolean;keyname text:=v->>'key'; n int; d date;
 mid uuid;other uuid;registered uuid;pid uuid;fin timestamptz;answer jsonb;targets jsonb;sid int;limits int[];
begin
 if u is null then raise exception 'Logg inn';end if;
 if jsonb_typeof(v) is distinct from 'object' or pg_column_size(v)>2500 then raise exception 'Ugyldig registrering';end if;
 coach:=nhf_private.coaches(t);
 myself:=a=u and exists(select from public.beta_members where id=u and squad=t and role='athlete');
 if not coalesce(coach or myself,false) or not exists(select from public.beta_members where id=a and squad=t and role='athlete') then raise exception 'Ingen tilgang';end if;
 select season into sid from nhf_private.active_seasons where team=t;
 if action='targets' and nhf_private.admin_of(t) then
  if sid is null or not exists(select from nhf_private.badge_defs where key=keyname and category<>'Tester') then raise exception 'Velg aktiv sesong og et tredelt merke';end if;
  select array_agg(x::int order by ord) into limits from jsonb_array_elements_text(v->'levels') with ordinality e(x,ord);
  if coalesce(cardinality(limits),0)<>3 or not (limits[1]>0 and limits[2]>limits[1] and limits[3]>limits[2] and limits[3]<=100000) then raise exception 'Oppgi tre stigende mål';end if;
  insert into nhf_private.badge_targets values(t,sid,keyname,limits) on conflict(team,season,key) do update set levels=excluded.levels;
 elsif action='event' and coach then
  d:=(v->>'day')::date;n:=(v->>'quantity')::int;
  if d is null or d>(now() at time zone 'Europe/Oslo')::date or n is null or not exists(select from nhf_private.badge_defs where key=keyname and category<>'Anerkjennelse')
  or keyname in ('on_fire','iron_will','consistency_king_queen','goal_machine','sharpshooter','the_wall','game_warrior','hat_trick_hero','mvp','versatility_master')
  or (keyname='beep' and n>30) or (keyname='kmt' and n>200) then raise exception 'Ugyldig registrering';end if;
  insert into nhf_private.badge_events values(t,a,keyname,d,n,u) on conflict(team,athlete,key,day) do update set quantity=excluded.quantity,verified_by=u;
 elsif action='attendance' and coach then
  pid:=(v->>'id')::uuid;if not exists(select from public.beta_assignments where id=pid and athlete=a and squad=t and kind='Practice' and day<=current_date) then raise exception 'Ugyldig trening';end if;
  insert into nhf_private.badge_attendance values(pid,v->>'status') on conflict(id) do update set status=excluded.status;
 elsif action='link' and coach then
  registered:=(v->>'reg')::uuid;pid:=(v->>'player')::uuid;
  if not exists(select from public.beta_matches g join nhf_private.match_participants p on p.match_id=g.id where g.team=t and g.registration=registered and p.player_id=pid) then raise exception 'Ukjent spiller';end if;
  if exists(select from nhf_private.badge_links l left join nhf_private.season_player_keys k on k.registration=l.reg and k.player_id=l.player
   left join nhf_private.season_player_keys x on x.registration=l.reg and x.player_id=pid where l.reg=registered and l.athlete<>a and coalesce(x.season_player,pid)=coalesce(k.season_player,l.player)) then raise exception 'Allerede knyttet til en konto';end if;
  insert into nhf_private.badge_links values(registered,pid,a) on conflict(reg,athlete) do update set player=excluded.player;
 elsif action='finish' and coach then
  mid:=(v->>'match')::uuid;fin:=(v->>'time')::timestamp at time zone 'Europe/Oslo';
  if fin>now() or not exists(select from public.beta_matches where id=mid and team=t and completed and day=(fin at time zone 'Europe/Oslo')::date
   and (start_time is null or (fin at time zone 'Europe/Oslo')::time>=start_time)) then raise exception 'Kontroller kampens sluttid';end if;
  insert into nhf_private.badge_finish values(mid,fin) on conflict(match_id) do update set finished_at=excluded.finished_at;
 elsif action='seen' and myself then insert into nhf_private.badge_seen values(u,now()) on conflict(athlete) do update set read_at=excluded.read_at;
 elsif action='privacy' and myself then
  insert into nhf_private.badge_privacy values(u,(v->>'receive')::boolean,coalesce((v->>'attribution')::boolean,false),coalesce((v->>'notifications')::boolean,true))
  on conflict(athlete) do update set receive=excluded.receive,attribution=coalesce((v->>'attribution')::boolean,badge_privacy.attribution),notifications=coalesce((v->>'notifications')::boolean,badge_privacy.notifications);
 elsif action in ('recognize','withdraw') and myself then
  mid:=(v->>'match')::uuid;other:=(v->>'recipient')::uuid;
  perform pg_advisory_xact_lock(hashtext(mid::text),hashtext(u::text));
  if not exists(select from nhf_private.badge_finish f join nhf_private.badge_played p on p.mid=f.match_id and p.team=t
   where p.mid=(v->>'match')::uuid and p.athlete=u and now() between f.finished_at and f.finished_at+interval '72 hours') or other=u
   or not exists(select from nhf_private.badge_played p where p.mid=(v->>'match')::uuid and p.team=t and p.athlete=other)
   or exists(select from nhf_private.badge_privacy where athlete in(u,other) and not receive) then raise exception 'Ikke tilgjengelig for denne kampen';end if;
  if action='withdraw' then delete from nhf_private.badge_rec where match_id=mid and giver=u and recipient=other and not revoked;if not found then raise exception 'Ikke funnet';end if;
  else
  if not exists(select from nhf_private.badge_defs where key=keyname and category='Anerkjennelse') then raise exception 'Ugyldig anerkjennelse';end if;
  if exists(select from nhf_private.badge_rec r where r.match_id=mid and giver=u and recipient=other and revoked) then raise exception 'Tilbaketrukket av trener';end if;
  if not exists(select from nhf_private.badge_rec r where r.match_id=mid and giver=u and recipient=other) and
    (select count(*) from nhf_private.badge_rec r where r.match_id=mid and giver=u and not revoked)>=3 then raise exception 'Maks tre mottakere';end if;
  if (select count(*) from nhf_private.badge_audit where actor=u and badge_audit.action='recognize' and at>now()-interval '1 minute')>=10 then raise exception 'Vent litt før du prøver igjen';end if;
  insert into nhf_private.badge_rec(match_id,giver,recipient,key,revoked,updated_at) values(mid,u,other,keyname,false,now()) on conflict(match_id,giver,recipient) do update set key=excluded.key,updated_at=now();
  end if;
 elsif action='revoke' and coach then
  if length(trim(coalesce(v->>'reason',''))) not between 3 and 200 then raise exception 'Oppgi begrunnelse';end if;
  update nhf_private.badge_rec r set revoked=true where match_id=(v->>'match')::uuid and recipient=a and giver=(v->>'giver')::uuid and exists(select from public.beta_matches g where g.id=r.match_id and g.team=t);
  if not found then raise exception 'Ikke funnet';end if;
 elsif action<>'read' then raise exception 'Ingen tilgang';end if;
 if action<>'read' then insert into nhf_private.badge_audit(actor,team,action,subject,detail) values(u,t,action,a,v); end if;
 answer:=nhf_private.refresh_badges(t,a);
 select coalesce(jsonb_object_agg(key,levels),'{}') into targets from nhf_private.badge_targets where team=t and season=sid;
 return jsonb_build_object('counts',answer,'seen',(select read_at from nhf_private.badge_seen where athlete=a),'targets',targets,'earned',(select coalesce(jsonb_agg(jsonb_build_object('key',key,'level',level,'at',earned_at)),'[]') from nhf_private.badge_unlocks where athlete=a),
 'receive',coalesce((select receive from nhf_private.badge_privacy where athlete=a),true),
 'attribution',coalesce((select attribution from nhf_private.badge_privacy where athlete=a),false),'notifications',coalesce((select notifications from nhf_private.badge_privacy where athlete=a),true),
 'eligible',case when myself then (select coalesce(jsonb_agg(jsonb_build_object('match',p.mid,'name',u2.name,'athlete',p.athlete,'day',p.day,'opponent',(select opponent from public.beta_matches where id=p.mid),'given',r.key,'revoked',r.revoked) order by p.day,u2.name),'[]') from nhf_private.badge_played p join public.beta_members u2 on u2.id=p.athlete join nhf_private.badge_finish f on f.match_id=p.mid
 left join nhf_private.badge_rec r on r.match_id=p.mid and r.giver=u and r.recipient=p.athlete
 where p.team=t and p.athlete<>u and now() between f.finished_at and f.finished_at+interval '72 hours'
 and not exists(select from nhf_private.badge_privacy where athlete in(u,p.athlete) and not receive) and exists(select from nhf_private.badge_played gp where gp.mid=p.mid and gp.athlete=u)) else '[]'::jsonb end,
 'inbox',(select coalesce(jsonb_agg(jsonb_build_object('key',r.key,'day',p.day,'at',r.created_at,'from',case when exists(select from nhf_private.badge_privacy b where b.athlete=r.giver and b.attribution) then (select name from public.beta_members g where g.id=r.giver) end) order by p.day desc),'[]') from nhf_private.badge_rec r join nhf_private.badge_played p on p.mid=r.match_id and p.athlete=a where r.recipient=a and not r.revoked and exists(select from nhf_private.badge_played gp where gp.mid=r.match_id and gp.athlete=r.giver)),
 'moderate',case when coach then (select coalesce(jsonb_agg(jsonb_build_object('match',r.match_id,'giver',giver,'day',g.day,'key',key)),'[]') from nhf_private.badge_rec r join public.beta_matches g on g.id=r.match_id where g.team=t and recipient=a and not revoked) else '[]'::jsonb end);
end $$;
create function public.beta_badges(action text,t uuid,a uuid,v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.badge_access(action,t,a,v)$$;
revoke all on function public.beta_badges(text,uuid,uuid,jsonb),nhf_private.badge_access(text,uuid,uuid,jsonb) from public,anon;
grant execute on function public.beta_badges(text,uuid,uuid,jsonb),nhf_private.badge_access(text,uuid,uuid,jsonb) to authenticated;
-- Record first unlocks at source changes, not just when a player opens the page.
create function nhf_private.badge_source_changed() returns trigger language plpgsql security definer set search_path='' as $source$
declare row_data jsonb;rec record;subject uuid;club uuid;game uuid;
begin
 if tg_op='DELETE' then row_data:=to_jsonb(old);else row_data:=to_jsonb(new);end if;
 case tg_table_name
 when 'badge_events' then subject:=(row_data->>'athlete')::uuid;club:=(row_data->>'team')::uuid;
 when 'badge_rec' then subject:=(row_data->>'recipient')::uuid;select team into club from public.beta_matches where id=(row_data->>'match_id')::uuid;
 when 'badge_attendance','beta_checks' then
 select squad,athlete into club,subject from public.beta_assignments where id=coalesce(row_data->>'assignment',row_data->>'id')::uuid;
 when 'match_participants','player_match_statistics' then game:=(row_data->>'match_id')::uuid;
 when 'badge_links' then subject:=(row_data->>'athlete')::uuid;select team into club from public.beta_team_seasons where id=(row_data->>'reg')::uuid;
 end case;
 if game is not null then
  for rec in select distinct g.team,l.athlete from public.beta_matches g join nhf_private.badge_links l on l.reg=g.registration where g.id=game
  loop perform nhf_private.refresh_badges(rec.team,rec.athlete);end loop;
 elsif club is not null and subject is not null and exists(select from public.beta_members where id=subject) then perform nhf_private.refresh_badges(club,subject);
 end if;
 return null;
end $source$;
revoke all on function nhf_private.badge_source_changed() from public,anon,authenticated;
create trigger earned_event after insert or update or delete on nhf_private.badge_events for each row execute function nhf_private.badge_source_changed();
create trigger earned_rec after insert or update or delete on nhf_private.badge_rec for each row execute function nhf_private.badge_source_changed();
create trigger earned_check after insert or update or delete on public.beta_checks for each row execute function nhf_private.badge_source_changed();
create trigger earned_attendance after insert or update or delete on nhf_private.badge_attendance for each row execute function nhf_private.badge_source_changed();
create trigger earned_link after insert or update or delete on nhf_private.badge_links for each row execute function nhf_private.badge_source_changed();
create constraint trigger earned_participant after insert or update or delete on nhf_private.match_participants deferrable initially deferred for each row execute function nhf_private.badge_source_changed();
create constraint trigger earned_match_stat after insert or update or delete on nhf_private.player_match_statistics deferrable initially deferred for each row execute function nhf_private.badge_source_changed();

