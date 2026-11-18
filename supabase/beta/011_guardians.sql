-- Guardian identities stay separate from athlete/coach memberships.
create table nhf_private.guardian_invites (
 id uuid primary key default gen_random_uuid(), team uuid not null references public.beta_teams,
 athlete uuid references public.beta_members on delete cascade, child_name text not null,
 email text not null, digest bytea not null unique, child_token uuid,
 created_by uuid not null references auth.users, created_at timestamptz not null default now(),
 expires timestamptz not null default now()+interval '7 days',
 guardian uuid references auth.users on delete cascade, accepted_at timestamptz, revoked_at timestamptz,
 check(length(child_name) between 1 and 100), check(length(email) between 3 and 254)
);
create index guardian_by_account on nhf_private.guardian_invites(guardian,athlete) where revoked_at is null;
create index guardian_by_team on nhf_private.guardian_invites(team,created_at desc);
create table nhf_private.guardian_audit(id bigint generated always as identity primary key, invitation uuid not null references nhf_private.guardian_invites,
 actor uuid references auth.users, action text not null, at_time timestamptz not null default now());
alter table nhf_private.guardian_invites enable row level security;
alter table nhf_private.guardian_audit enable row level security;
revoke all on nhf_private.guardian_invites,nhf_private.guardian_audit from public,anon,authenticated;

create function nhf_private.guards(p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select from nhf_private.guardian_invites g join public.beta_members m on m.id=g.athlete and m.squad=g.team and m.role='athlete'
 where g.guardian=auth.uid() and g.athlete=p and g.accepted_at is not null and g.revoked_at is null)
$$;
revoke all on function nhf_private.guards(uuid) from public,anon,authenticated;

create function public.beta_guardian_invite(t uuid,p uuid,address text,child text) returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text||gen_random_uuid()::text; kid uuid; r nhf_private.guardian_invites; nm text;
begin
 if not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 if address is null or length(address)>254 or trim(address)!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Oppgi gyldig e-post til foresatt';end if;
 if (select count(*) from nhf_private.guardian_invites where created_by=auth.uid() and created_at>now()-interval '1 hour')>=50 then raise exception 'For mange invitasjoner. Prøv igjen senere.';end if;
 if p is not null then
  select name into nm from public.beta_members where id=p and squad=t and role='athlete';
  if nm is null then raise exception 'Velg en utøver fra laget';end if;
  if exists(select from nhf_private.guardian_invites where athlete=p and email=lower(trim(address)) and revoked_at is null and (accepted_at is not null or expires>now())) then raise exception 'Foresatt er allerede invitert eller koblet. Avslutt den gamle invitasjonen først.';end if;
 else
  nm:=trim(child);if coalesce(length(nm),0) not between 1 and 100 then raise exception 'Oppgi spillerens navn';end if;
  insert into nhf_private.invites(team,email,role) values(t,'','athlete') returning nhf_private.invites.token into kid;
 end if;
 insert into nhf_private.guardian_invites(team,athlete,child_name,email,digest,child_token,created_by)
 values(t,p,nm,lower(trim(address)),sha256(convert_to(token,'UTF8')),kid,auth.uid()) returning * into r;
 insert into nhf_private.guardian_audit(invitation,actor,action) values(r.id,auth.uid(),'invited');
 return jsonb_build_object('id',r.id,'token',token,'email',r.email,'child',r.child_name);
end $$;

create function public.beta_guardian_accept(code text) returns uuid language plpgsql security definer set search_path='' as $$
declare r nhf_private.guardian_invites; addr text;
begin
 select lower(email) into addr from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if addr is null or exists(select from public.beta_members where id=auth.uid() and role='athlete') then raise exception 'Logg inn med foresattkontoen';end if;
 select * into r from nhf_private.guardian_invites where digest=sha256(convert_to(code,'UTF8')) for update;
 if not found or r.revoked_at is not null or r.email<>addr or (r.guardian is not null and r.guardian<>auth.uid()) then raise exception 'Invitasjonen er ikke tilgjengelig for denne kontoen';end if;
 if r.guardian=auth.uid() and r.accepted_at is not null then return r.id;end if;
 if r.expires<=now() then raise exception 'Invitasjonen er utløpt. Be treneren sende en ny.';end if;
 update nhf_private.guardian_invites set guardian=auth.uid(),accepted_at=now() where id=r.id;
 insert into nhf_private.guardian_audit(invitation,actor,action) values(r.id,auth.uid(),'accepted');
 return r.id;
end $$;

create function public.beta_guardian_revoke(wanted uuid) returns void language plpgsql security definer set search_path='' as $$
declare r nhf_private.guardian_invites;
begin
 select * into r from nhf_private.guardian_invites where id=wanted for update;
 if not found or not nhf_private.coaches(r.team) then raise exception 'Trenertilgang kreves';end if;
 if r.revoked_at is not null then return;end if;
 update nhf_private.guardian_invites set revoked_at=now() where id=r.id;
 if r.athlete is null then delete from nhf_private.invites where token=r.child_token;end if;
 insert into nhf_private.guardian_audit(invitation,actor,action) values(r.id,auth.uid(),'revoked');
end $$;

create function public.beta_guardian_list(t uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 return jsonb_build_object('invitations',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'athlete',g.athlete,'child',coalesce(m.name,g.child_name),'email',g.email,'created',g.created_at,'expires',g.expires,'accepted',g.accepted_at,'revoked',g.revoked_at) order by g.created_at desc)
 from nhf_private.guardian_invites g left join public.beta_members m on m.id=g.athlete where g.team=t),'[]'),
 'audit',coalesce((select jsonb_agg(x) from (select a.action,a.at_time,coalesce(m.name,u.email,'Ukjent konto') actor,g.child_name child from nhf_private.guardian_audit a join nhf_private.guardian_invites g on g.id=a.invitation left join public.beta_members m on m.id=a.actor left join auth.users u on u.id=a.actor where g.team=t order by a.at_time desc limit 100) x),'[]'));
end $$;

-- Called only by the registration server. Possession of the emailed token proves
-- access to the invited address; existing accounts must sign in, never be reset.
create function public.beta_guardian_registration(code text,bucket text) returns text language plpgsql security definer set search_path='' as $$
declare n integer;addr text; h timestamptz:=date_trunc('hour',now());
begin
 insert into nhf_private.player_enroll_limits as x values('guardian:'||bucket,h,1) on conflict(k) do update set hour=h,n=case when x.hour=h then x.n+1 else 1 end returning x.n into n;
 if n>20 then raise exception 'For mange forsøk';end if;
 select email into addr from nhf_private.guardian_invites where digest=sha256(convert_to(code,'UTF8')) and revoked_at is null and guardian is null and expires>now();
 return addr;
end $$;

create function nhf_private.guardian_child_joined() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if new.state='joined' and old.state is distinct from 'joined' and new.kind='email' then
  for r in update nhf_private.guardian_invites g set athlete=new.person
   where g.athlete is null and g.revoked_at is null and g.team=new.team and sha256(convert_to(g.child_token::text,'UTF8'))=new.signature
   and exists(select from public.beta_members m where m.id=new.person and m.squad=g.team and m.role='athlete') returning g.id loop
   insert into nhf_private.guardian_audit(invitation,actor,action) values(r.id,new.person,'child_joined');
  end loop;
 end if;return new;
end $$;
create trigger guardian_child_joined after update of state on nhf_private.signup_intents for each row execute function nhf_private.guardian_child_joined();
revoke all on function nhf_private.guardian_child_joined() from public,anon,authenticated;
create function nhf_private.guardian_identity_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select from auth.users where id=new.id and raw_app_meta_data->>'club_login'='guardian') then raise exception 'Bruk en egen spillerkonto. Foresattkontoen kan ikke bli utøver eller trener.';end if;
 return new;
end $$;
create trigger guardian_identity_guard before insert or update of role on public.beta_members for each row execute function nhf_private.guardian_identity_guard();
revoke all on function nhf_private.guardian_identity_guard() from public,anon,authenticated;
create or replace function public.beta_player_enroll_identity(addr text,k text,cred text,ip_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare contact text:=nullif(addr,''); mode text;
begin
 if k='email' then
  update nhf_private.invites i set email=coalesce(addr,'') where i.token::text=cred and i.role='athlete' and i.expires>now()
   and exists(select from nhf_private.guardian_invites g where g.child_token=i.token and g.athlete is null and g.revoked_at is null and g.accepted_at is not null);
 end if;
 if contact is null and k='email' then select i.email into contact from nhf_private.invites i where i.token::text=cred and i.role='athlete' and i.expires>now();end if;
 mode:=public.beta_player_enroll_check(coalesce(contact,''),k,cred,ip_hash);
 return jsonb_build_object('mode',mode,'contact',case when mode='athlete' then contact end);
end $$;

create function public.beta_guardian_children() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'athlete',m.id,'name',coalesce(m.name,g.child_name),'team',g.team,'team_name',t.name,'photo',m.photo,'shirt',m.shirt_number,'position',m.position,
 'registration',case when m.id is null and g.expires>now() then g.child_token end,'expired',m.id is null and g.expires<=now()) order by coalesce(m.name,g.child_name)),'[]')
 from nhf_private.guardian_invites g join public.beta_teams t on t.id=g.team left join public.beta_members m on m.id=g.athlete and m.squad=g.team and m.role='athlete'
 where g.guardian=auth.uid() and g.accepted_at is not null and g.revoked_at is null and (g.athlete is null or m.id is not null)
$$;

create function nhf_private.family_fixture_log(person uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with me as (select id,squad from public.beta_members where id=person and role='athlete' and (id=auth.uid() or nhf_private.guards(id))),
 regs as (select r.* from me join nhf_private.active_seasons s on s.team=me.squad join public.beta_team_seasons r on r.team=s.team and r.season=s.season),
 own_keys as (select distinct l.reg,coalesce(k.season_player,l.player) player from me join nhf_private.badge_links l on l.athlete=me.id join regs on regs.id=l.reg left join nhf_private.season_player_keys k on k.registration=l.reg and k.player_id=l.player),
 fixtures as (select m.*,coalesce(nullif(r.display_name,''),'Lag '||r.org_id) team_name,case when m.opponent=m.away then 'A' when m.opponent=m.home then 'B' end side from regs r join public.beta_matches m on m.team=r.team and m.registration=r.id),
 source as (select m.id,i.player_id,x.value line from fixtures m join nhf_private.match_reports d on d.match_id=m.id cross join lateral jsonb_array_elements(d.reviewed->'players') x
 join nhf_private.report_identities i on i.registration=m.registration and i.norm=lower(regexp_replace(trim(x.value->>'name'),'[[:space:]]+',' ','g')) and i.shirt=x.value->>'shirt' where x.value->>'side'=m.side),
 personal as (select m.id,max(coalesce(p.report_goals,s.shots_hit)) goals,max(p.report_warnings) warnings,max(s.goalkeeper_saves) saves,
 max((z.line->>'penalty')::int) penalty,max((z.line->>'suspensions')::int) suspensions,max(((z.line->>'disqualification')::boolean)::int) disqualifications
 from fixtures m join nhf_private.match_participants p on p.team=m.team and p.match_id=m.id left join nhf_private.season_player_keys k on k.registration=m.registration and k.player_id=p.player_id
 join own_keys l on l.reg=m.registration and l.player=coalesce(k.season_player,p.player_id) left join nhf_private.player_match_statistics s on s.match_id=m.id and s.player_id=p.player_id left join source z on z.id=m.id and z.player_id=p.player_id
 where m.completed and coalesce(p.local_played,p.report_played,p.nif_played,false) group by m.id having count(distinct coalesce(k.season_player,p.player_id))=1),
 games as (select m.id,coalesce('nif:'||m.nif_id::text,m.id::text) fixture,m.registration reg,m.team_name,m.day,m.start_time::text time,m.opponent,coalesce(nullif(concat_ws(' – ',m.home,m.away),''),m.opponent) title,m.venue,m.score,m.completed,p.id is not null played,p.goals,p.warnings,p.saves,p.penalty,p.suspensions,p.disqualifications,
 case when m.completed and m.score ~ '^[0-9]+[-:][0-9]+$' and m.side is not null then
 case when split_part(replace(m.score,':','-'),'-',1)::int=split_part(replace(m.score,':','-'),'-',2)::int then 'D'
 when (split_part(replace(m.score,':','-'),'-',1)::int>split_part(replace(m.score,':','-'),'-',2)::int)=(m.side='A') then 'W' else 'L' end end result
 from fixtures m left join personal p on p.id=m.id
 union all select g.id,'cup:'||g.id::text,r.id,coalesce(r.display_name,'Lag '||r.org_id),g.day,null,g.opponent,c.name||' · mot '||g.opponent,null,
 case when g.scored is not null then g.scored||'-'||g.conceded||' (egne mål først)' end,g.scored is not null,me.id=any(g.played),null,null,null,null,null,null,
 case when g.scored>g.conceded then 'W' when g.scored<g.conceded then 'L' when g.scored=g.conceded then 'D' end
 from regs r join public.beta_cups c on c.registration=r.id and c.team=r.team join public.beta_cup_games g on g.team=c.team and g.cup=c.id cross join me)
 select coalesce(jsonb_agg(to_jsonb(games) order by day,time,id),'[]') from games
$$;
revoke all on function nhf_private.family_fixture_log(uuid) from public,anon,authenticated;
create or replace function nhf_private.my_fixture_log() returns jsonb language sql stable security definer set search_path='' as $$select nhf_private.family_fixture_log(auth.uid())$$;
revoke all on function nhf_private.my_fixture_log() from public,anon;
grant execute on function nhf_private.my_fixture_log() to authenticated;

create function nhf_private.family_awards(p uuid,t uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with votes as (select b.category,b.at_time,(select min(v.mid::text) from nhf_private.ballot_participants v where v.team=b.team and v.fixture=b.fixture and v.athlete=p) match,
 row_number() over(partition by b.category order by b.at_time,b.fixture,b.giver) n
 from nhf_private.match_ballots b where b.team=t and b.recipient=p
 and exists(select from nhf_private.ballot_participants v where v.team=b.team and v.fixture=b.fixture and v.athlete=p)
 and exists(select from nhf_private.ballot_participants v where v.team=b.team and v.fixture=b.fixture and v.athlete=b.giver)),
 vote_awards as (select v.category key,l.level,v.at_time at,v.match from votes v join (values (1,3),(2,10),(3,25)) l(level,threshold)
 on v.n=greatest(1,l.threshold-coalesce((select sum(e.quantity) from nhf_private.badge_events e where e.athlete=p and e.key=v.category),0))
 where not exists(select from nhf_private.badge_unlocks b where b.athlete=p and b.key=v.category and b.level=l.level)),
 awards as (select jsonb_build_object('key',b.key,'level',b.level,'at',b.earned_at) a from nhf_private.badge_unlocks b where b.athlete=p and b.key<>'hat_trick_hero' and not exists(select from vote_awards v where v.key=b.key and v.level=b.level)
 union all select jsonb_build_object('key',v.key,'level',v.level,'at',v.at,'match',v.match) from vote_awards v
 union all select jsonb_build_object('key','hat_trick_hero','level',case when h.goals>=10 then 3 when h.goals>=5 then 2 else 1 end,'at',h.day,'match',h.game_id,'goals',h.goals,'opponent',h.opponent) from nhf_private.scoring_match_history h where h.team=t and h.athlete=p)
 select coalesce(jsonb_agg(a),'[]') from awards
$$;
revoke all on function nhf_private.family_awards(uuid,uuid) from public,anon,authenticated;

-- Never expose a coach document wholesale. Whitelist the fields shared with families.
create function public.beta_guardian_snapshot(p uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t uuid;
begin
 if not nhf_private.guards(p) then raise exception 'Ingen foresattilgang til denne spilleren';end if;
 select squad into strict t from public.beta_members where id=p and role='athlete';
 return jsonb_build_object(
 'plans',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'day',a.day,'time',a.start_time,'minutes',a.minutes,'kind',a.kind,'exercises',a.exercises,'sets',a.logged_sets,'done',(select count(*) from public.beta_checks c where c.assignment=a.id)) order by a.day desc,a.id) from public.beta_assignments a where a.athlete=p and a.squad=t),'[]'),
 'sessions',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.shared->>'title','start',s.shared->>'start','venue',s.shared->>'venue','goal',s.shared->>'goal','items',s.shared->'items') order by s.shared->>'start') from nhf_private.court_sessions s where s.team=t and not s.archived and s.shared is not null and (s.audience is null or p=any(s.audience))),'[]'),
 'notices',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'body',n.body,'day',n.starts_on) order by n.starts_on desc) from public.beta_notices n where n.squad=t and n.athlete=p and n.starts_on<=(now() at time zone 'Europe/Oslo')::date),'[]'),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g->>'id','title',g->>'title','intention',g->>'intention','criteria',g->>'criteria','stage',g->'stage','status',g->>'status')) from nhf_private.dev_plans d cross join lateral jsonb_array_elements(d.doc->'goals') g where d.team=t and d.athlete=p and nullif(g->>'agreedAt','') is not null and g->>'status' not in ('draft','proposed')),'[]'),
 'awards',nhf_private.family_awards(p,t),
 'games',nhf_private.family_fixture_log(p));
end $$;

revoke all on function public.beta_guardian_invite(uuid,uuid,text,text),public.beta_guardian_accept(text),public.beta_guardian_revoke(uuid),public.beta_guardian_list(uuid),public.beta_guardian_children(),public.beta_guardian_snapshot(uuid),public.beta_guardian_registration(text,text) from public,anon,authenticated;
grant execute on function public.beta_guardian_invite(uuid,uuid,text,text),public.beta_guardian_accept(text),public.beta_guardian_revoke(uuid),public.beta_guardian_list(uuid),public.beta_guardian_children(),public.beta_guardian_snapshot(uuid) to authenticated;
grant execute on function public.beta_guardian_registration(text,text) to service_role;
alter table public.beta_invitation_deliveries drop constraint beta_invitation_deliveries_member_role_check;
alter table public.beta_invitation_deliveries add constraint beta_invitation_deliveries_member_role_check check(member_role in ('athlete','coach','guardian'));
