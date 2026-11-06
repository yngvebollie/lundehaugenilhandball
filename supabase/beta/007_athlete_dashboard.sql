begin;
create table public.beta_team_messages (
 id uuid primary key default gen_random_uuid(),team uuid not null references public.beta_teams,athlete uuid not null,
 recipient_role text not null default 'athlete' check(recipient_role='athlete'),
 foreign key(athlete,team,recipient_role) references public.beta_members(id,squad,role) on delete cascade,
 sender uuid not null default auth.uid() references public.beta_members, body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now()
);
create index beta_conversations on public.beta_team_messages(team,athlete,created_at);
alter table public.beta_team_messages enable row level security;
revoke all on public.beta_team_messages from public,anon,authenticated;
grant select,insert(team,athlete,body) on public.beta_team_messages to authenticated;
create policy thread_read on public.beta_team_messages for select to authenticated using(nhf_private.coaches(team) or athlete=auth.uid());
create policy thread_send on public.beta_team_messages for insert to authenticated with check(sender=auth.uid() and (nhf_private.coaches(team) or athlete=auth.uid()));
create function nhf_private.directory(target uuid) returns table(id uuid,name text,role text,photo text,playing_position text)
language sql stable security definer set search_path='' as $$
 select m.id,m.name,m.role,m.photo,m.position from public.beta_members m
 where (nhf_private.coaches(target) or exists(select from public.beta_members current_member where current_member.id=auth.uid() and current_member.squad=target))
 and (m.squad=target or exists(select from nhf_private.extra_coaches c where c.team=target and c.coach=m.id))
$$;
create function public.beta_directory(target uuid) returns table(id uuid,name text,role text,photo text,playing_position text)
language sql stable security invoker as $$ select * from nhf_private.directory(target) $$;
revoke all on function nhf_private.directory(uuid),public.beta_directory(uuid) from public,anon;
grant execute on function nhf_private.directory(uuid),public.beta_directory(uuid) to authenticated;
commit;
