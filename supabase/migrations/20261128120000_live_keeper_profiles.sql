create table public.beta_live_keeper_profiles (
 id uuid primary key default gen_random_uuid(),
 team uuid not null references public.beta_teams(id) on delete cascade,
 name text not null check (name = trim(name) and char_length(name) between 1 and 100),
 athlete uuid references public.beta_members(id) on delete set null
);

create index live_keeper_profiles_team on public.beta_live_keeper_profiles(team);
alter table public.beta_live_keeper_profiles enable row level security;
revoke all on public.beta_live_keeper_profiles from public, anon, authenticated;
grant select, insert(team, name), update(athlete) on public.beta_live_keeper_profiles to authenticated;

create policy live_keeper_read on public.beta_live_keeper_profiles for select to authenticated
 using (nhf_private.coaches(team));
create policy live_keeper_create on public.beta_live_keeper_profiles for insert to authenticated
 with check (nhf_private.coaches(team) and athlete is null);
create policy live_keeper_link on public.beta_live_keeper_profiles for update to authenticated
 using (nhf_private.coaches(team) and athlete is null)
 with check (nhf_private.coaches(team) and exists (
  select 1 from public.beta_members member
  where member.id = beta_live_keeper_profiles.athlete
   and member.squad = beta_live_keeper_profiles.team and member.role = 'athlete'
 ));
