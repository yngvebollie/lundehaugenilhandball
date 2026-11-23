alter function public.beta_edit_fixture(uuid,uuid,jsonb,jsonb) set schema nhf_private;

create function public.beta_edit_fixture(t uuid,m uuid,patch jsonb,expected jsonb) returns void
language sql security invoker set search_path='' as $$
  select nhf_private.beta_edit_fixture(t,m,patch,expected)
$$;
revoke all on function public.beta_edit_fixture(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.beta_edit_fixture(uuid,uuid,jsonb,jsonb) to authenticated;
