begin;
create table public.beta_exercise_usage (
 coach uuid not null references public.beta_members on delete cascade,
 exercise_key text not null check(length(exercise_key) between 1 and 150),
 uses integer not null check(uses>0), last_used timestamptz not null,
 primary key(coach,exercise_key)
);
alter table public.beta_exercise_usage enable row level security;
revoke all on public.beta_exercise_usage from public,anon,authenticated;
grant select,insert,update(uses,last_used) on public.beta_exercise_usage to authenticated;
create policy own_usage on public.beta_exercise_usage for all to authenticated
using(coach=(select auth.uid()) and exists(select from public.beta_members where id=(select auth.uid()) and role='coach'))
with check(coach=(select auth.uid()) and exists(select from public.beta_members where id=(select auth.uid()) and role='coach'));
create function public.beta_used(item text) returns void language sql security invoker set search_path='' as $$
 insert into public.beta_exercise_usage as u values(auth.uid(),item,1,now())
 on conflict(coach,exercise_key) do update set uses=u.uses+1,last_used=now()
$$;
revoke all on function public.beta_used(text) from public,anon;
grant execute on function public.beta_used(text) to authenticated;
commit;
