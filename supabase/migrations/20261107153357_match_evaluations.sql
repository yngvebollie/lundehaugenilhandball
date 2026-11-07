create table public.beta_team_seasons(
 id uuid primary key default gen_random_uuid(), team uuid not null references public.beta_teams on delete cascade,
 org_id integer not null check(org_id>0), season integer not null check(season>0), tournament integer check(tournament>0),
 active boolean not null default true, synced_at timestamptz, sync_result text,
 unique(team,org_id,season), unique(team,id)
);
alter table public.beta_team_seasons enable row level security;
revoke all on public.beta_team_seasons from public,anon,authenticated;
grant select,insert(team,org_id,season,tournament),update(active,tournament) on public.beta_team_seasons to authenticated;
grant select,update(synced_at,sync_result) on public.beta_team_seasons to service_role;
create policy season_read on public.beta_team_seasons for select to authenticated using(nhf_private.coaches(team));
create policy season_add on public.beta_team_seasons for insert to authenticated with check(nhf_private.admin_of(team));
create policy season_manage on public.beta_team_seasons for update to authenticated using(nhf_private.admin_of(team)) with check(nhf_private.admin_of(team));
grant execute on function nhf_private.admin_of(uuid) to authenticated;
alter table public.beta_matches drop constraint beta_matches_lineup_check, add check(cardinality(lineup) between 0 and 50),
 add column registration uuid, add foreign key(team,registration) references public.beta_team_seasons(team,id),
 add column nif_id integer, add column home text, add column away text, add column start_time time,
 add column competition text, add column age_class text, add column venue text, add column score text,
 add column status text not null default 'Planlagt', add column completed boolean not null default false,
 add unique(registration,nif_id), add unique(team,id);
create table nhf_private.match_players(
 id uuid primary key default gen_random_uuid(), nif_person_id bigint unique,
 name text not null check(length(trim(name)) between 1 and 150),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table nhf_private.match_participants(
 match_id uuid not null,team uuid not null,player_id uuid not null references nhf_private.match_players,
 shirt_number text,position text, nif_played boolean, local_played boolean,nif_best_player boolean,
 nif_present boolean,discrepancy boolean not null default false,updated_at timestamptz not null default now(),created_at timestamptz not null default now(),
 primary key(match_id,player_id),foreign key(team,match_id) references public.beta_matches(team,id) on delete cascade
);
create table nhf_private.player_match_statistics(
 match_id uuid not null,player_id uuid not null, shots_hit integer not null default 0 check(shots_hit>=0),
 shots_missed integer not null default 0 check(shots_missed>=0),technical_errors integer not null default 0 check(technical_errors>=0),
 goalkeeper_saves integer not null default 0 check(goalkeeper_saves>=0),rating integer check(rating between 1 and 5),
 notes text check(length(notes)<=500),is_best_player boolean not null default false,
 created_by uuid references auth.users on delete set null,updated_by uuid references auth.users on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(match_id,player_id),foreign key(match_id,player_id) references nhf_private.match_participants on delete cascade
);
-- Each beta_matches row evaluates exactly one team's side, even in a club derby.
create unique index match_one_award on nhf_private.player_match_statistics(match_id) where is_best_player;
grant select(nif_id,registration) on public.beta_matches to service_role;
create index participants_team_player on nhf_private.match_participants(team,player_id);
create table nhf_private.match_audit(at timestamptz default now(),actor uuid,team uuid,match_id uuid,action text not null);
revoke all on nhf_private.match_players,nhf_private.match_participants,nhf_private.player_match_statistics,nhf_private.match_audit from public,anon,authenticated;
create function nhf_private.match_action(action text,t uuid,m uuid,p uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; label text; rec public.beta_matches;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Coach access required';end if;
 if action='counts' then return coalesce((select jsonb_object_agg(match_id,n) from
 (select s.match_id,count(*) n from nhf_private.player_match_statistics s join public.beta_matches x on x.id=s.match_id where x.team=t group by s.match_id) q),'{}');end if;
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
   'catalog',coalesce((select jsonb_agg(to_jsonb(x)) from (select distinct b.id,b.name from nhf_private.match_players b join nhf_private.match_participants a on a.player_id=b.id where a.team=t) x),'[]'));
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
   if not exists(select from nhf_private.match_participants where match_id=m and player_id=p and coalesce(local_played,nif_played,false)) then raise exception 'Confirm participation first';end if;
   if (v->>'is_best_player')::boolean then update nhf_private.player_match_statistics set is_best_player=false,updated_at=now(),updated_by=auth.uid() where match_id=m and is_best_player and player_id<>p;end if;
   insert into nhf_private.player_match_statistics(match_id,player_id,shots_hit,shots_missed,technical_errors,goalkeeper_saves,rating,notes,is_best_player,created_by,updated_by)
    values(m,p,(v->>'shots_hit')::int,(v->>'shots_missed')::int,(v->>'technical_errors')::int,(v->>'goalkeeper_saves')::int,(v->>'rating')::int,v->>'notes',(v->>'is_best_player')::boolean,auth.uid(),auth.uid())
    on conflict(match_id,player_id) do update set shots_hit=excluded.shots_hit,shots_missed=excluded.shots_missed,technical_errors=excluded.technical_errors,
    goalkeeper_saves=excluded.goalkeeper_saves,rating=excluded.rating,notes=excluded.notes,is_best_player=excluded.is_best_player,updated_by=auth.uid(),updated_at=now();
 elsif action='erase' and nhf_private.admin_of(t) then delete from nhf_private.player_match_statistics where match_id=m and player_id=p;
 else raise exception 'Unknown or unauthorized match action';end if;
 return 'true';
end $$;
create function public.beta_match_action(action text,t uuid,m uuid default null,p uuid default null,v jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select nhf_private.match_action(action,t,m,p,v)$$;
revoke all on function nhf_private.match_action(text,uuid,uuid,uuid,jsonb),public.beta_match_action(text,uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function nhf_private.match_action(text,uuid,uuid,uuid,jsonb),public.beta_match_action(text,uuid,uuid,uuid,jsonb) to authenticated;

-- A sync transaction cannot write to player_match_statistics. Absence never deletes a participant.
create function nhf_private.import_fixture(rid uuid,f jsonb,people jsonb,authoritative boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.beta_team_seasons;m uuid;pid uuid; item jsonb; seen uuid[]:='{}';
begin
 select * into strict r from public.beta_team_seasons where id=rid and active for update;
 insert into public.beta_matches(id,team,registration,nif_id,opponent,day,lineup,home,away,start_time,competition,age_class,venue,score,status,completed)
 values(gen_random_uuid(),r.team,r.id,(f->>'id')::int,f->>'opponent',(f->>'day')::date,'{}',f->>'home',f->>'away',(f->>'time')::time,f->>'competition',f->>'age',f->>'venue',f->>'score',f->>'status',(f->>'completed')::boolean)
 on conflict(registration,nif_id) do update set opponent=excluded.opponent,day=excluded.day,home=excluded.home,away=excluded.away,start_time=excluded.start_time,competition=excluded.competition,age_class=excluded.age_class,venue=excluded.venue,score=excluded.score,status=excluded.status,completed=excluded.completed returning id into m;
 for item in select value from jsonb_array_elements(people) loop
   insert into nhf_private.match_players(nif_person_id,name) values((item->>'id')::bigint,item->>'name')
   on conflict(nif_person_id) do update set name=excluded.name,updated_at=now() returning id into pid;
   seen:=array_append(seen,pid);
   insert into nhf_private.match_participants as a(team,match_id,player_id,shirt_number,position,nif_played,nif_best_player,nif_present)
   values(r.team,m,pid,item->>'number',item->>'position',(item->>'played')::boolean,(item->>'best')::boolean,(item->>'listed')::boolean)
   on conflict(match_id,player_id) do update set shirt_number=excluded.shirt_number,position=excluded.position,
    discrepancy=a.discrepancy or ((authoritative or excluded.nif_present) and
      ((a.nif_present is true and (a.nif_played is distinct from excluded.nif_played or not excluded.nif_present or
        a.position is distinct from excluded.position or a.shirt_number is distinct from excluded.shirt_number))
       or (excluded.nif_played is not null and a.local_played is not null and a.local_played<>excluded.nif_played))
      and (a.local_played is not null or exists(select from nhf_private.player_match_statistics where match_id=m and player_id=pid))),
    nif_played=case when authoritative or excluded.nif_present then excluded.nif_played else a.nif_played end,
    nif_best_player=case when authoritative or excluded.nif_present then excluded.nif_best_player else a.nif_best_player end,
    nif_present=case when authoritative or excluded.nif_present then excluded.nif_present else a.nif_present end,updated_at=now();
 end loop;
 if authoritative then update nhf_private.match_participants a set discrepancy=true,nif_played=null,nif_present=false,nif_best_player=null,updated_at=now()
   where match_id=m and nif_present and not(player_id=any(seen));end if;
 return m;
end $$;
create function public.beta_import_fixture(rid uuid,f jsonb,people jsonb,authoritative boolean) returns uuid language sql security invoker set search_path='' as $$select nhf_private.import_fixture(rid,f,people,authoritative)$$;
revoke all on function public.beta_import_fixture(uuid,jsonb,jsonb,boolean),nhf_private.import_fixture(uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant usage on schema nhf_private to service_role;
grant execute on function public.beta_import_fixture(uuid,jsonb,jsonb,boolean),nhf_private.import_fixture(uuid,jsonb,jsonb,boolean) to service_role;
create view nhf_private.match_season_totals as
 select a.team,m.registration,m.competition,a.player_id,count(*) matches_played,coalesce(sum(s.shots_hit),0) goals,coalesce(sum(s.shots_missed),0) missed,
 coalesce(sum(s.shots_hit+s.shots_missed),0) attempts,100.0*sum(s.shots_hit)/nullif(sum(s.shots_hit+s.shots_missed),0) shooting_percent,
 coalesce(sum(s.technical_errors),0) technical_errors,coalesce(sum(s.goalkeeper_saves),0) saves,avg(s.rating) rating,count(*) filter(where s.is_best_player) awards
 from nhf_private.match_participants a join public.beta_matches m on m.id=a.match_id left join nhf_private.player_match_statistics s using(match_id,player_id)
 where coalesce(a.local_played,a.nif_played,false) and m.completed and m.day<=(now() at time zone 'Europe/Oslo')::date
 group by a.team,m.registration,m.competition,a.player_id;
revoke all on nhf_private.match_season_totals from public,anon,authenticated;
