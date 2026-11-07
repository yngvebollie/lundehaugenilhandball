-- Existing application links were distributed under a review policy. Do not upgrade their privileges.
alter table nhf_private.application_links add column direct boolean not null default false;
create or replace function nhf_entry.info(code uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',t.id,'name',t.name,'role',l.role,'direct',l.direct) from nhf_private.application_links l join public.beta_teams t on t.id=l.team where l.token=code and l.expires>now()
$$;
alter function nhf_private.link_action(text,uuid,text,uuid,text,text) rename to link_review;
revoke all on function nhf_private.link_review(text,uuid,text,uuid,text,text) from public,anon,authenticated;
create function nhf_private.link_action(action text,t uuid,member_role text,code uuid,label text,phone_number text) returns jsonb language plpgsql security definer set search_path='' as $$
declare rec nhf_private.application_links;u public.beta_members;actor uuid:=auth.uid();email_address text;outcome jsonb;
begin
 if action in ('issue_direct','issue','get') then
   outcome:=nhf_private.link_review(case when action='issue_direct' then 'issue' else action end,t,member_role,code,label,phone_number);
   if action<>'get' then update nhf_private.application_links set direct=(action='issue_direct') where team=t and role=member_role;end if;
   return outcome||(select jsonb_build_object('direct',direct) from nhf_private.application_links where team=t and role=member_role);
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
revoke all on function nhf_private.link_action(text,uuid,text,uuid,text,text) from public,anon;
grant execute on function nhf_private.link_action(text,uuid,text,uuid,text,text) to authenticated;
create or replace function public.beta_application_link(action text,t uuid default null,member_role text default 'athlete',code uuid default null,label text default '',phone_number text default '')
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.link_action(action,t,member_role,code,label,phone_number)$$;
