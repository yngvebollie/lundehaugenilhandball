create table public.beta_opponent_watches (
  team uuid not null references public.beta_teams on delete cascade,
  season integer not null check (season>0),
  org_id integer not null check (org_id>0),
  name text not null check (length(name) between 1 and 150),
  leagues integer[] not null default '{}' check (cardinality(leagues)<=20),
  fixtures jsonb not null default '[]' check (jsonb_typeof(fixtures)='array' and jsonb_array_length(fixtures)<=1000),
  synced_at timestamptz not null default now(),
  primary key(team,season,org_id)
);
alter table public.beta_opponent_watches enable row level security;
revoke all on public.beta_opponent_watches from public,anon,authenticated;
grant select,insert,update,delete on public.beta_opponent_watches to authenticated;
create policy opponent_watch_access on public.beta_opponent_watches for all to authenticated
using (nhf_private.coaches(team)) with check (nhf_private.coaches(team));
