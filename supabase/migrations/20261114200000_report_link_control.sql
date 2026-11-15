create table nhf_private.report_link_veto(
 reg uuid references public.beta_team_seasons on delete cascade,
 player uuid references nhf_private.match_players on delete cascade,
 athlete uuid references public.beta_members on delete cascade,
 primary key(reg,player,athlete));
revoke all on nhf_private.report_link_veto from public,anon,authenticated;

create or replace function nhf_private.link_checked(t uuid,person uuid default null)
returns void language sql set search_path='' as $$
 insert into nhf_private.badge_links(reg,player,athlete,origin)
 select c.reg,c.player,c.athlete,'roster' from nhf_private.roster_matches c
 where c.team=t and (person is null or c.athlete=person) and c.safe
 and not exists(select from nhf_private.report_link_veto v
 left join nhf_private.season_player_keys k on k.registration=v.reg and k.player_id=v.player
 where v.reg=c.reg and v.athlete=c.athlete and coalesce(k.season_player,v.player)=c.player)
 on conflict do nothing;
$$;
create or replace function nhf_private.new_report_links() returns trigger language plpgsql security definer set search_path='' as $$
begin perform nhf_private.link_checked((select team from public.beta_matches where id=new.match_id));return null;end $$;
create function nhf_private.match_member_shirt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.role='athlete' and new.shirt_number is not null then
  if tg_op='INSERT' or (new.shirt_number,new.name,new.squad,new.role) is distinct from (old.shirt_number,old.name,old.squad,old.role) then
   perform nhf_private.link_checked(new.squad,new.id);
  end if;
 end if;return null;
end $$;
revoke all on function nhf_private.match_member_shirt() from public,anon,authenticated;
create trigger match_member_shirt after insert or update of shirt_number,name,squad,role on public.beta_members
 for each row execute function nhf_private.match_member_shirt();

create function nhf_private.unlink_report(t uuid,r uuid,p uuid,a uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare original uuid;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 perform 1 from public.beta_team_seasons ts join nhf_private.active_seasons ac on ac.team=ts.team and ac.season=ts.season
 where ts.id=r and ts.team=t for update of ts,ac;
 if not found then raise exception 'Ugyldig spillelag eller sesong';end if;
 select l.player into original from nhf_private.badge_links l join public.beta_members u on u.id=l.athlete and u.squad=t and u.role='athlete'
 left join nhf_private.season_player_keys k on k.registration=l.reg and k.player_id=l.player
 where l.reg=r and l.athlete=a and coalesce(k.season_player,l.player)=p for update of l;
 if not found then raise exception 'Koblingen er allerede endret. Oppdater listen.'; end if;
 insert into nhf_private.report_link_veto values(r,original,a) on conflict do nothing;
 delete from nhf_private.badge_links where reg=r and player=original and athlete=a;
 return nhf_private.report_roster(t,null,null,null);
end $$;
create function public.beta_unlink_report(t uuid,r uuid,p uuid,a uuid) returns jsonb
language sql security invoker set search_path='' as $$select nhf_private.unlink_report(t,r,p,a)$$;
revoke all on function public.beta_unlink_report(uuid,uuid,uuid,uuid),nhf_private.unlink_report(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.beta_unlink_report(uuid,uuid,uuid,uuid),nhf_private.unlink_report(uuid,uuid,uuid,uuid) to authenticated;

create or replace function nhf_private.roster_ids(t uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('reg',r.id,'player',coalesce(k.season_player,l.player),'athlete',l.athlete,
 'name',p.name,'squad',coalesce(nullif(r.display_name,''),r.org_id::text),'origin',l.origin) order by u.name,r.display_name),'[]')
 from nhf_private.badge_links l join public.beta_team_seasons r on r.id=l.reg and r.team=t
 join nhf_private.active_seasons ac on ac.team=t and ac.season=r.season
 join public.beta_members u on u.id=l.athlete and u.role='athlete' and u.squad=t
 left join nhf_private.season_player_keys k on k.registration=r.id and k.player_id=l.player
 join nhf_private.match_players p on p.id=coalesce(k.season_player,l.player));
end $$;
