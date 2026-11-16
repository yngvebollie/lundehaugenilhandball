create function nhf_private.my_awarded_match(wanted uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',m.id,'fixture',h.fixture,'reg',m.registration,'team_name',r.display_name,'day',m.day,'time',m.start_time,'opponent',m.opponent,'title',concat_ws(' – ',m.home,m.away),'venue',m.venue,'score',m.score,'completed',m.completed,'played',true,'goals',h.goals,'warnings',null,'saves',null)
 from nhf_private.scoring_match_history h join public.beta_matches m on m.id=wanted and h.game_id=m.id::text and m.team=h.team
 join public.beta_team_seasons r on r.id=m.registration where h.athlete=auth.uid() limit 1
$$;
create function public.beta_my_awarded_match(wanted uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.my_awarded_match(wanted)$$;
revoke all on function nhf_private.my_awarded_match(uuid),public.beta_my_awarded_match(uuid) from anon,public;
grant execute on function nhf_private.my_awarded_match(uuid),public.beta_my_awarded_match(uuid) to authenticated;
