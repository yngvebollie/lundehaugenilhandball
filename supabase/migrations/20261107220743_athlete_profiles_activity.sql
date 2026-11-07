alter table public.beta_members add column shirt_number text check(shirt_number is null or shirt_number ~ '^[1-9][0-9]{0,2}$');
grant update(shirt_number) on public.beta_members to authenticated;
create function nhf_private.shirt(value text) returns text language sql immutable set search_path='' as $s$
 select case when trim(value) ~ '^[0-9]{1,3}$' then nullif(ltrim(trim(value),'0'),'') end
$s$;
create function nhf_private.member_jersey() returns trigger language plpgsql security definer set search_path='' as $s$
begin
 if new.role='athlete' then new.shirt_number:=nhf_private.shirt(coalesce(new.shirt_number,(select raw_user_meta_data->>'shirt_number' from auth.users where id=new.id)));
 else new.shirt_number:=null;end if;return new;
end $s$;
create trigger athlete_initial_jersey before insert on public.beta_members for each row execute function nhf_private.member_jersey();
revoke all on function nhf_private.member_jersey(),nhf_private.shirt(text) from public,anon,authenticated;

alter table nhf_private.badge_links add origin text not null default 'manual' check(origin in ('manual','roster'));
create function nhf_private.manual_relink() returns trigger language plpgsql set search_path='' as $s$
begin new.origin:='manual';return new;end $s$;
create trigger manual_relink before update of player on nhf_private.badge_links for each row execute function nhf_private.manual_relink();
revoke all on function nhf_private.manual_relink() from public,anon,authenticated;
create table nhf_private.checked_roster(team uuid references public.beta_teams on delete cascade,athlete uuid references public.beta_members on delete cascade,
 first_name text not null,shirt text not null,by_coach uuid references auth.users on delete set null,checked_at timestamptz not null default now(),primary key(team,athlete));
revoke all on nhf_private.checked_roster from public,anon,authenticated;
create function nhf_private.first_name(n text) returns text language sql immutable set search_path='' as $q$
 select split_part(lower(regexp_replace(trim(n),'[[:space:]]+',' ','g')),' ',1)
$q$;
create view nhf_private.roster_matches with(security_invoker=true) as
with candidates as (
 select distinct r.team,r.id reg,r.display_name,r.org_id,u.id athlete,u.shirt_number shirt,
 k.season_player player,nhf_private.first_name(u.name) first_name
 from public.beta_team_seasons r join nhf_private.active_seasons ac on ac.team=r.team and ac.season=r.season
 join public.beta_members u on u.squad=r.team and u.role='athlete' and u.shirt_number is not null
 join nhf_private.report_identities i on i.registration=r.id and nhf_private.shirt(i.shirt)=u.shirt_number and nhf_private.first_name(i.norm)=nhf_private.first_name(u.name)
 join nhf_private.season_player_keys k on k.registration=r.id and k.player_id=i.player_id
 where r.active and exists(select from nhf_private.match_participants p join public.beta_matches g on g.id=p.match_id where g.registration=r.id and p.player_id=i.player_id and p.report_listed)
), ranked as (
 select c.*,count(*) over(partition by reg,athlete) possibilities,count(*) over(partition by reg,player) athletes from candidates c)
select q.*,p.name report_name,(possibilities=1 and athletes=1 and not exists(
 select from nhf_private.badge_links l left join nhf_private.season_player_keys lk on lk.registration=l.reg and lk.player_id=l.player
 where l.reg=q.reg and l.athlete<>q.athlete and coalesce(lk.season_player,l.player)=q.player)) safe
from ranked q join nhf_private.match_players p on p.id=q.player;
revoke all on nhf_private.roster_matches from public,anon,authenticated;

create function nhf_private.link_checked(t uuid,person uuid default null) returns void language sql set search_path='' as $s$
 insert into nhf_private.badge_links(reg,player,athlete,origin)
 select c.reg,c.player,c.athlete,'roster' from nhf_private.roster_matches c join nhf_private.checked_roster v
 on v.team=c.team and v.athlete=c.athlete and v.first_name=c.first_name and v.shirt=c.shirt
 where c.team=t and (person is null or c.athlete=person) and c.safe on conflict do nothing
$s$;
revoke all on function nhf_private.link_checked(uuid,uuid),nhf_private.first_name(text) from public,anon,authenticated;
create function nhf_private.new_report_links() returns trigger language plpgsql security definer set search_path='' as $s$
declare t uuid;
begin select team into t from public.beta_matches where id=new.match_id;
 if exists(select from nhf_private.checked_roster where team=t) then perform nhf_private.link_checked(t);end if;return null;
end $s$;
revoke all on function nhf_private.new_report_links() from public,anon,authenticated;
create constraint trigger link_roster_on_report after insert or update on nhf_private.match_reports deferrable initially deferred for each row execute function nhf_private.new_report_links();

create function nhf_private.athlete_profile(t uuid,person uuid,action text) returns jsonb language plpgsql security definer set search_path='' as $s$
declare u public.beta_members;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict u from public.beta_members where id=person and squad=t and role='athlete';
 if action='verify' then
   if u.shirt_number is null then raise exception 'Oppgi draktnummer først';end if;
   insert into nhf_private.checked_roster values(t,u.id,nhf_private.first_name(u.name),u.shirt_number,auth.uid(),now())
   on conflict(team,athlete) do update set first_name=excluded.first_name,shirt=excluded.shirt,by_coach=excluded.by_coach,checked_at=now();
   perform nhf_private.link_checked(t,u.id);
 elsif action is distinct from 'read' then raise exception 'Ugyldig handling';end if;
 return jsonb_build_object('verified',exists(select from nhf_private.checked_roster where team=t and athlete=person and first_name=nhf_private.first_name(u.name) and shirt=u.shirt_number),
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('reg',c.reg,'team',coalesce(nullif(c.display_name,''),c.org_id::text),'name',c.report_name,'shirt',c.shirt,'safe',c.safe,'linked',exists(select from nhf_private.badge_links b left join nhf_private.season_player_keys k on k.registration=b.reg and k.player_id=b.player where b.reg=c.reg and b.athlete=person and coalesce(k.season_player,b.player)=c.player)) order by c.display_name,c.report_name)
 from nhf_private.roster_matches c where c.team=t and c.athlete=person),'[]'),
 'games',coalesce((select jsonb_agg(to_jsonb(games) order by day desc) from (
 select distinct m.id,m.day,m.home,m.away,m.score,p.report_goals goals,coalesce(p.local_played,p.report_played,p.nif_played,false) played,p.shirt_number shirt,r.display_name squad
 from nhf_private.badge_links l join public.beta_team_seasons r on r.id=l.reg and r.team=t join nhf_private.active_seasons ac on ac.team=t and ac.season=r.season
 left join nhf_private.season_player_keys k on k.registration=r.id and k.player_id=l.player
 join public.beta_matches m on m.registration=r.id join nhf_private.match_participants p on p.match_id=m.id
 left join nhf_private.season_player_keys pk on pk.registration=r.id and pk.player_id=p.player_id
 where l.athlete=person and coalesce(pk.season_player,p.player_id)=coalesce(k.season_player,l.player) and (p.report_listed or p.nif_played or p.local_played)
 ) games),'[]'));
end $s$;
create function public.beta_athlete_profile(t uuid,person uuid,action text default 'read') returns jsonb language sql security invoker set search_path='' as $s$select nhf_private.athlete_profile(t,person,action)$s$;
revoke all on function public.beta_athlete_profile(uuid,uuid,text),nhf_private.athlete_profile(uuid,uuid,text) from public,anon;
grant execute on function public.beta_athlete_profile(uuid,uuid,text),nhf_private.athlete_profile(uuid,uuid,text) to authenticated;
create or replace function nhf_private.capture_signup_invite() returns trigger language plpgsql security definer set search_path='' as $$
declare k text:=new.raw_user_meta_data->>'club_invite_kind';v text:=new.raw_user_meta_data->>'club_invite_token';
begin
 if k is null and v is null then return new;end if;
 new.raw_user_meta_data:=new.raw_user_meta_data-'club_invite_kind'-'club_invite_token';
 if k in ('link','email') and v ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or k in ('coach_code','athlete_code') and v ~ '^[A-Z0-9]{6}$' then
  insert into nhf_private.signup_intents(person,kind,credential,signature) values(new.id,k,v,sha256(convert_to(v,'UTF8')));
 end if;
 return new;
end $$;
create or replace function nhf_private.finish_signup_invite() returns trigger language plpgsql security definer set search_path='' as $$
declare i nhf_private.signup_intents;dest uuid;role_name text;m public.beta_members;nm text:=trim(new.raw_user_meta_data->>'full_name');
 ph text:=trim(new.raw_user_meta_data->>'contact_phone');
begin
 if new.email_confirmed_at is null then return new;end if;
 select * into i from nhf_private.signup_intents where person=new.id and state='pending' for update;
 if not found then return new;end if;
 if i.kind='link' then select team,role into dest,role_name from nhf_private.application_links where token=i.credential::uuid and direct and expires>now() for share;
 elsif i.kind='email' then select team,role into dest,role_name from nhf_private.invites where token=i.credential::uuid and email=lower(new.email) and expires>now() for update;
 elsif i.kind='athlete_code' then select team,'athlete' into dest,role_name from nhf_private.join_codes where code=i.credential and expires>now() for share;
 elsif i.kind='coach_code' then select team,'coach' into dest,role_name from nhf_private.coach_codes where code=i.credential and expires>now() for update;
 end if;
 if dest is null then update nhf_private.signup_intents set state='unavailable',credential=null where person=new.id;return new;end if;
 if length(coalesce(nm,'')) not between 1 and 100 or coalesce(ph,'') !~ '^[+0-9() .-]{7,30}$' or length(regexp_replace(ph,'[^0-9]','','g')) not between 7 and 15 then return new;end if;
 if role_name='coach' and not exists(select from nhf_private.team_admins where team=dest) then return new;end if;
 insert into public.beta_members(id,squad,name,role) values(new.id,dest,nm,role_name) on conflict(id) do nothing;
 select * into strict m from public.beta_members where id=new.id for update;
 if m.role<>role_name or (m.role='athlete' and m.squad<>dest) then
  update nhf_private.signup_intents set state='conflict',credential=null where person=new.id;return new;end if;
 if m.role='coach' and m.squad<>dest then insert into nhf_private.extra_coaches values(new.id,dest) on conflict do nothing;end if;
 insert into public.beta_applications(team,person,name,phone,email,role,status) values(dest,new.id,nm,ph,lower(new.email),role_name,'Approved')
 on conflict(team,person) do update set status='Approved',role=excluded.role,phone=excluded.phone,name=excluded.name,email=excluded.email;
 if m.role='athlete' then update public.beta_applications set status='Declined' where person=new.id and status='Pending' and team<>dest;end if;
 if i.kind='coach_code' then delete from nhf_private.coach_codes where team=dest and code=i.credential;
 elsif i.kind='email' then delete from nhf_private.invites where token=i.credential::uuid;end if;
 update nhf_private.signup_intents set state='joined',team=dest,credential=null where person=new.id;
 return new;
end $$;
-- Previously recorded checks have no reliable wall-clock timestamp.
alter table public.beta_checks add column checked_at timestamptz;
alter table public.beta_checks alter column checked_at set default now();
alter table public.beta_workout_reviews add column reviewed_at timestamptz;
alter table public.beta_workout_reviews alter column reviewed_at set default now();
create function nhf_private.coach_activity(t uuid,person uuid,n int) returns jsonb language plpgsql stable security definer set search_path='' as $activity$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 if person is not null and not exists(select from public.beta_members where id=person and squad=t and role='athlete') then raise exception 'Utøver ikke på laget';end if;
 return (with events as (
 select 'check:'||b.id||':'||c.step id,b.athlete,b.day,c.checked_at at_time,'exercise' kind,b.exercises[c.step+1] title,b.title detail
 from public.beta_checks c join public.beta_assignments b on c.assignment=b.id where b.squad=t
 union all select 'review:'||b.id,b.athlete,b.day,v.reviewed_at,'review',b.title,'Leverte øktvurdering' from public.beta_workout_reviews v join public.beta_assignments b on b.id=v.assignment where b.squad=t
 union all select 'challenge:'||e.entry,e.athlete,(e.logged_at at time zone 'Europe/Oslo')::date,e.logged_at,'challenge',z.title,concat(e.amount,' ',z.unit,case when e.exercise is null then '' else ' · '||e.exercise end)
 from nhf_private.challenge_entries e join nhf_private.challenges z on z.id=e.challenge where z.team=t and not z.anonymous
 ), subset as (select e.*,u.name from events e join public.beta_members u on u.squad=t and u.id=e.athlete and u.role='athlete'
 where person is null or e.athlete=person order by coalesce(at_time,(day::timestamp at time zone 'Europe/Oslo')) desc,id limit least(200,greatest(1,coalesce(n,40))))
 select coalesce(jsonb_agg(to_jsonb(q) order by coalesce(at_time,(day::timestamp at time zone 'Europe/Oslo')) desc,id),'[]') from subset q);
end $activity$;
create function public.beta_coach_activity(t uuid,person uuid default null,n int default 40) returns jsonb language sql stable security invoker set search_path='' as $activity$select nhf_private.coach_activity(t,person,n)$activity$;
revoke all on function public.beta_coach_activity(uuid,uuid,int),nhf_private.coach_activity(uuid,uuid,int) from public,anon;
grant execute on function public.beta_coach_activity(uuid,uuid,int),nhf_private.coach_activity(uuid,uuid,int) to authenticated;
create function nhf_private.redeem_athlete_code(code text,label text,phone text) returns jsonb language plpgsql security definer set search_path='' as $s$
declare actor uuid:=auth.uid();email_address text;u public.beta_members;r jsonb;
begin
 select lower(email) into strict email_address from auth.users where id=actor and email_confirmed_at is not null;
 if length(trim(coalesce(label,''))) not between 1 and 100 or coalesce(phone,'') !~ '^[+0-9() .-]{7,30}$' or length(regexp_replace(phone,'[^0-9]','','g')) not between 7 and 15 then raise exception 'Kontroller navn og telefonnummer';end if;
 select * into u from public.beta_members where id=actor;
 if found then
  if u.role<>'athlete' or not exists(select from nhf_private.join_codes c where c.team=u.squad and c.code=upper(trim($1)) and c.expires>now()) then raise exception 'Kontoen tilhører allerede et lag eller en annen rolle';end if;
 else
  r:=nhf_private.admit('code',null,null,upper(trim(code)),label);if r<>'true'::jsonb then return jsonb_build_object('error',r#>>'{}');end if;
  select * into strict u from public.beta_members where id=actor;
 end if;
 insert into public.beta_applications(team,person,name,email,phone,role,status) values(u.squad,actor,trim(label),email_address,trim(phone),'athlete','Approved')
 on conflict(team,person) do update set status='Approved',name=excluded.name,email=excluded.email,phone=excluded.phone,role='athlete';
 return (select jsonb_build_object('id',id,'name',name,'role','athlete','direct',true) from public.beta_teams where id=u.squad);
end $s$;
create function public.beta_redeem_athlete_code(code text,label text,phone text) returns jsonb language sql security invoker set search_path='' as $s$select nhf_private.redeem_athlete_code(code,label,phone)$s$;
revoke all on function nhf_private.redeem_athlete_code(text,text,text),public.beta_redeem_athlete_code(text,text,text) from public,anon;
grant execute on function nhf_private.redeem_athlete_code(text,text,text),public.beta_redeem_athlete_code(text,text,text) to authenticated;
create function nhf_private.roster_ids(t uuid) returns jsonb language plpgsql stable security definer set search_path='' as $r$
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('reg',r.id,'player',coalesce(k.season_player,l.player),'athlete',l.athlete)),'[]')
 from nhf_private.badge_links l join public.beta_team_seasons r on r.id=l.reg and r.team=t join nhf_private.active_seasons current_season on current_season.team=t and current_season.season=r.season
 join public.beta_members u on u.id=l.athlete and u.role='athlete' and u.squad=t left join nhf_private.season_player_keys k on k.registration=r.id and k.player_id=l.player);
end $r$;
create function public.beta_roster_ids(t uuid) returns jsonb language sql stable security invoker set search_path='' as $r$select nhf_private.roster_ids(t)$r$;
revoke all on function nhf_private.roster_ids(uuid),public.beta_roster_ids(uuid) from public,anon;
grant execute on function nhf_private.roster_ids(uuid),public.beta_roster_ids(uuid) to authenticated;

