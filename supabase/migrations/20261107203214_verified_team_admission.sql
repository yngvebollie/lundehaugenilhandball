-- Capture the bearer credential once at signup, outside user-editable/JWT metadata.
create table nhf_private.signup_intents(person uuid primary key references auth.users(id) on delete cascade deferrable initially deferred,
 kind text not null,credential text,signature bytea not null,team uuid references public.beta_teams on delete set null,
 state text not null default 'pending' check(state in('pending','joined','unavailable','conflict')));
revoke all on nhf_private.signup_intents from public,anon,authenticated;
create function nhf_private.capture_signup_invite() returns trigger language plpgsql security definer set search_path='' as $$
declare k text:=new.raw_user_meta_data->>'club_invite_kind';v text:=new.raw_user_meta_data->>'club_invite_token';
begin
 if k is null and v is null then return new;end if;
 new.raw_user_meta_data:=new.raw_user_meta_data-'club_invite_kind'-'club_invite_token';
 if k in ('link','email') and v ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or k='coach_code' and v ~ '^[A-Z0-9]{6}$' then
  insert into nhf_private.signup_intents(person,kind,credential,signature) values(new.id,k,v,sha256(convert_to(v,'UTF8')));
 end if;
 return new;
end $$;
create trigger capture_club_signup before insert on auth.users for each row execute function nhf_private.capture_signup_invite();
create function nhf_private.finish_signup_invite() returns trigger language plpgsql security definer set search_path='' as $$
declare i nhf_private.signup_intents;dest uuid;role_name text;m public.beta_members;nm text:=trim(new.raw_user_meta_data->>'full_name');
 ph text:=trim(new.raw_user_meta_data->>'contact_phone');
begin
 if new.email_confirmed_at is null then return new;end if;
 select * into i from nhf_private.signup_intents where person=new.id and state='pending' for update;
 if not found then return new;end if;
 if i.kind='link' then select team,role into dest,role_name from nhf_private.application_links where token=i.credential::uuid and direct and expires>now() for share;
 elsif i.kind='email' then select team,role into dest,role_name from nhf_private.invites where token=i.credential::uuid and email=lower(new.email) and expires>now() for update;
 elsif i.kind='coach_code' then select team,'coach' into dest,role_name from nhf_private.coach_codes where code=i.credential and expires>now() for update;
 end if;
 if dest is null then update nhf_private.signup_intents set state='unavailable',credential=null where person=new.id;return new;end if;
 if length(coalesce(nm,'')) not between 1 and 100 or coalesce(ph,'') !~ '^[+0-9() .-]{7,30}$' or length(regexp_replace(ph,'[^0-9]','','g')) not between 7 and 15 then return new;end if;
 if role_name='coach' and not exists(select from nhf_private.team_admins where team=dest) then return new;end if;
 insert into public.beta_members(id,squad,name,role) values(new.id,dest,nm,role_name) on conflict(id) do nothing;
 select * into strict m from public.beta_members where id=new.id for update;
 if m.role<>role_name or (m.role='athlete' and m.squad<>dest) then
  update nhf_private.signup_intents set state='conflict',credential=null where person=new.id;return new;end if;
 if m.role='coach' and m.squad<>dest then insert into nhf_private.extra_coaches values(new.id,dest) on conflict do nothing;end if;
 insert into public.beta_applications(team,person,name,phone,email,role,status) values(dest,new.id,nm,ph,lower(new.email),role_name,'Approved')
 on conflict(team,person) do update set status='Approved',role=excluded.role,phone=excluded.phone,name=excluded.name,email=excluded.email;
 if m.role='athlete' then update public.beta_applications set status='Declined' where person=new.id and status='Pending' and team<>dest;end if;
 if i.kind='coach_code' then delete from nhf_private.coach_codes where team=dest and code=i.credential;
 elsif i.kind='email' then delete from nhf_private.invites where token=i.credential::uuid;end if;
 update nhf_private.signup_intents set state='joined',team=dest,credential=null where person=new.id;
 return new;
end $$;
create trigger finish_club_signup after insert or update of email_confirmed_at,last_sign_in_at,raw_user_meta_data on auth.users
 for each row when (new.email_confirmed_at is not null) execute function nhf_private.finish_signup_invite();
revoke all on function nhf_private.capture_signup_invite(),nhf_private.finish_signup_invite() from public,anon,authenticated;

-- The same browser callback can safely run again after server-side admission.
create function nhf_private.signup_result(cred text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',t.id,'name',t.name,'role',m.role,'direct',true) from nhf_private.signup_intents i
 join public.beta_teams t on t.id=i.team join public.beta_members m on m.id=i.person
 where i.person=auth.uid() and i.state='joined' and i.signature=sha256(convert_to(cred,'UTF8'))
 and (m.squad=t.id or exists(select from nhf_private.extra_coaches x where x.team=t.id and x.coach=m.id))
$$;
create function public.beta_signup_result(cred text) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.signup_result(cred)$$;
revoke all on function nhf_private.signup_result(text),public.beta_signup_result(text) from public,anon;
grant execute on function nhf_private.signup_result(text),public.beta_signup_result(text) to authenticated;
create function nhf_private.long_team_link() returns trigger language plpgsql set search_path='' as $$
begin if new.direct then new.expires:=now()+interval '90 days';end if;return new;end $$;
create trigger team_link_lifetime before update of direct on nhf_private.application_links for each row execute function nhf_private.long_team_link();
revoke all on function nhf_private.long_team_link() from public,anon,authenticated;
create or replace function nhf_private.link_action(action text,t uuid,member_role text,code uuid,label text,phone_number text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rec nhf_private.application_links;u public.beta_members;actor uuid:=auth.uid();email_address text;outcome jsonb;
begin
 if action in ('issue_direct','issue','get') then
   outcome:=nhf_private.link_review(case when action='issue_direct' then 'issue' else action end,t,member_role,code,label,phone_number);
   if action<>'get' then update nhf_private.application_links set direct=(action='issue_direct') where team=t and role=member_role;end if;
   return outcome||(select jsonb_build_object('direct',direct,'expires',expires) from nhf_private.application_links where team=t and role=member_role);
 end if;
 if action is distinct from 'submit' then return nhf_private.link_review(action,t,member_role,code,label,phone_number);end if;
 select * into rec from nhf_private.application_links where token=code and expires>now() for share;
 if not found then raise exception 'Invitasjonen har utløpt eller er erstattet';end if;
 if not rec.direct then return nhf_private.link_review(action,t,member_role,code,label,phone_number);end if;
 select lower(email) into strict email_address from auth.users where id=actor and email_confirmed_at is not null for update;
 if length(trim(coalesce(label,''))) not between 1 and 100 or coalesce(phone_number,'') !~ '^[+0-9() .-]{7,30}$' or
 length(regexp_replace(phone_number,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Kontroller navn og telefonnummer';end if;
 insert into public.beta_members(id,squad,name,role) values(actor,rec.team,trim(label),rec.role) on conflict(id) do nothing;
 select * into strict u from public.beta_members where id=actor for update;
 if u.role<>rec.role or (u.role='athlete' and u.squad<>rec.team) then raise exception 'Kontoen har allerede et annet lag eller en annen rolle';end if;
 if u.squad<>rec.team then insert into nhf_private.extra_coaches values(actor,rec.team) on conflict do nothing;end if;
 insert into public.beta_applications(team,person,name,phone,email,role,status) values(rec.team,actor,trim(label),trim(phone_number),email_address,rec.role,'Approved')
 on conflict(team,person) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,role=excluded.role,status='Approved';
 if u.role='athlete' then update public.beta_applications set status='Declined' where person=actor and status='Pending' and team<>rec.team;end if;
 return jsonb_build_object('status','Approved','team',rec.team);
end $$;
