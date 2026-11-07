-- Presence comes from the saved report itself, never the length of the lineup.
create function nhf_private.report_overview(t uuid,ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 if cardinality(ids)>500 then raise exception 'For mange kamper';end if;
 return (select coalesce(jsonb_object_agg(g.id,jsonb_build_object('revision',r.revision,'rows',
   (select count(*) from nhf_private.match_participants p left join nhf_private.player_match_statistics s using(match_id,player_id)
    where p.match_id=g.id and (p.report_listed or s.match_id is not null)))),'{}')
 from public.beta_matches g left join nhf_private.match_reports r on r.match_id=g.id where g.team=t and g.id=any(ids));
end $$;
create function public.beta_report_overview(t uuid,ids uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.report_overview(t,ids)$$;
revoke all on function nhf_private.report_overview(uuid,uuid[]),public.beta_report_overview(uuid,uuid[]) from public,anon;
grant execute on function nhf_private.report_overview(uuid,uuid[]),public.beta_report_overview(uuid,uuid[]) to authenticated;
