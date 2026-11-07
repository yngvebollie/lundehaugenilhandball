create table public.beta_focus_members (
  squad uuid not null references public.beta_teams on delete cascade,
  athlete uuid not null,
  member_role text not null default 'athlete' check (member_role='athlete'),
  focus text not null check (focus in ('feet','jump','shot')),
  primary key (squad,focus,athlete),
  foreign key (athlete,squad,member_role) references public.beta_members(id,squad,role) on delete cascade
);
create index beta_focus_athlete on public.beta_focus_members(athlete,squad,member_role);
alter table public.beta_focus_members enable row level security;
revoke all on public.beta_focus_members from public,anon,authenticated;
grant select, insert(squad,athlete,focus), delete on public.beta_focus_members to authenticated;
create policy focus_read on public.beta_focus_members for select to authenticated using (nhf_private.coaches(squad));
create policy focus_add on public.beta_focus_members for insert to authenticated with check (nhf_private.coaches(squad));
create policy focus_remove on public.beta_focus_members for delete to authenticated using (nhf_private.coaches(squad));
