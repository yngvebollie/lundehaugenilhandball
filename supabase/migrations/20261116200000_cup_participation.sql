alter table public.beta_cup_games add column played uuid[] not null default '{}', add check(played <@ lineup and cardinality(played)<=cardinality(lineup));
grant insert(played),update(played) on public.beta_cup_games to authenticated;
