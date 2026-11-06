begin;
alter table public.beta_assignments add column program_name text check(length(program_name) between 1 and 100);
grant insert(program_name) on public.beta_assignments to authenticated;
create table public.beta_programs (
 id uuid primary key, squad uuid not null, name text not null check(length(trim(name)) between 1 and 100),
 sessions jsonb not null check(jsonb_typeof(sessions)='array' and jsonb_array_length(sessions) between 1 and 56)
);
create table public.beta_feedback (
 assignment uuid primary key references public.beta_assignments on delete cascade,
 effort text not null check(effort in ('Easy','Just right','Hard'))
);
alter table public.beta_programs enable row level security;
alter table public.beta_feedback enable row level security;
revoke all on public.beta_programs,public.beta_feedback from anon,authenticated,public;
grant select,insert on public.beta_programs,public.beta_feedback to authenticated;
grant update(name,sessions) on public.beta_programs to authenticated;
grant update(effort) on public.beta_feedback to authenticated;
grant delete on public.beta_checks to authenticated;
create policy programs on public.beta_programs for all to authenticated using(nhf_private.coaches(squad)) with check(nhf_private.coaches(squad));
create policy ratings_read on public.beta_feedback for select to authenticated using(exists(select from public.beta_assignments a where a.id=assignment));
create policy ratings_insert on public.beta_feedback for insert to authenticated with check(exists(select from public.beta_assignments a where a.id=assignment and a.athlete=(select auth.uid())));
create policy ratings_update on public.beta_feedback for update to authenticated using(exists(select from public.beta_assignments a where a.id=assignment and a.athlete=(select auth.uid()))) with check(exists(select from public.beta_assignments a where a.id=assignment and a.athlete=(select auth.uid())));
create policy undo_check on public.beta_checks for delete to authenticated using(exists(select from public.beta_assignments a where a.id=assignment and a.athlete=(select auth.uid())));
commit;
