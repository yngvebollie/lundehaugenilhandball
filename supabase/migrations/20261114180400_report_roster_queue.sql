create view nhf_private.report_roster_queue with (security_invoker=true) as
with reported as (
 select r.team,r.id reg,coalesce(nullif(r.display_name,''),r.org_id::text) squad,
 coalesce(k.season_player,p.player_id) player,p.shirt_number,g.id game
 from public.beta_team_seasons r join nhf_private.active_seasons a on a.team=r.team and a.season=r.season
 join public.beta_matches g on g.registration=r.id and g.team=r.team
 join nhf_private.match_participants p on p.match_id=g.id and p.team=r.team and p.report_listed
 left join nhf_private.season_player_keys k on k.registration=r.id and k.player_id=p.player_id
)
select q.team,q.reg,q.squad,q.player,b.name,
 coalesce(array_agg(distinct q.shirt_number order by q.shirt_number) filter(where nullif(trim(q.shirt_number),'') is not null),'{}') shirts,
 count(distinct q.game)::int games
from reported q join nhf_private.match_players b on b.id=q.player
where not exists(select from nhf_private.badge_links l left join nhf_private.season_player_keys k on k.registration=l.reg and k.player_id=l.player
 where l.reg=q.reg and coalesce(k.season_player,l.player)=q.player)
and not exists(select from public.beta_members u where u.id=q.player and u.role='athlete' and u.squad=q.team)
group by q.team,q.reg,q.squad,q.player,b.name;
revoke all on nhf_private.report_roster_queue from public,anon,authenticated;

create function nhf_private.report_roster(t uuid,r uuid,p uuid,a uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 if r is not null or p is not null or a is not null then
  if not exists(select from public.beta_members where id=a and squad=t and role='athlete') then raise exception 'Velg en registrert spiller på laget';end if;
  perform 1 from public.beta_team_seasons ts join nhf_private.active_seasons ac on ac.team=ts.team and ac.season=ts.season
    where ts.team=t and ts.id=r for update of ts,ac;
  if not found or not exists(select from nhf_private.report_roster_queue q where q.team=t and q.reg=r and q.player=p)
    then raise exception 'Rapportspilleren er ikke lenger tilgjengelig for kobling';end if;
  insert into nhf_private.badge_links(reg,player,athlete,origin) values(r,p,a,'manual') on conflict do nothing;
  if not found then raise exception 'En av spillerne er allerede koblet i dette spillelaget';end if;
 end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(q)-'team' order by q.name,q.squad) from nhf_private.report_roster_queue q where q.team=t),'[]'),
  'links',nhf_private.roster_ids(t));
end $$;
create function public.beta_report_roster(t uuid,r uuid default null,p uuid default null,a uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select nhf_private.report_roster(t,r,p,a)$$;
revoke all on function public.beta_report_roster(uuid,uuid,uuid,uuid),nhf_private.report_roster(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.beta_report_roster(uuid,uuid,uuid,uuid),nhf_private.report_roster(uuid,uuid,uuid,uuid) to authenticated;
