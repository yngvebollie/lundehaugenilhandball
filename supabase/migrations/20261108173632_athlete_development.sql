-- Service-only gateway. The Next route verifies the bearer token, applies the
-- domain rules, and passes the verified actor; no browser can call this RPC.
create table nhf_private.dev_policy(team uuid primary key references public.beta_teams(id) on delete cascade,
 active_limit smallint not null default 3 check(active_limit between 1 and 10),keeper_approved boolean not null default false,
 keeper_axes text[] not null default array['posisjonering','forflytning','redningsteknikk','skuddlesing','igangsetting','samspill','fotarbeid','spilleforstaelse'],
 check(cardinality(keeper_axes) between 3 and 8 and keeper_axes <@ array['posisjonering','forflytning','redningsteknikk','skuddlesing','igangsetting','samspill','fotarbeid','spilleforstaelse']));
create table nhf_private.dev_plans(team uuid not null,athlete uuid not null,rev int not null default 0,doc jsonb not null default '{}',
 primary key(team,athlete),foreign key(athlete) references public.beta_members(id) on delete cascade,foreign key(team) references public.beta_teams(id) on delete cascade);
create table nhf_private.dev_notes(team uuid,athlete uuid,id text,writer uuid,at_time timestamptz not null default now(),note text not null,
 primary key(team,athlete,id),foreign key(team,athlete) references nhf_private.dev_plans on delete cascade);
create table nhf_private.dev_audit(team uuid,athlete uuid,rev int,actor uuid,at_time timestamptz default now(),event jsonb not null,
 primary key(team,athlete,rev),foreign key(team,athlete) references nhf_private.dev_plans on delete cascade);
create table nhf_private.dev_outbox(team uuid,athlete uuid,source text,badge text,eligible boolean not null,revision int not null,
 primary key(team,athlete,source,badge),foreign key(team,athlete) references nhf_private.dev_plans on delete cascade);
revoke all on nhf_private.dev_plans,nhf_private.dev_policy,nhf_private.dev_audit,nhf_private.dev_notes,nhf_private.dev_outbox from public,anon,authenticated;
create function public.beta_development_gateway(t uuid,p uuid,actor uuid,mode text default 'read',expected int default 0,
 next_doc jsonb default null,entry jsonb default null,note text default null,exercise_id uuid default null,session_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $dev$
declare coach boolean; r nhf_private.dev_plans; policy nhf_private.dev_policy;role_key text;
begin
 if not exists(select from public.beta_members where id=p and squad=t and role='athlete') then raise exception 'Utøver ikke tilgjengelig';end if;
 select exists(select from public.beta_members m where m.id=actor and m.role='coach' and (m.squad=t or exists(select from nhf_private.extra_coaches c where c.coach=actor and c.team=t))) into coach;
 if actor is null or not coach and actor<>p then raise exception 'Ingen tilgang';end if;
 select * into policy from nhf_private.dev_policy where team=t;
 if mode='write' then
  if jsonb_typeof(next_doc) is distinct from 'object' or jsonb_typeof(entry) is distinct from 'object' or pg_column_size(next_doc)>4000000 then raise exception 'Ugyldig utviklingsplan';end if;
  if not coach and coalesce(entry->>'action','') not in ('propose','review','practice','editPractice','revokePractice') then raise exception 'Trenertilgang kreves';end if;
  if note is not null and (not coach or length(note) not between 1 and 1000) then raise exception 'Ugyldig notat';end if;
  if exercise_id is not null and not exists(select from public.beta_exercises where id=exercise_id and squad=t) or session_id is not null and not exists(select from public.beta_assignments where id=session_id and squad=t and athlete=p) then raise exception 'Ugyldig øvelse eller økt';end if;
  if (select count(*) from jsonb_array_elements(next_doc->'goals') g where g->>'status' in ('active','awaiting_review'))>coalesce(policy.active_limit,3) then raise exception 'For mange aktive mål';end if;
  insert into nhf_private.dev_plans(team,athlete) values(t,p) on conflict do nothing;
  update nhf_private.dev_plans set doc=next_doc,rev=rev+1 where team=t and athlete=p and rev=expected returning * into r;
  if not found then raise exception 'Versjonskonflikt';end if;
  insert into nhf_private.dev_audit(team,athlete,rev,actor,event) values(t,p,r.rev,actor,entry);
  if note is not null then insert into nhf_private.dev_notes(team,athlete,id,writer,note) values(t,p,entry->>'id',actor,note);end if;
  -- Stable sources only. Delivery stays off until historical award correction is approved.
  update nhf_private.dev_outbox x set eligible=false,revision=r.rev where x.team=t and x.athlete=p and x.eligible
   and not exists(select from jsonb_array_elements(entry->'outbox') z where z->>'source'=x.source and z->>'badge'=x.badge);
  insert into nhf_private.dev_outbox(team,athlete,source,badge,eligible,revision)
   select t,p,z->>'source',z->>'badge',true,r.rev from jsonb_array_elements(entry->'outbox') z
   where z->>'badge' in ('goal_getter','mission_complete','skill_collector','rising_star')
   on conflict(team,athlete,source,badge) do update set eligible=true,revision=excluded.revision where not nhf_private.dev_outbox.eligible;
 elsif mode='read' then select * into r from nhf_private.dev_plans where team=t and athlete=p;
 else raise exception 'Ugyldig handling';end if;
 return jsonb_build_object('coach',coach,'rev',coalesce(r.rev,0),'plan',r.doc,'limit',coalesce(policy.active_limit,3),'keeper',coalesce(policy.keeper_approved,false),'keeperAxes',policy.keeper_axes,
 'notes',case when coach then (select coalesce(jsonb_agg(jsonb_build_object('at',at_time,'text',note_row.note) order by at_time desc),'[]') from nhf_private.dev_notes note_row where team=t and athlete=p) else '[]'::jsonb end,
 'library',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',name,'instructions',dose)),'[]') from public.beta_exercises where squad=t),
 'sessions',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'day',day) order by day desc),'[]') from public.beta_assignments where squad=t and athlete=p));
end $dev$;
revoke all on function public.beta_development_gateway(uuid,uuid,uuid,text,int,jsonb,jsonb,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.beta_development_gateway(uuid,uuid,uuid,text,int,jsonb,jsonb,text,uuid,uuid) to service_role;
