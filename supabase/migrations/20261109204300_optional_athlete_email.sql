-- A personal invitation already carries its recipient; do not make the athlete retype it.
-- Resolving that address is server-only and grants no verified email identity.
create function public.beta_player_enroll_identity(addr text,k text,cred text,ip_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare contact text:=nullif(addr,''); mode text;
begin
 if contact is null and k='email' then
  select i.email into contact from nhf_private.invites i where i.token::text=cred and i.role='athlete' and i.expires>now();
 end if;
 mode:=public.beta_player_enroll_check(coalesce(contact,''),k,cred,ip_hash);
 return jsonb_build_object('mode',mode,'contact',case when mode='athlete' then contact end);
end $$;
revoke all on function public.beta_player_enroll_identity(text,text,text,text) from public,anon,authenticated;
grant execute on function public.beta_player_enroll_identity(text,text,text,text) to service_role;
