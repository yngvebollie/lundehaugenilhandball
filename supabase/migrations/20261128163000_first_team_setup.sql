alter table nhf_private.club_requests
 add column first_team uuid references public.beta_teams(id) on delete set null;

create function nhf_private.first_team_setup(label text, sid integer, season_label text, nhf_id integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare request nhf_private.club_requests; created_team uuid; registration uuid;
begin
 select * into request from nhf_private.club_requests
  where applicant=auth.uid() and status='approved' and team is not null for update;
 if not found or not nhf_private.admin_of(request.team) then
  if label is null then return null; end if;
  raise exception 'Oppsettet krever en godkjent klubb og administratortilgang.';
 end if;
 if request.first_team is not null then
  select id into registration from public.beta_team_seasons
   where team=request.first_team and season=sid and org_id=nhf_id;
  return jsonb_build_object('club',request.club_name,'team',request.first_team,'registration',registration);
 end if;
 if label is null then return jsonb_build_object('club',request.club_name); end if;
 if coalesce(length(trim(label)),0) not between 1 and 80 or coalesce(sid,0)<1
  or coalesce(length(trim(season_label)),0) not between 1 and 40 or coalesce(nhf_id,1)<1 then
  raise exception 'Kontroller lagnavn, sesong og NHF-lag-ID.';
 end if;
 created_team:=nhf_private.new_team(trim(label));
 perform nhf_private.season_settings('save',created_team,sid,trim(season_label));
 if nhf_id is not null then
  insert into public.beta_team_seasons(team,org_id,season,display_name)
   values(created_team,nhf_id,sid,trim(label)) returning id into registration;
 end if;
 update nhf_private.club_requests set first_team=created_team where applicant=request.applicant;
 return jsonb_build_object('club',request.club_name,'team',created_team,'registration',registration);
end $$;

create function public.beta_first_team_setup(label text default null,sid integer default null,
 season_label text default null,nhf_id integer default null)
returns jsonb language sql security invoker set search_path='' as $$
 select nhf_private.first_team_setup(label,sid,season_label,nhf_id)
$$;
revoke all on function nhf_private.first_team_setup(text,integer,text,integer),
 public.beta_first_team_setup(text,integer,text,integer) from public,anon;
grant execute on function nhf_private.first_team_setup(text,integer,text,integer),
 public.beta_first_team_setup(text,integer,text,integer) to authenticated;
