create or replace function nhf_private.report_overview(t uuid, ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves'; end if;
  if cardinality(ids)>500 then raise exception 'For mange kamper'; end if;
  return (
    select coalesce(jsonb_object_agg(g.id, jsonb_build_object(
      'revision', r.revision,
      'rows', (select count(*) from nhf_private.match_participants p
        left join nhf_private.player_match_statistics s using(match_id,player_id)
        where p.match_id=g.id and (p.report_listed or s.match_id is not null)),
      'halfHome', case when scores.complete then to_jsonb(scores.home) else r.reviewed #> '{match,half_home}' end,
      'halfAway', case when scores.complete then to_jsonb(scores.away) else r.reviewed #> '{match,half_away}' end
    )), '{}')
    from public.beta_matches g
    left join nhf_private.match_reports r on r.match_id=g.id
    left join public.beta_live_match_logs log on log.id=g.id and log.team=g.team and log.document->>'finalized'='true'
    left join lateral (
      select count(*) filter(where e->>'half'='1' and e->>'side'='home' and (e->>'type'='goal' or (e->>'type'='penalty' and e->>'outcome'='goal'))) home,
        count(*) filter(where e->>'half'='1' and e->>'side'='away' and (e->>'type'='goal' or (e->>'type'='penalty' and e->>'outcome'='goal'))) away,
        count(distinct e->>'half') filter(where e->>'half' in ('1','2'))=2 as complete
      from jsonb_array_elements(log.document->'events') e
    ) scores on log.id is not null
    where g.team=t and g.id=any(ids)
  );
end $$;
