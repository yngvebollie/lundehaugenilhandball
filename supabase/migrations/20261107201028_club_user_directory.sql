-- Only operators provision club administrators; invitation or signup cannot grant this role.
create table nhf_private.club_admins(account uuid primary key references auth.users on delete cascade);
create table nhf_private.club_sessions(account uuid references nhf_private.club_admins on delete cascade,
 session_id uuid references auth.sessions on delete cascade, primary key(account,session_id));
create table nhf_private.club_role_audit(account uuid references auth.users on delete set null,mode text,at timestamptz default now());
revoke all on nhf_private.club_admins,nhf_private.club_sessions,nhf_private.club_role_audit from public,anon,authenticated;
create function nhf_private.club_session_id() returns uuid language sql stable set search_path='' as $$
 select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')::uuid
$$;
create function nhf_private.club_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from nhf_private.club_sessions s join auth.sessions x on x.id=s.session_id and x.user_id=s.account
 where s.account=auth.uid() and s.session_id=nhf_private.club_session_id())
$$;
revoke all on function nhf_private.club_active(),nhf_private.club_session_id() from public,anon,authenticated;
create or replace function nhf_private.coaches(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from public.beta_members m where m.id=auth.uid() and m.role='coach' and
 (m.squad=target or exists(select from nhf_private.extra_coaches c where c.coach=m.id and c.team=target)
 or (nhf_private.club_active() and exists(select from public.beta_teams t where t.id=target))))
$$;
create or replace function nhf_private.admin_of(t uuid) returns boolean language sql stable security definer set search_path='' as $$
 select nhf_private.coaches(t) and (nhf_private.club_active() or exists(select from nhf_private.team_admins where team=t and coach=auth.uid()))
$$;
create function nhf_private.club_role(mode text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();sid uuid:=nhf_private.club_session_id();eligible boolean;
begin
 if actor is null then raise exception 'Logg inn';end if;
 select exists(select from nhf_private.club_admins b join public.beta_members m on m.id=b.account and m.role='coach' where b.account=actor) into eligible;
 if mode='club' then
  if not eligible or not exists(select from auth.sessions where id=sid and user_id=actor) then raise exception 'Klubbadmin kreves';end if;
  insert into nhf_private.club_sessions values(actor,sid) on conflict do nothing;
 elsif mode='coach' then delete from nhf_private.club_sessions where account=actor and session_id=sid;
 elsif mode is distinct from 'read' then raise exception 'Ugyldig rolle';end if;
 if mode<>'read' then insert into nhf_private.club_role_audit values(actor,mode,now());end if;
 return jsonb_build_object('eligible',eligible,'active',eligible and nhf_private.club_active());
end $$;
create function public.beta_club_role(mode text default 'read') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.club_role(mode)$$;
create function nhf_private.club_directory() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select from public.beta_members where id=auth.uid() and role='coach') then raise exception 'Trenertilgang kreves';end if;
 return (with teams as materialized(select t.id,t.name,nhf_private.admin_of(t.id) admin from public.beta_teams t where nhf_private.coaches(t.id)),
 members as (select t.id team,m.id,m.name,m.role,exists(select from nhf_private.team_admins a where a.coach=m.id and a.team=t.id) admin
 from teams t join public.beta_members m on m.squad=t.id or exists(select from nhf_private.extra_coaches e where e.team=t.id and e.coach=m.id)),
 invitations as (select i.team,i.role,lower(i.email) email,i.expires,'E-post' kind from nhf_private.invites i join teams t on t.id=i.team where i.role='athlete' or t.admin
 union all select l.team,l.role,null,l.expires,'Åpen lenke' from nhf_private.application_links l join teams t on t.id=l.team where l.role='athlete' or t.admin)
 select jsonb_build_object('teams',coalesce((select jsonb_agg(to_jsonb(t) order by t.name,t.id) from teams t),'[]'),
 'members',coalesce((select jsonb_agg(to_jsonb(m) order by m.name,m.id) from members m),'[]'),
 'invitations',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('expired',i.expires<=now()) order by i.expires desc) from invitations i),'[]')));
end $$;
create function public.beta_club_directory() returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.club_directory()$$;
revoke all on function nhf_private.club_role(text),public.beta_club_role(text),nhf_private.club_directory(),public.beta_club_directory() from public,anon;
grant execute on function nhf_private.club_role(text),public.beta_club_role(text),nhf_private.club_directory(),public.beta_club_directory() to authenticated;
