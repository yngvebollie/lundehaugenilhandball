create function nhf_private.catalog_targets(t uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return coalesce((select jsonb_object_agg(b.key,b.levels) from nhf_private.badge_targets b join nhf_private.active_seasons s on b.team=s.team and b.season=s.season where b.team=t),'{}');
end $$;
create function public.beta_catalog_targets(t uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.catalog_targets(t)$$;
revoke all on function nhf_private.catalog_targets(uuid),public.beta_catalog_targets(uuid) from public,anon;
grant execute on function nhf_private.catalog_targets(uuid),public.beta_catalog_targets(uuid) to authenticated;
