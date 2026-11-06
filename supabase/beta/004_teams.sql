begin;
create table public.beta_teams(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 80));
insert into public.beta_teams select distinct squad,'Squad '||left(squad::text,8) from public.beta_members;
alter table public.beta_members add constraint beta_home_team foreign key(squad) references public.beta_teams;
alter table public.beta_members add column position text not null default '' check(length(position)<=80),
 add column bio text not null default '' check(length(bio)<=500),
 add column photo text not null default '' check(photo='' or (length(photo)<=120000 and photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'));
grant update(name,position,bio,photo) on public.beta_members to authenticated;
create policy self_profile on public.beta_members for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create table nhf_private.extra_coaches(coach uuid references public.beta_members on delete cascade, team uuid references public.beta_teams, primary key(coach,team));
create or replace function nhf_private.coaches(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.beta_members m where m.id=(select auth.uid()) and m.role='coach' and (m.squad=target or exists(select from nhf_private.extra_coaches c where c.coach=m.id and c.team=target)))
$$;
alter table public.beta_teams enable row level security;
revoke all on public.beta_teams from public,anon,authenticated;
grant select,update(name) on public.beta_teams to authenticated;
create policy visible_teams on public.beta_teams for select to authenticated using(nhf_private.coaches(id) or exists(select from public.beta_members m where m.id=(select auth.uid()) and m.squad=beta_teams.id));
create policy rename_team on public.beta_teams for update to authenticated using(nhf_private.coaches(id)) with check(nhf_private.coaches(id));
create function nhf_private.team_roster(team_id uuid) returns setof public.beta_members
language sql stable security definer set search_path='' as $$
 select m.* from public.beta_members m where nhf_private.coaches(team_id) and
 (m.squad=team_id or exists(select from nhf_private.extra_coaches c where c.team=team_id and c.coach=m.id))
$$;
create function public.beta_team_roster(team_id uuid) returns setof public.beta_members
 language sql stable security invoker as $$select * from nhf_private.team_roster(team_id)$$;
revoke all on function nhf_private.team_roster(uuid),public.beta_team_roster(uuid) from public,anon;
grant execute on function nhf_private.team_roster(uuid),public.beta_team_roster(uuid) to authenticated;
alter table public.beta_assignments add column personal boolean not null default false;
grant insert(personal) on public.beta_assignments to authenticated;
create policy own_plan on public.beta_assignments for insert to authenticated with check(personal and athlete=(select auth.uid()));

create table nhf_private.invites(token uuid primary key default gen_random_uuid(),team uuid not null references public.beta_teams,
 email text not null, role text not null check(role in ('coach','athlete')), expires timestamptz not null default now()+interval '7 days');
revoke all on nhf_private.extra_coaches,nhf_private.invites from public,anon,authenticated;
create function nhf_private.new_team(label text) returns uuid language plpgsql security definer set search_path='' as $$
declare team_id uuid;
begin
 if not exists(select from public.beta_members where id=auth.uid() and role='coach') then raise exception 'Coach access required'; end if;
 insert into public.beta_teams(name) values(trim(label)) returning id into team_id;
 insert into nhf_private.extra_coaches values(auth.uid(),team_id);
 return team_id;
end $$;
create function nhf_private.invite(team_id uuid, address text, member_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare code uuid;
begin
 if not nhf_private.coaches(team_id) then raise exception 'Coach access required'; end if;
 if address is null or length(address)>254 or position('@' in address)<2 then raise exception 'Enter an email address'; end if;
 insert into nhf_private.invites(team,email,role) values(team_id,lower(trim(address)),member_role) returning token into code;
 return code;
end $$;
create function nhf_private.join_team(code uuid, display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation nhf_private.invites; member public.beta_members;
begin
 select * into invitation from nhf_private.invites where token=code and expires>now() for update;
 if not found or not exists(select from auth.users where id=auth.uid() and email_confirmed_at is not null and lower(email)=invitation.email) then raise exception 'Use the verified account this invitation was sent to, or request a new invitation'; end if;
 if length(trim(display_name)) not between 1 and 100 then raise exception 'Enter your name'; end if;
 insert into public.beta_members(id,squad,name,role) values(auth.uid(),invitation.team,trim(display_name),invitation.role) on conflict(id) do nothing;
 select * into strict member from public.beta_members where id=auth.uid() for update;
 if member.role<>invitation.role or (member.role='athlete' and member.squad<>invitation.team) then raise exception 'This account already has a different role or athlete team'; end if;
 if member.role='coach' and member.squad<>invitation.team then insert into nhf_private.extra_coaches values(member.id,invitation.team) on conflict do nothing; end if;
 delete from nhf_private.invites where token=code;
 return invitation.team;
end $$;
create function public.beta_new_team(label text) returns uuid language sql security invoker as $$select nhf_private.new_team(label)$$;
create function public.beta_invite(team_id uuid,address text,member_role text) returns uuid language sql security invoker as $$select nhf_private.invite(team_id,address,member_role)$$;
create function public.beta_join(code uuid,display_name text) returns uuid language sql security invoker as $$select nhf_private.join_team(code,display_name)$$;
revoke all on function nhf_private.new_team(text),nhf_private.invite(uuid,text,text),nhf_private.join_team(uuid,text),public.beta_new_team(text),public.beta_invite(uuid,text,text),public.beta_join(uuid,text) from public,anon;
grant execute on function nhf_private.new_team(text),nhf_private.invite(uuid,text,text),nhf_private.join_team(uuid,text),public.beta_new_team(text),public.beta_invite(uuid,text,text),public.beta_join(uuid,text) to authenticated;
commit;
