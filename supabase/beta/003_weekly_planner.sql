begin;
create table public.beta_exercises (
  id uuid primary key, squad uuid not null,
  name text not null check(length(trim(name)) between 1 and 100),
  dose text not null check(length(trim(dose)) between 1 and 100),
  region text not null check(region in ('Upper body','Core','Lower body','Full body','Conditioning','Mobility','Unclassified'))
);
alter table public.beta_exercises enable row level security;
revoke all on public.beta_exercises from public,anon,authenticated;
grant select,insert on public.beta_exercises to authenticated;
create policy exercise_library on public.beta_exercises for all to authenticated
using(nhf_private.coaches(squad)) with check(nhf_private.coaches(squad));
alter table public.beta_programs add column kind text not null default 'program' check(kind in ('program','session'));
alter table public.beta_assignments
  add column kind text not null default 'Session' check(kind in ('Session','Game','Practice')),
  add column start_time time,
  add column minutes integer check(minutes between 1 and 600);
grant insert(kind,start_time,minutes) on public.beta_assignments to authenticated;
commit;
