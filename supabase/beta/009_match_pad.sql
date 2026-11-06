begin;
create table public.beta_matches (
 id uuid primary key,team uuid not null references public.beta_teams,opponent text not null check(length(trim(opponent)) between 1 and 100),
 day date not null,lineup uuid[] not null check(cardinality(lineup) between 1 and 50),created_at timestamptz not null default now()
);
create table public.beta_shots (
 id uuid primary key,match_id uuid not null references public.beta_matches on delete cascade,shooter uuid not null,assist uuid,
 outcome text not null check(outcome in ('Goal','Saved','Missed','Blocked')),x int not null check(x between 0 and 100),y int not null check(y between 0 and 100),
 gx int check(gx between 0 and 100),gy int check(gy between 0 and 100), created_at timestamptz default now() not null,
 check(assist is null or (outcome='Goal' and assist<>shooter)),check((gx is null)=(gy is null)),
 check(outcome not in ('Goal','Saved') or gx is not null)
);
create index match_team_day on public.beta_matches(team,day);
create index shot_log on public.beta_shots(match_id,created_at);
alter table public.beta_matches enable row level security;
alter table public.beta_shots enable row level security;
revoke all on public.beta_matches,public.beta_shots from public,anon,authenticated;
grant select,insert(id,team,opponent,day,lineup) on public.beta_matches to authenticated;
grant select,delete,insert(id,match_id,shooter,assist,outcome,x,y,gx,gy) on public.beta_shots to authenticated;
create policy match_read on public.beta_matches for select to authenticated using(nhf_private.coaches(team));
create policy match_create on public.beta_matches for insert to authenticated with check(nhf_private.coaches(team) and
 cardinality(lineup)=(select count(*) from public.beta_members m where m.squad=team and m.role='athlete' and m.id=any(lineup)));
create policy shot_read on public.beta_shots for select to authenticated using(exists(select from public.beta_matches m where m.id=match_id));
create policy shot_remove on public.beta_shots for delete to authenticated using(exists(select from public.beta_matches m where m.id=match_id));
create policy shot_create on public.beta_shots for insert to authenticated with check(exists(select from public.beta_matches m where m.id=match_id and shooter=any(m.lineup) and (assist is null or assist=any(m.lineup))));
commit;
