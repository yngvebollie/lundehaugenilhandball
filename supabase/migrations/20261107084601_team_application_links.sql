alter table public.beta_applications add column role text not null default 'athlete' check(role in ('coach','athlete')),
 add column email text, add column phone text check(phone is null or length(phone)<=30);
create table nhf_private.application_links(
 team uuid references public.beta_teams on delete cascade, role text check(role in ('athlete','coach')),
 token uuid unique not null default gen_random_uuid(),expires timestamptz not null,primary key(team,role)
);
revoke all on nhf_private.application_links from public,anon,authenticated;
create schema nhf_entry;
revoke all on schema nhf_entry from public;grant usage on schema nhf_entry to anon,authenticated;
-- Only the holder of a live, unguessable token may see the destination name and role before login.
create function nhf_entry.info(code uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',t.id,'name',t.name,'role',l.role) from nhf_private.application_links l join public.beta_teams t on t.id=l.team where l.token=code and l.expires>now()
$$;
create function public.beta_link_info(code uuid) returns jsonb language sql security invoker set search_path='' as $$select nhf_entry.info(code)$$;
revoke all on function nhf_entry.info(uuid),public.beta_link_info(uuid) from public;
grant execute on function nhf_entry.info(uuid),public.beta_link_info(uuid) to anon,authenticated;
create function nhf_private.link_action(action text,t uuid,member_role text,code uuid,label text,phone_number text) returns jsonb language plpgsql security definer set search_path='' as $$
declare l nhf_private.application_links; actor uuid:=auth.uid();addr text;m public.beta_members;existing public.beta_applications;
begin
 if action in ('get','issue','revoke') then
   if member_role is null or member_role not in ('coach','athlete') or not nhf_private.coaches(t) or
      (member_role='coach' and not nhf_private.admin_of(t)) then raise exception 'Not authorized to manage this link';end if;
   if action='revoke' then delete from nhf_private.application_links where team=t and role=member_role;return 'true';end if;
   if action='issue' then insert into nhf_private.application_links(team,role,expires) values(t,member_role,now()+interval '7 days')
     on conflict(team,role) do update set token=excluded.token,expires=excluded.expires;end if;
   return (select jsonb_build_object('token',token,'expires',expires) from nhf_private.application_links where team=t and role=member_role and expires>now());
 end if;
 if action is distinct from 'submit' then raise exception 'Invalid action';end if;
 select lower(email) into addr from auth.users where id=actor and email_confirmed_at is not null;
 if addr is null then raise exception 'Verify your email and sign in first';end if;
 select * into l from nhf_private.application_links where token=code and expires>now() for share;
 if not found then raise exception 'This link expired or was replaced';end if;
 if label is null or length(trim(label)) not between 1 and 100 or phone_number is null or phone_number !~ '^[+0-9() .-]{7,30}$'
    or length(regexp_replace(phone_number,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Enter a name and a valid phone number';end if;
 select * into m from public.beta_members where id=actor;
 if found and (m.role<>l.role or m.role='athlete' or m.squad=l.team or exists(select from nhf_private.extra_coaches where coach=actor and team=l.team)) then raise exception 'This account already has a team or a different role';end if;
 select * into existing from public.beta_applications where team=l.team and person=actor;
 if found and existing.status='Pending' and existing.role<>l.role then raise exception 'Another application is already pending for this team';end if;
 insert into public.beta_applications(team,person,name,status,role,email,phone) values(l.team,actor,trim(label),'Pending',l.role,addr,trim(phone_number))
 on conflict(team,person) do update set name=excluded.name,status='Pending',role=excluded.role,email=excluded.email,phone=excluded.phone;
 return jsonb_build_object('status','Pending','team',l.team);
end $$;
create function public.beta_application_link(action text,t uuid default null,member_role text default 'athlete',code uuid default null,label text default '',phone_number text default '')
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.link_action(action,t,member_role,code,label,phone_number)$$;
revoke all on function nhf_private.link_action(text,uuid,text,uuid,text,text),public.beta_application_link(text,uuid,text,uuid,text,text) from public,anon;
grant execute on function nhf_private.link_action(text,uuid,text,uuid,text,text),public.beta_application_link(text,uuid,text,uuid,text,text) to authenticated;

alter function nhf_private.admit(text,uuid,uuid,text,text) rename to admit_existing;
revoke all on function nhf_private.admit_existing(text,uuid,uuid,text,text) from public,anon,authenticated;
create function nhf_private.admit(action text,target uuid,applicant uuid,value text,label text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.beta_applications;m public.beta_members;
begin
 if action<>'review' then return nhf_private.admit_existing(action,target,applicant,value,label);end if;
 perform 1 from public.beta_teams where id=target for update;
 if not nhf_private.coaches(target) or value is null or value not in ('Approved','Declined') then raise exception 'Invalid review';end if;
 select * into strict a from public.beta_applications where team=target and person=applicant and status='Pending' for update;
 if a.role='coach' and not nhf_private.admin_of(target) then raise exception 'Admin coach required';end if;
 if value='Approved' then
   insert into public.beta_members(id,squad,name,role) values(applicant,target,a.name,a.role) on conflict(id) do nothing;
   select * into strict m from public.beta_members where id=applicant for update;
   if m.role<>a.role or (m.role='athlete' and m.squad<>target) then raise exception 'Account already has another team or role';end if;
   if m.role='coach' and m.squad<>target then insert into nhf_private.extra_coaches values(applicant,target) on conflict do nothing;end if;
   if m.role='athlete' then update public.beta_applications set status='Declined' where person=applicant and team<>target and status='Pending';end if;
 end if;
 update public.beta_applications set status=value where team=target and person=applicant;return 'true';
end $$;
revoke all on function nhf_private.admit(text,uuid,uuid,text,text) from public,anon;
grant execute on function nhf_private.admit(text,uuid,uuid,text,text) to authenticated;
create or replace function public.beta_admit(action text,target uuid default null,applicant uuid default null,value text default '',label text default '') returns jsonb
language sql security invoker set search_path='' as $$ select nhf_private.admit(action,target,applicant,value,label) $$;
