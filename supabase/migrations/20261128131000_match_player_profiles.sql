create table public.beta_match_player_profiles (
 id uuid primary key default gen_random_uuid(),
 team uuid not null references public.beta_teams(id) on delete cascade,
 name text not null check (name = trim(name) and char_length(name) between 1 and 150),
 name_key text generated always as (lower(regexp_replace(name, '[[:space:]]+', ' ', 'g'))) stored,
 number smallint check (number between 0 and 99),
 athlete uuid references public.beta_members(id) on delete set null,
 unique (team, name_key)
);
alter table public.beta_match_player_profiles enable row level security;
revoke all on public.beta_match_player_profiles from public, anon, authenticated;
grant select, insert(team,name), update(number,athlete) on public.beta_match_player_profiles to authenticated;
create policy match_profiles_read on public.beta_match_player_profiles for select to authenticated
 using (nhf_private.coaches(team));
create policy match_profiles_create on public.beta_match_player_profiles for insert to authenticated
 with check (nhf_private.coaches(team) and athlete is null and number is null);
create policy match_profiles_edit on public.beta_match_player_profiles for update to authenticated
 using (nhf_private.coaches(team) and athlete is null)
 with check (nhf_private.coaches(team) and (athlete is null or exists (
  select 1 from public.beta_members m where m.id=beta_match_player_profiles.athlete
   and m.squad=beta_match_player_profiles.team and m.role='athlete'
 )));
