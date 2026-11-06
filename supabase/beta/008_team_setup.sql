begin;
alter table public.beta_teams add column logo text not null default '' check(logo='' or (length(logo)<=120000 and logo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'));
grant update(logo) on public.beta_teams to authenticated;
create function public.beta_bulk_invite(team_id uuid, addresses text[], member_role text)
returns table(email text,token uuid) language plpgsql security invoker set search_path='' as $$
begin
 if cardinality(addresses) not between 1 and 100 or addresses is null then raise exception 'Use 1 to 100 email addresses'; end if;
 return query select a,nhf_private.invite(team_id,a,member_role) from
   (select distinct lower(trim(address)) a from unnest(addresses) address) entries;
end $$;
revoke all on function public.beta_bulk_invite(uuid,text[],text) from public,anon;
grant execute on function public.beta_bulk_invite(uuid,text[],text) to authenticated;
commit;
