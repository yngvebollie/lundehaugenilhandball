-- Scouting returns only sports statistics against this registration, not complete reports.
create function nhf_private.opponent_lines(reg uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t uuid;
begin
 select team into strict t from public.beta_team_seasons where id=reg;
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return (select coalesce(jsonb_agg(to_jsonb(v) order by v.day,v.match_id,v.shirt),'[]') from (
 select g.id match_id,g.day,g.opponent,x->>'name' name,x->>'shirt' shirt,(x->>'played')::boolean played,
 (x->>'total')::integer goals,(x->>'penalty')::integer penalty
 from public.beta_matches g join nhf_private.match_reports r on r.match_id=g.id
 cross join lateral jsonb_array_elements(r.reviewed->'players') x where g.team=t and g.registration=reg and g.completed
 and g.day<=(now() at time zone 'Europe/Oslo')::date and g.home<>g.away and x->>'side'=case when g.away=g.opponent then 'B' when g.home=g.opponent then 'A' end
 ) v);
end $$;
create function public.beta_opponent_lines(reg uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.opponent_lines(reg)$$;
revoke all on function public.beta_opponent_lines(uuid),nhf_private.opponent_lines(uuid) from public,anon;
grant execute on function public.beta_opponent_lines(uuid),nhf_private.opponent_lines(uuid) to authenticated;
