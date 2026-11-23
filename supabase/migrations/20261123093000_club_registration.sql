create table nhf_private.club_requests (
  applicant uuid primary key references auth.users(id) on delete cascade,
  club_name text not null check (length(club_name) between 1 and 80),
  coach_name text not null check (length(coach_name) between 1 and 100),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  team uuid references public.beta_teams(id) on delete set null
);
revoke all on nhf_private.club_requests from public, anon, authenticated;
create unique index club_requests_team on nhf_private.club_requests(team) where team is not null;

create table nhf_private.club_approval_owner (
  only_row boolean primary key default true check (only_row),
  account uuid not null references nhf_private.club_admins(account) on delete cascade
);
revoke all on nhf_private.club_approval_owner from public, anon, authenticated;

create function nhf_private.can_approve_clubs() returns boolean
language sql stable security definer set search_path='' as $$
  select nhf_private.club_active() and exists(select from nhf_private.club_approval_owner where account=auth.uid())
$$;
create function public.beta_can_approve_clubs() returns boolean
language sql stable security invoker set search_path='' as $$ select nhf_private.can_approve_clubs() $$;
revoke all on function nhf_private.can_approve_clubs(),public.beta_can_approve_clubs() from public,anon;
grant execute on function nhf_private.can_approve_clubs(),public.beta_can_approve_clubs() to authenticated;

create function nhf_private.keep_registered_club_private() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.discoverable and (
    exists(select from nhf_private.club_requests where team=new.id)
    or exists(select from nhf_private.team_admins a join nhf_private.club_requests r
      on r.applicant=a.coach and r.status='approved' where a.team=new.id)
  ) then
    raise exception 'Denne klubben er privat. Bruk lagkode eller invitasjon.';
  end if;
  return new;
end $$;
revoke all on function nhf_private.keep_registered_club_private() from public,anon,authenticated;
create trigger keep_registered_club_private before update of discoverable on public.beta_teams
  for each row execute function nhf_private.keep_registered_club_private();

create function nhf_private.request_club(label text, coach text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result text;
begin
  if not exists(select from auth.users where id=actor and email_confirmed_at is not null and email is not null) then
    raise exception 'Bekreft e-postadressen først.';
  end if;
  if exists(select from public.beta_members where id=actor) then
    raise exception 'Bruk en egen trenerkonto for å søke om en ny klubb.';
  end if;
  if coalesce(length(trim(label)),0) not between 1 and 80 or coalesce(length(trim(coach)),0) not between 1 and 100 then
    raise exception 'Oppgi klubbnavn og trenerens navn.';
  end if;
  insert into nhf_private.club_requests(applicant,club_name,coach_name) values(actor,trim(label),trim(coach))
  on conflict(applicant) do nothing;
  select status into result from nhf_private.club_requests where applicant=actor;
  return result;
end $$;

create function nhf_private.club_request_status() returns text
language sql stable security definer set search_path='' as $$
  select status from nhf_private.club_requests where applicant=auth.uid()
$$;

create function nhf_private.pending_club_requests() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not nhf_private.can_approve_clubs() then raise exception 'Bare plattformeieren kan se klubbsøknader.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.applicant,'club',r.club_name,'coach',r.coach_name,
    'email',u.email,'created',r.created_at) order by r.created_at,r.applicant)
    from nhf_private.club_requests r join auth.users u on u.id=r.applicant where r.status='pending'),'[]'::jsonb);
end $$;

create function nhf_private.decide_club_request(applicant_id uuid, approve boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare request nhf_private.club_requests; new_team uuid;
begin
  if not nhf_private.can_approve_clubs() then raise exception 'Bare plattformeieren kan behandle klubbsøknader.'; end if;
  if approve is null then raise exception 'Velg godkjenn eller avslå.'; end if;
  select * into request from nhf_private.club_requests where applicant=applicant_id for update;
  if not found then raise exception 'Søknaden finnes ikke.'; end if;
  if request.status='approved' and approve then return request.team; end if;
  if request.status='declined' and not approve then return null; end if;
  if request.status<>'pending' then raise exception 'Søknaden er allerede behandlet.'; end if;
  if approve then
    if not exists(select from auth.users where id=applicant_id and email_confirmed_at is not null) then
      raise exception 'Søkeren må ha en bekreftet e-postadresse.';
    end if;
    if exists(select from public.beta_members where id=applicant_id) then
      raise exception 'Søkeren er allerede tilknyttet et lag.';
    end if;
    insert into public.beta_teams(name) values(request.club_name) returning id into new_team;
    insert into public.beta_members(id,squad,name,role) values(applicant_id,new_team,request.coach_name,'coach');
  end if;
  update nhf_private.club_requests set status=case when approve then 'approved' else 'declined' end,
    team=new_team,decided_at=now(),decided_by=auth.uid() where applicant=applicant_id;
  return new_team;
end $$;

create function public.beta_request_club(label text, coach text) returns text
language sql security invoker set search_path='' as $$ select nhf_private.request_club(label,coach) $$;
create function public.beta_club_request_status() returns text
language sql stable security invoker set search_path='' as $$ select nhf_private.club_request_status() $$;
create function public.beta_pending_club_requests() returns jsonb
language sql stable security invoker set search_path='' as $$ select nhf_private.pending_club_requests() $$;
create function public.beta_decide_club_request(applicant_id uuid, approve boolean) returns uuid
language sql security invoker set search_path='' as $$ select nhf_private.decide_club_request(applicant_id,approve) $$;

revoke all on function nhf_private.request_club(text,text),nhf_private.club_request_status(),
  nhf_private.pending_club_requests(),nhf_private.decide_club_request(uuid,boolean),
  public.beta_request_club(text,text),public.beta_club_request_status(),
  public.beta_pending_club_requests(),public.beta_decide_club_request(uuid,boolean) from public,anon;
grant execute on function nhf_private.request_club(text,text),nhf_private.club_request_status(),
  nhf_private.pending_club_requests(),nhf_private.decide_club_request(uuid,boolean),
  public.beta_request_club(text,text),public.beta_club_request_status(),
  public.beta_pending_club_requests(),public.beta_decide_club_request(uuid,boolean) to authenticated;
