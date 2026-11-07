-- Older clients explicitly send active=true. Keep the admin + active-season INSERT policy.
grant insert(active) on public.beta_team_seasons to authenticated;
