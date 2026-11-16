create table public.beta_cups(
 id uuid primary key default gen_random_uuid(), team uuid not null, registration uuid not null,
 name text not null check(length(trim(name)) between 1 and 100),
 foreign key(team,registration) references public.beta_team_seasons(team,id) on delete cascade,unique(team,id)
);
create index beta_cups_registration_idx on public.beta_cups(registration);
create table public.beta_cup_games(
 id uuid primary key default gen_random_uuid(),team uuid not null,cup uuid not null,
 opponent text not null check(length(trim(opponent)) between 1 and 100),day date not null,
 stage text not null check(stage in ('Gruppespill','1/16-finale','1/8-finale','Kvartfinale','Semifinale','Finale')),
 bracket text not null default '' check(bracket in ('','A','B') and (stage<>'Gruppespill' or bracket='')),
 lineup uuid[] not null default '{}', scored integer check(scored between 0 and 999), conceded integer check(conceded between 0 and 999),
 check ((scored is null)=(conceded is null)), check(cardinality(lineup)<=100),
 foreign key(team,cup) references public.beta_cups(team,id) on delete cascade
);
create index beta_cup_games_cup_day_idx on public.beta_cup_games(cup,day);
alter table public.beta_cups enable row level security;
alter table public.beta_cup_games enable row level security;
revoke all on public.beta_cups,public.beta_cup_games from public,anon,authenticated;
grant select,insert(team,registration,name) on public.beta_cups to authenticated;
grant select,insert(team,cup,day,opponent,stage,bracket,lineup,scored,conceded),update(day,opponent,stage,bracket,lineup,scored,conceded) on public.beta_cup_games to authenticated;
create policy cup_read on public.beta_cups for select to authenticated using(nhf_private.coaches(team));
create policy cup_add on public.beta_cups for insert to authenticated with check(nhf_private.coaches(team));
create policy cup_game_read on public.beta_cup_games for select to authenticated using(nhf_private.coaches(team));
create function nhf_private.cup_lineup(t uuid,players uuid[]) returns boolean language sql stable security invoker set search_path='' as $$
 select nhf_private.coaches(t) and cardinality(players)=(select count(*) from public.beta_members m where m.squad=t and m.role='athlete' and m.id=any(players))
$$;
revoke all on function nhf_private.cup_lineup(uuid,uuid[]) from public,anon;
grant execute on function nhf_private.cup_lineup(uuid,uuid[]) to authenticated;
create policy cup_game_add on public.beta_cup_games for insert to authenticated with check(nhf_private.cup_lineup(team,lineup));
create policy cup_game_edit on public.beta_cup_games for update to authenticated using(nhf_private.coaches(team)) with check(nhf_private.cup_lineup(team,lineup));
