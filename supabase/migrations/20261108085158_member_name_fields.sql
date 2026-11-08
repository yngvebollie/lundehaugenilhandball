alter table public.beta_members
 add column given_name text check(length(given_name) between 1 and 99),
 add column family_name text check(length(family_name) between 1 and 99);
grant update(given_name,family_name) on public.beta_members to authenticated;

create function nhf_private.signup_names() returns trigger language plpgsql security definer set search_path='' as $$
declare g text; f text;
begin
 if new.role='athlete' then
  select trim(raw_user_meta_data->>'given_name'),trim(raw_user_meta_data->>'family_name')
  into g,f from auth.users where id=new.id;
  if length(g)>0 and length(f)>0 and length(g||' '||f)<=100 and new.name=g||' '||f then
   new.given_name:=g; new.family_name:=f;
  end if;
 end if;
 return new;
end $$;
revoke all on function nhf_private.signup_names() from public,anon,authenticated;
create trigger initial_signup_names before insert on public.beta_members for each row execute function nhf_private.signup_names();
