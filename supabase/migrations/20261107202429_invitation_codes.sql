create table nhf_private.coach_codes(team uuid primary key references public.beta_teams on delete cascade,code text unique not null,expires timestamptz not null);
revoke all on nhf_private.coach_codes from public,anon,authenticated;
create function nhf_private.invitation_code(action text,t uuid,kind text,input text,label text,phone text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();email_address text;value text;result jsonb;tries_used int;selected uuid;token uuid;
begin
 select lower(email) into strict email_address from auth.users where id=actor and email_confirmed_at is not null;
 if kind not in ('athlete','coach') or kind is null then raise exception 'Ugyldig rolle';end if;
 if action in ('get','issue','revoke') then
  if not nhf_private.coaches(t) or (kind='coach' and not nhf_private.admin_of(t)) then raise exception 'Ikke tilgang til denne rollen';end if;
  if action='issue' and kind='athlete' then perform nhf_private.admit('rotate',t,null,'','');
  elsif action='issue' then
   loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',1+(('x'||left(gen_random_uuid()::text,8))::bit(32)::bigint%32)::int,1),'' order by i) into value from generate_series(1,6)i;
    begin insert into nhf_private.coach_codes values(t,value,now()+interval '24 hours') on conflict(team) do update set code=excluded.code,expires=excluded.expires;exit;
    exception when unique_violation then null;end;
   end loop;
  elsif action='revoke' then
   if kind='coach' then delete from nhf_private.coach_codes where team=t;else delete from nhf_private.join_codes where team=t;end if;
  end if;
  if kind='coach' then select jsonb_build_object('code',c.code,'expires',c.expires) into result from nhf_private.coach_codes c where team=t and expires>now();
  else select jsonb_build_object('code',c.code,'expires',c.expires) into result from nhf_private.join_codes c where team=t and expires>now();end if;return result;
 end if;
 if action is distinct from 'redeem' or kind<>'coach' then raise exception 'Ugyldig handling';end if;
 if length(trim(coalesce(label,''))) not between 1 and 100 or coalesce(phone,'') !~ '^[+0-9() .-]{7,30}$' or length(regexp_replace(phone,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Kontroller navn og telefonnummer';end if;
 insert into nhf_private.join_attempts as a values(actor,now(),1) on conflict(person) do update set tries=case when a.since<now()-interval '1 hour' then 1 else a.tries+1 end,since=case when a.since<now()-interval '1 hour' then now() else a.since end returning tries into tries_used;
 if tries_used>5 then return jsonb_build_object('error','For mange forsøk. Prøv igjen om en time.');end if;
 select team into selected from nhf_private.coach_codes where code=upper(trim(input)) and expires>now() for update;
 if selected is null then return jsonb_build_object('error','Koden er ugyldig, brukt eller utløpt.');end if;
 if not exists(select from nhf_private.team_admins where team=selected) then raise exception 'Laget trenger en admintrener først';end if;
 insert into nhf_private.invites(team,email,role) values(selected,email_address,'coach') returning invites.token into token;
 perform nhf_private.join_team(token,trim(label));
 insert into public.beta_applications(team,person,name,phone,email,role,status) values(selected,actor,trim(label),trim(phone),email_address,'coach','Approved')
 on conflict(team,person) do update set name=excluded.name,phone=excluded.phone,email=excluded.email,role='coach',status='Approved';
 delete from nhf_private.coach_codes where team=selected;
 return (select jsonb_build_object('id',id,'name',name,'role','coach','direct',true) from public.beta_teams where id=selected);
end $$;
create function public.beta_invitation_code(action text,t uuid,kind text,input text default '',label text default '',phone text default '')
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.invitation_code(action,t,kind,input,label,phone)$$;
revoke all on function public.beta_invitation_code(text,uuid,text,text,text,text),nhf_private.invitation_code(text,uuid,text,text,text,text) from public,anon;
grant execute on function public.beta_invitation_code(text,uuid,text,text,text,text),nhf_private.invitation_code(text,uuid,text,text,text,text) to authenticated;
