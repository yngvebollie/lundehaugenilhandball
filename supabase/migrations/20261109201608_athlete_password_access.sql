-- Service-only preflight. Client-supplied roles never authorize enrollment.
create table nhf_private.player_enroll_limits(k text primary key, hour timestamptz not null,n integer not null);
alter table nhf_private.player_enroll_limits enable row level security;
revoke all on nhf_private.player_enroll_limits from public,anon,authenticated;
create function public.beta_player_enroll_check(addr text,k text,cred text,ip_hash text) returns text language plpgsql security definer set search_path='' as $$
declare hits int; bucket text; hour_start timestamptz:=date_trunc('hour',now());
begin
 foreach bucket in array array['global',ip_hash] loop
  insert into nhf_private.player_enroll_limits as x values(bucket,hour_start,1) on conflict on constraint player_enroll_limits_pkey do update set hour=hour_start,n=case when x.hour=hour_start then x.n+1 else 1 end returning n into hits;
  if hits>(case when bucket='global' then 120 else 20 end) then return 'limit';end if;
 end loop;
 delete from nhf_private.player_enroll_limits where hour<hour_start-interval '2 hours';
 if k='email' and exists(select from nhf_private.invites where token::text=cred and role='coach' and email=addr and expires>now()) then return 'coach';end if;
 if not (k='none' or k='email' and exists(select from nhf_private.invites where token::text=cred and role='athlete' and email=addr and expires>now()) or k='link' and exists(select from nhf_private.application_links where token::text=cred and role='athlete' and expires>now()) or k='athlete_code' and exists(select from nhf_private.join_codes where code=cred and expires>now())) then return 'invalid';end if;
 if exists(select from auth.users where lower(email)=addr and email_confirmed_at is not null) then return 'existing';end if;
 return 'athlete';
end $$;
revoke all on function public.beta_player_enroll_check(text,text,text,text) from public,anon,authenticated;
grant execute on function public.beta_player_enroll_check(text,text,text,text) to service_role;

create table nhf_private.player_resets(
 player uuid primary key references auth.users on delete cascade,coach uuid not null references auth.users on delete cascade,team uuid not null references public.beta_teams on delete cascade,
 digest bytea not null unique,expires timestamptz not null);
alter table nhf_private.player_resets enable row level security;
revoke all on nhf_private.player_resets from public,anon,authenticated;
create function nhf_private.player_reset(t uuid,p uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare code text:=gen_random_uuid()::text||gen_random_uuid()::text; addr text; managed boolean;
begin
 if not exists(select from public.beta_members c where c.id=auth.uid() and c.role='coach' and (c.squad=t or exists(select from nhf_private.extra_coaches x where x.coach=c.id and x.team=t))) then raise exception 'Trenertilgang kreves';end if;
 select u.email,u.raw_app_meta_data->>'club_login'='athlete' into addr,managed from public.beta_members m join auth.users u on u.id=m.id where m.id=p and m.squad=t and m.role='athlete'
 and not exists(select from nhf_private.club_admins where account=p);
 if addr is null then raise exception 'Utøveren tilhører ikke laget';end if;
 if managed is not true then return jsonb_build_object('email',addr);end if;
 insert into nhf_private.player_resets values(p,auth.uid(),t,sha256(convert_to(code,'UTF8')),now()+interval '20 minutes') on conflict(player) do update set coach=excluded.coach,team=excluded.team,digest=excluded.digest,expires=excluded.expires;
 return jsonb_build_object('code',code);
end $$;
create function public.beta_player_reset(t uuid,p uuid) returns jsonb language sql security invoker set search_path='' as $$ select nhf_private.player_reset(t,p) $$;
revoke all on function nhf_private.player_reset(uuid,uuid),public.beta_player_reset(uuid,uuid) from public,anon,authenticated;
grant execute on function nhf_private.player_reset(uuid,uuid),public.beta_player_reset(uuid,uuid) to authenticated;
create function public.beta_use_player_reset(code text) returns uuid language plpgsql security definer set search_path='' as $$
declare id uuid;
begin
 delete from nhf_private.player_resets r using auth.users u,public.beta_members m where r.digest=sha256(convert_to(code,'UTF8')) and r.expires>now() and m.id=r.player and u.id=m.id and m.role='athlete' and m.squad=r.team and u.raw_app_meta_data->>'club_login'='athlete' and not exists(select from nhf_private.club_admins where account=m.id)
 and exists(select from public.beta_members coach where coach.id=r.coach and coach.role='coach' and (coach.squad=r.team or exists(select from nhf_private.extra_coaches x where x.coach=coach.id and x.team=r.team))) returning r.player into id;
 return id;
end $$;
revoke all on function public.beta_use_player_reset(text) from public,anon,authenticated;
grant execute on function public.beta_use_player_reset(text) to service_role;

create or replace function nhf_private.finish_signup_invite() returns trigger language plpgsql security definer set search_path='' as $$
declare i nhf_private.signup_intents;dest uuid;role_name text;m public.beta_members;nm text:=trim(new.raw_user_meta_data->>'full_name');
 ph text:=trim(new.raw_user_meta_data->>'contact_phone');
begin
 if new.email_confirmed_at is null then return new;end if;
 select * into i from nhf_private.signup_intents where person=new.id and state='pending' for update;
 if not found then return new;end if;
 if new.raw_app_meta_data->>'club_login'='athlete' and i.kind='email' then
  select team,role into dest,role_name from nhf_private.invites where token=i.credential::uuid and role='athlete' and email=new.raw_app_meta_data->>'contact_email' and expires>now() for update;
 elsif i.kind='link' then select team,role into dest,role_name from nhf_private.application_links where token=i.credential::uuid and direct and expires>now() for share;
 elsif i.kind='email' then select team,role into dest,role_name from nhf_private.invites where token=i.credential::uuid and email=lower(new.email) and expires>now() for update;
 elsif i.kind='athlete_code' then select team,'athlete' into dest,role_name from nhf_private.join_codes where code=i.credential and expires>now() for share;
 elsif i.kind='coach_code' then select team,'coach' into dest,role_name from nhf_private.coach_codes where code=i.credential and expires>now() for update;
 end if;
 if dest is null or new.raw_app_meta_data->>'club_login'='athlete' and role_name<>'athlete' then update nhf_private.signup_intents set state='unavailable',credential=null where person=new.id;return new;end if;
 if length(coalesce(nm,'')) not between 1 and 100 or coalesce(ph,'') !~ '^[+0-9() .-]{7,30}$' or length(regexp_replace(ph,'[^0-9]','','g')) not between 7 and 15 then return new;end if;
 if role_name='coach' and not exists(select from nhf_private.team_admins where team=dest) then return new;end if;
 insert into public.beta_members(id,squad,name,role) values(new.id,dest,nm,role_name) on conflict(id) do nothing;
 select * into strict m from public.beta_members where id=new.id for update;
 if m.role<>role_name or (m.role='athlete' and m.squad<>dest) then
  update nhf_private.signup_intents set state='conflict',credential=null where person=new.id;return new;end if;
 if m.role='coach' and m.squad<>dest then insert into nhf_private.extra_coaches values(new.id,dest) on conflict do nothing;end if;
 insert into public.beta_applications(team,person,name,phone,email,role,status) values(dest,new.id,nm,ph,case when new.raw_app_meta_data->>'club_login'='athlete' then new.raw_app_meta_data->>'contact_email' else lower(new.email) end,role_name,'Approved')
 on conflict(team,person) do update set status='Approved',role=excluded.role,phone=excluded.phone,name=excluded.name,email=excluded.email;
 if m.role='athlete' then update public.beta_applications set status='Declined' where person=new.id and status='Pending' and team<>dest;end if;
 if i.kind='coach_code' then delete from nhf_private.coach_codes where team=dest and code=i.credential;
 elsif i.kind='email' then delete from nhf_private.invites where token=i.credential::uuid;end if;
 update nhf_private.signup_intents set state='joined',team=dest,credential=null where person=new.id;
 return new;
end $$;
-- Managed athletes never become coaches via other admission flows.
create function nhf_private.guard_player_role() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role<>'athlete' and exists(select from auth.users where id=new.id and raw_app_meta_data->>'club_login'='athlete') then raise exception 'Trenere må bruke en bekreftet trenerkonto';end if;
 return new;
end $$;
create trigger guard_player_role before insert or update of role on public.beta_members for each row execute function nhf_private.guard_player_role();
create function nhf_private.player_contact() returns trigger language plpgsql security definer set search_path='' as $$
declare contact text;
begin
 if new.role='athlete' then select raw_app_meta_data->>'contact_email' into contact from auth.users where id=new.person and raw_app_meta_data->>'club_login'='athlete' and email=new.email;
 if contact is not null then new.email:=contact;end if;end if;
 return new;
end $$;
create trigger normalize_player_contact before insert or update of email on public.beta_applications for each row execute function nhf_private.player_contact();
revoke all on function nhf_private.guard_player_role(),nhf_private.player_contact() from public,anon,authenticated;

create or replace function nhf_private.join_team(code uuid,display_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare invitation nhf_private.invites; member public.beta_members;
begin
 select * into invitation from nhf_private.invites where token=code and expires>now() for update;
 if not found or not exists(select from auth.users where id=auth.uid() and email_confirmed_at is not null and (lower(email)=invitation.email or invitation.role='athlete' and raw_app_meta_data->>'club_login'='athlete' and raw_app_meta_data->>'contact_email'=invitation.email)) then raise exception 'Bruk kontoen som ble invitert';end if;
 if length(trim(display_name)) not between 1 and 100 then raise exception 'Enter your name';end if;
 insert into public.beta_members(id,squad,name,role) values(auth.uid(),invitation.team,trim(display_name),invitation.role) on conflict(id) do nothing;
 select * into strict member from public.beta_members where id=auth.uid() for update;
 if member.role<>invitation.role or (member.role='athlete' and member.squad<>invitation.team) then raise exception 'This account already has a different role or athlete team';end if;
 if member.role='coach' and member.squad<>invitation.team then insert into nhf_private.extra_coaches values(member.id,invitation.team) on conflict do nothing;end if;
 delete from nhf_private.invites where token=code;
 return invitation.team;
end $$;
