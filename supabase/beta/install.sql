-- Install once in a fresh Supabase project. Provision members from the SQL editor.
begin;
create schema if not exists nhf_private;
revoke all on schema nhf_private from public;
grant usage on schema nhf_private to authenticated;
create table public.beta_members (
  id uuid primary key references auth.users on delete cascade,
  squad uuid not null,
  name text not null,
  role text not null check (role in ('coach','athlete')),
  unique(id,squad,role)
);
-- Private membership lookup avoids recursive roster policies.
create function nhf_private.coaches(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.beta_members where id = (select auth.uid()) and squad=target and role='coach')
$$;
revoke all on function nhf_private.coaches(uuid) from public;
grant execute on function nhf_private.coaches(uuid) to authenticated;
create table public.beta_assignments (
  id uuid primary key,
  squad uuid not null,
  athlete uuid not null,
  recipient_role text not null default 'athlete' check(recipient_role='athlete'),
  foreign key (athlete,squad,recipient_role) references public.beta_members(id,squad,role) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 100),
  day date not null,
  exercises text[] not null check(cardinality(exercises) between 1 and 40 and array_ndims(exercises)=1 and array_lower(exercises,1)=1 and array_position(exercises,null) is null),
  created_at timestamptz not null default now()
);
create index beta_schedule on public.beta_assignments(athlete,day);
create table public.beta_checks (
  assignment uuid references public.beta_assignments on delete cascade,
  step integer check(step between 0 and 39),
  primary key(assignment,step)
);
alter table public.beta_members enable row level security;
alter table public.beta_assignments enable row level security;
alter table public.beta_checks enable row level security;
revoke all on public.beta_members,public.beta_assignments,public.beta_checks from anon,authenticated,public;
grant select on public.beta_members,public.beta_assignments,public.beta_checks to authenticated;
grant insert(id,squad,athlete,title,day,exercises) on public.beta_assignments to authenticated;
grant insert(assignment,step) on public.beta_checks to authenticated;
create policy roster on public.beta_members for select to authenticated using(id=(select auth.uid()) or nhf_private.coaches(squad));
create policy schedule on public.beta_assignments for select to authenticated using(athlete=(select auth.uid()) or nhf_private.coaches(squad));
create policy publish on public.beta_assignments for insert to authenticated with check(nhf_private.coaches(squad));
create policy visible_checks on public.beta_checks for select to authenticated using(exists(select 1 from public.beta_assignments a where a.id=assignment));
create policy complete_step on public.beta_checks for insert to authenticated with check(exists(select 1 from public.beta_assignments a where a.id=assignment and a.athlete=(select auth.uid()) and step<cardinality(a.exercises)));
commit;
