create table nhf_private.team_admins (
 team uuid references public.beta_teams on delete cascade, coach uuid references public.beta_members on delete cascade,
 primary key(team,coach)
);
revoke all on nhf_private.team_admins from public,anon,authenticated;
-- Seed one admin per existing team; prefer a home-team coach. Never grant global admin.
insert into nhf_private.team_admins
 select distinct on (team) team,coach from (
   select squad team,id coach,0 priority from public.beta_members where role='coach'
   union all select team,coach,1 from nhf_private.extra_coaches
 ) staff order by team,priority,coach;
create function nhf_private.first_admin() returns trigger language plpgsql security definer set search_path='' as $$
declare t uuid;c uuid;
begin
 if tg_table_name='beta_members' then if new.role<>'coach' then return new;end if;t:=new.squad;c:=new.id;
 else t:=new.team;c:=new.coach;end if;
 perform 1 from public.beta_teams where id=t for update;
 if not exists(select from nhf_private.team_admins where team=t) then insert into nhf_private.team_admins values(t,c);end if;
 return new;
end $$;
revoke all on function nhf_private.first_admin() from public,anon,authenticated;
create trigger first_home_admin after insert on public.beta_members for each row execute function nhf_private.first_admin();
create trigger first_additional_admin after insert on nhf_private.extra_coaches for each row execute function nhf_private.first_admin();
create function nhf_private.admin_of(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select nhf_private.coaches(t) and exists(select from nhf_private.team_admins where team=t and coach=auth.uid())
$$;
revoke all on function nhf_private.admin_of(uuid) from public,anon,authenticated;
create or replace function nhf_private.invite(team_id uuid,address text,member_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare code uuid;
begin
 if not nhf_private.coaches(team_id) or (member_role='coach' and not nhf_private.admin_of(team_id)) then raise exception 'Only an admin coach can invite coaching staff';end if;
 if address is null or length(address)>254 or position('@' in address)<2 then raise exception 'Enter an email address';end if;
 insert into nhf_private.invites(team,email,role) values(team_id,lower(trim(address)),member_role) returning token into code;return code;
end $$;

-- Membership is revocable, but historical training, receipts and messages belong to the team.
alter table public.beta_assignments drop constraint beta_assignments_athlete_squad_recipient_role_fkey,
 add foreign key(athlete) references auth.users on delete cascade, add foreign key(squad) references public.beta_teams on delete cascade;
alter table public.beta_notices drop constraint beta_notices_athlete_squad_member_role_fkey,
 add foreign key(athlete) references auth.users on delete cascade;
alter table public.beta_team_messages drop constraint beta_team_messages_athlete_team_recipient_role_fkey,
 drop constraint beta_team_messages_sender_fkey,add foreign key(athlete) references auth.users on delete cascade,
 add foreign key(sender) references auth.users on delete cascade;
create function nhf_private.active_recipient() returns trigger language plpgsql set search_path='' as $$
declare t uuid;
begin
 if tg_table_name='beta_team_messages' then t:=new.team;else t:=new.squad;end if;
 if not exists(select from public.beta_members where id=new.athlete and squad=t and role='athlete') then raise exception 'Recipient is not an athlete on this team';end if;
 return new;
end $$;
revoke all on function nhf_private.active_recipient() from public,anon,authenticated;
create trigger active_assignee before insert on public.beta_assignments for each row execute function nhf_private.active_recipient();
create trigger active_notice_recipient before insert on public.beta_notices for each row execute function nhf_private.active_recipient();
create trigger active_message_recipient before insert on public.beta_team_messages for each row execute function nhf_private.active_recipient();
alter policy schedule on public.beta_assignments using (nhf_private.coaches(squad) or (athlete=auth.uid() and exists(select from public.beta_members m where m.id=auth.uid() and m.squad=beta_assignments.squad and m.role='athlete')));
alter policy thread_read on public.beta_team_messages using(nhf_private.coaches(team) or (athlete=auth.uid() and exists(select from public.beta_members m where m.id=auth.uid() and m.squad=beta_team_messages.team and m.role='athlete')));
alter policy notice_read on public.beta_notices using(nhf_private.coaches(squad) or (athlete=auth.uid() and starts_on<=(now() at time zone 'Europe/Oslo')::date and exists(select from public.beta_members m where m.id=auth.uid() and m.squad=beta_notices.squad and m.role='athlete')));

create function nhf_private.manage_staff(action text,t uuid,person uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.beta_members;other_team uuid;
begin
 if action is null or action not in ('list','promote','demote','remove') then raise exception 'Invalid staff action';end if;
 if not nhf_private.coaches(t) then raise exception 'Coach access required';end if;
 if action='list' then return coalesce((select jsonb_agg(coach) from nhf_private.team_admins where team=t),'[]');end if;
 perform 1 from public.beta_teams where id=t for update;
 if not nhf_private.coaches(t) then raise exception 'Coach access required';end if;
 select * into strict m from public.beta_members where id=person and (squad=t or exists(select from nhf_private.extra_coaches c where c.coach=person and c.team=t)) for update;
 if m.role='coach' and not nhf_private.admin_of(t) then raise exception 'Admin coach required';end if;
 if action='promote' and m.role='coach' then insert into nhf_private.team_admins values(t,person) on conflict do nothing;return 'true';end if;
 if action not in ('remove','demote') or (action='demote' and m.role<>'coach') then raise exception 'Invalid staff action';end if;
 if exists(select from nhf_private.team_admins where team=t and coach=person) then
   if not exists(select from nhf_private.team_admins where team=t and coach<>person) then raise exception 'Promote another admin coach first';end if;
   delete from nhf_private.team_admins where team=t and coach=person;
 end if;
 if action='demote' then return 'true';end if;
 delete from nhf_private.invites where team=t and email=(select lower(email) from auth.users where id=person);
 delete from public.beta_applications where team=t and beta_applications.person=m.id;
 if m.role='athlete' then delete from nhf_private.join_codes where team=t;end if;
 if m.squad=t then
   select c.team into other_team from nhf_private.extra_coaches c where c.coach=person and c.team<>t order by c.team limit 1;
   if other_team is null then delete from public.beta_members where id=person;
   else update public.beta_members set squad=other_team where id=person;delete from nhf_private.extra_coaches where coach=person and team=other_team;end if;
 end if;
 delete from nhf_private.extra_coaches where coach=person and team=t;
 return 'true';
end $$;
create function public.beta_staff(action text,t uuid,person uuid default null) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.manage_staff(action,t,person)$$;
revoke all on function public.beta_staff(text,uuid,uuid),nhf_private.manage_staff(text,uuid,uuid) from public,anon;
grant execute on function public.beta_staff(text,uuid,uuid),nhf_private.manage_staff(text,uuid,uuid) to authenticated;
