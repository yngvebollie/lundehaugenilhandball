create table public.beta_live_match_logs (
  id uuid primary key,
  team uuid not null references public.beta_teams(id) on delete cascade,
  revision integer not null check (revision > 0),
  write_id uuid not null,
  document jsonb not null check (
    jsonb_typeof(document) = 'object'
    and document ?& array['home', 'away', 'clock', 'players', 'events']
    and jsonb_typeof(document->'players') = 'array'
    and jsonb_typeof(document->'events') = 'array'
  ),
  created_at timestamptz not null default now()
);

create index beta_live_match_logs_team_created_idx
  on public.beta_live_match_logs(team, created_at desc, id);

alter table public.beta_live_match_logs enable row level security;
revoke all on public.beta_live_match_logs from public, anon, authenticated;
grant select, insert(id, team, revision, write_id, document),
  update(revision, write_id, document) on public.beta_live_match_logs to authenticated;

create policy live_match_read on public.beta_live_match_logs for select to authenticated
  using (nhf_private.coaches(team));
create policy live_match_create on public.beta_live_match_logs for insert to authenticated
  with check (nhf_private.coaches(team));
create policy live_match_edit on public.beta_live_match_logs for update to authenticated
  using (nhf_private.coaches(team)) with check (nhf_private.coaches(team));
