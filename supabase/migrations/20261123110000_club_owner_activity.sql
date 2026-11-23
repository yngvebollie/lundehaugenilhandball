create function nhf_private.club_request_count() returns jsonb
language sql stable security definer set search_path='' as $$
  select case when exists(select from nhf_private.club_approval_owner where account=auth.uid())
    then jsonb_build_object(
      'pending',(select count(*) from nhf_private.club_requests where status='pending'),
      'accounts',(select count(*) from auth.users u join public.beta_members m on m.id=u.id
        where u.created_at>=now()-interval '7 days')
    ) end
$$;

create function nhf_private.club_owner_activity() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not nhf_private.can_approve_clubs() then raise exception 'Bare plattformeieren kan se aktivitetsloggen.'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(activity) order by activity.at desc,activity.id)
    from (
      select * from (
        select 'request:'||applicant as id,created_at as at,'request' as event,coach_name as person,club_name as club,null::text as role
        from nhf_private.club_requests
        union all
        select 'decision:'||applicant,decided_at,status,coach_name,club_name,null::text
        from nhf_private.club_requests where decided_at is not null
        union all
        select 'user:'||m.id,u.created_at,'user',m.name,t.name,m.role
        from public.beta_members m join auth.users u on u.id=m.id join public.beta_teams t on t.id=m.squad
        where u.created_at is not null
      ) events order by at desc,id limit 100
    ) activity
  ),'[]'::jsonb);
end $$;

create function public.beta_club_request_count() returns jsonb
language sql stable security invoker set search_path='' as $$ select nhf_private.club_request_count() $$;
create function public.beta_club_owner_activity() returns jsonb
language sql stable security invoker set search_path='' as $$ select nhf_private.club_owner_activity() $$;
revoke all on function nhf_private.club_request_count(),public.beta_club_request_count(),
  nhf_private.club_owner_activity(),public.beta_club_owner_activity() from public,anon;
grant execute on function nhf_private.club_request_count(),public.beta_club_request_count(),
  nhf_private.club_owner_activity(),public.beta_club_owner_activity() to authenticated;
