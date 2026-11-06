begin;
alter table public.beta_teams add column discoverable boolean not null default false;
grant update(discoverable) on public.beta_teams to authenticated;
create table nhf_private.join_codes(team uuid primary key references public.beta_teams on delete cascade, code text unique not null, expires timestamptz not null);
create table nhf_private.join_attempts(person uuid primary key references auth.users on delete cascade, since timestamptz not null, tries integer not null);
create table public.beta_applications(team uuid references public.beta_teams on delete cascade, person uuid references auth.users on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), status text not null default 'Pending' check(status in ('Pending','Approved','Declined')), primary key(team,person));
alter table public.beta_applications enable row level security;
revoke all on public.beta_applications from public,anon,authenticated;
grant select on public.beta_applications to authenticated;
create policy applications_read on public.beta_applications for select to authenticated using(person=auth.uid() or nhf_private.coaches(team));
create function nhf_private.admit(action text, target uuid, applicant uuid, value text, label text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); selected uuid; result text; attempts int;
begin
 if not exists(select from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Verify your email before joining a team'; end if;
 if action='list' then
   return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.beta_teams where discoverable),'[]');
 elsif action='rotate' then
   if not nhf_private.coaches(target) then raise exception 'Coach access required'; end if;
   loop
     result:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
     begin
       insert into nhf_private.join_codes values(target,result,now()+interval '7 days')
         on conflict(team) do update set code=excluded.code,expires=excluded.expires;
       exit;
     exception when unique_violation then null;
     end;
   end loop;
   return to_jsonb(result);
 elsif action='review' then
   if not nhf_private.coaches(target) or value not in ('Approved','Declined') then raise exception 'Invalid review'; end if;
   select name into strict result from public.beta_applications where team=target and person=applicant and status='Pending' for update;
   if value='Approved' then insert into public.beta_members(id,squad,name,role) values(applicant,target,result,'athlete');
     update public.beta_applications set status='Declined' where person=applicant and team<>target and status='Pending';
   end if;
   update public.beta_applications set status=value where team=target and person=applicant;
   return 'true';
 end if;
 if exists(select from public.beta_members where id=actor) then raise exception 'Account already has a team'; end if;
 if label is null or length(trim(label)) not between 1 and 100 then raise exception 'Enter your name'; end if;
 if action='apply' then
   if not exists(select from public.beta_teams where id=target and discoverable) then raise exception 'Team is private'; end if;
   insert into public.beta_applications(team,person,name) values(target,actor,trim(label)) on conflict do nothing;
 elsif action='code' then
   insert into nhf_private.join_attempts as a values(actor,now(),1) on conflict(person) do update set
     tries=case when a.since<now()-interval '1 hour' then 1 else a.tries+1 end,
     since=case when a.since<now()-interval '1 hour' then now() else a.since end returning tries into attempts;
   if attempts>5 then return to_jsonb('Too many attempts. Try again in an hour.'::text); end if;
   select team into selected from nhf_private.join_codes where code=upper(trim(value)) and expires>now();
   if selected is null then return to_jsonb('Invalid or expired code.'::text); end if;
   insert into public.beta_members(id,squad,name,role) values(actor,selected,trim(label),'athlete');
   update public.beta_applications set status=case when team=selected then 'Approved' else 'Declined' end where person=actor and status='Pending';
 else raise exception 'Unknown action'; end if;
 return 'true';
end $$;
create function public.beta_admit(action text,target uuid default null,applicant uuid default null,value text default '',label text default '') returns jsonb
language sql security invoker as $$ select nhf_private.admit(action,target,applicant,value,label) $$;
revoke all on function nhf_private.admit(text,uuid,uuid,text,text),public.beta_admit(text,uuid,uuid,text,text) from public,anon;
grant execute on function nhf_private.admit(text,uuid,uuid,text,text),public.beta_admit(text,uuid,uuid,text,text) to authenticated;
commit;
