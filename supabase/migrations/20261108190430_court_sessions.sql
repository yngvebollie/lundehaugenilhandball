create table nhf_private.court_builtin(id text primary key);
insert into nhf_private.court_builtin values ('strength:back-squat'),('strength:front-squat'),('strength:goblet-squat'),('strength:split-squat'),('strength:rear-foot-elevated-split-squat'),('strength:reverse-lunge'),('strength:lateral-lunge'),('strength:step-up'),('strength:romanian-deadlift'),('strength:single-leg-romanian-deadlift'),('strength:trap-bar-deadlift'),('strength:hip-thrust'),('strength:single-leg-glute-bridge'),('strength:assisted-nordic-curl'),('strength:slider-hamstring-curl'),('strength:standing-calf-raise'),('strength:seated-calf-raise'),('strength:copenhagen-short-lever-hold'),('strength:lateral-band-walk'),('strength:leg-press'),('strength:bench-press'),('strength:dumbbell-bench-press'),('strength:push-up'),('strength:incline-dumbbell-press'),('strength:half-kneeling-landmine-press'),('strength:dumbbell-overhead-press'),('strength:pull-up'),('strength:lat-pulldown'),('strength:one-arm-dumbbell-row'),('strength:seated-cable-row'),('strength:inverted-row'),('strength:face-pull'),('strength:band-external-rotation'),('strength:band-internal-rotation'),('strength:prone-y-raise'),('strength:dumbbell-pullover'),('strength:front-plank'),('strength:side-plank'),('strength:dead-bug'),('strength:bird-dog'),('strength:pallof-press'),('strength:cable-woodchop'),('strength:suitcase-carry'),('strength:ab-wheel-rollout'),('strength:hanging-knee-raise'),('strength:shoulder-tap-plank'),('strength:medicine-ball-rotational-throw'),('strength:medicine-ball-chest-pass'),('strength:kettlebell-swing'),('strength:push-press'),('club:warm'),('club:balance'),('club:passing'),('club:turn'),('club:feint'),('club:defend'),('club:keep'),('club:shoot'),('club:small'),('club:zones'),('club:keeper-game'),('club:pairgame'),('club:close');
create table nhf_private.court_sources(team uuid primary key references public.beta_teams on delete cascade, approved boolean not null default false,video boolean not null default false,reference text not null);
create table nhf_private.court_catalog(team uuid references public.beta_teams on delete cascade,id text,record jsonb not null,available boolean not null default true,content_hash text,primary key(team,id));
create table nhf_private.court_overlays(team uuid,id text,fields jsonb not null,primary key(team,id),foreign key(team,id) references nhf_private.court_catalog on delete cascade);
create table nhf_private.court_imports(id bigint generated always as identity primary key,team uuid references public.beta_teams on delete cascade,at_time timestamptz default now(),counts jsonb not null);
create table nhf_private.court_sessions(id uuid primary key,team uuid not null references public.beta_teams on delete cascade,doc jsonb not null,shared jsonb,audience uuid[],archived boolean not null default false,rev int not null default 0,writer uuid,last_key uuid,edited timestamptz default now());
create index court_sessions_scope on nhf_private.court_sessions(team,edited desc);
create table nhf_private.court_notes(id uuid primary key references nhf_private.court_sessions on delete cascade,notes jsonb not null);
create table nhf_private.court_favorites(actor uuid references auth.users on delete cascade,team uuid references public.beta_teams on delete cascade,exercise text,primary key(actor,team,exercise));
create table nhf_private.court_seen(actor uuid references auth.users on delete cascade,id uuid references nhf_private.court_sessions on delete cascade,item text,primary key(actor,id));
create table nhf_private.court_runs(id uuid primary key references nhf_private.court_sessions on delete cascade,owner_id uuid not null,state jsonb not null,rev int not null,last_key uuid);
create table nhf_private.court_reflections(id uuid primary key references nhf_private.court_runs on delete cascade,reflection text not null);
revoke all on nhf_private.court_builtin,nhf_private.court_sources,nhf_private.court_catalog,nhf_private.court_overlays,nhf_private.court_imports,nhf_private.court_sessions,nhf_private.court_notes,nhf_private.court_favorites,nhf_private.court_seen,nhf_private.court_runs,nhf_private.court_reflections from public,anon,authenticated;
create function nhf_private.court_available(t uuid,k text) returns boolean language sql stable set search_path='' as $$
 select exists(select from nhf_private.court_builtin where id=k) or exists(select from public.beta_exercises where squad=t and id::text=k) or exists(select from nhf_private.court_catalog c left join nhf_private.court_sources s on s.team=c.team where c.team=t and c.id=k and c.available and (c.id not like 'nhf:%' or s.approved))
$$;
revoke all on function nhf_private.court_available(uuid,text) from public,anon,authenticated;
create function nhf_private.court_doc(t uuid, sid uuid, raw jsonb, publishing boolean) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb;items jsonb:='[]';ids text[]:='{}';k text;w int;z int;a text;snap jsonb;
begin
 if jsonb_typeof(raw) is distinct from 'object' or jsonb_typeof(raw->'items') is distinct from 'array' or pg_column_size(raw)>150000 or length(trim(coalesce(raw->>'title',''))) not between 1 and 120 or jsonb_array_length(raw->'items')>80 or publishing and jsonb_array_length(raw->'items')=0 or coalesce(raw->>'origin','') not in ('manual','generated','template') or coalesce(raw->>'purpose','') not in ('team','individual') or coalesce((raw->>'target')::int,0) not between 60 and 86400 then raise exception 'Kontroller øktens navn, tid og aktiviteter';end if;
 if nullif(raw->>'start','') is not null then perform (raw->>'start')::timestamptz;end if;
 for x in select value from jsonb_array_elements(raw->'items') loop
  k:=coalesce(x->>'ex','');a:=x->>'id';w:=(x->>'work')::int;z:=(x->>'setup')::int;
  if a is null or a !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or a=any(ids) or w is null or z is null or w<0 or z<0 or w+z>86400 or publishing and w=0 or length(trim(coalesce(x->>'block',''))) not between 1 and 80 or k='' and length(trim(coalesce(x->>'manual',''))) not between 1 and 120 then raise exception 'Ugyldig øktaktivitet';end if;
  if k<>'' and not nhf_private.court_available(t,k) then raise exception 'Øvelse ikke tilgjengelig. Fjern eller erstatt den.';end if;
  snap:=null;
  if k<>'' then
   select q->'snapshot' into snap from nhf_private.court_sessions g cross join lateral jsonb_array_elements(g.doc->'items') q where g.id=sid and g.team=t and q->>'id'=a and q->>'ex'=k;
   if snap is null or snap='null'::jsonb then select record||coalesce(o.fields,'{}') into snap from nhf_private.court_catalog c left join nhf_private.court_overlays o using(team,id) where c.team=t and c.id=k and c.available;end if;
  end if;
  ids:=array_append(ids,a);items:=items||jsonb_build_array(jsonb_build_object('id',a,'ex',k,'prepareVideo',coalesce(x->'prepareVideo'='true'::jsonb,false),'snapshot',snap,'manual',case when k='' then x->>'manual' else '' end,'block',x->>'block','work',w,'setup',z,'locked',coalesce((x->>'locked')::boolean,false),'instructions',coalesce(x->>'instructions',''),'points',coalesce(x->>'points',''),'group',coalesce(x->>'group','')));
 end loop;
 return jsonb_build_object('id',sid,'title',raw->>'title','goal',coalesce(raw->>'goal',''),'venue',coalesce(raw->>'venue',''),'start',coalesce(raw->>'start',''),'target',(raw->>'target')::int,'purpose',raw->>'purpose','origin',raw->>'origin','items',items,'kit',coalesce(raw->>'kit',''),'expected',coalesce((raw->>'expected')::int,0));
end $$;
revoke all on function nhf_private.court_doc(uuid,uuid,jsonb,boolean) from public,anon,authenticated;
create function nhf_private.court_display(t uuid,d jsonb) returns jsonb language sql stable set search_path='' as $display$
 select case when d is null then null else jsonb_set(d,'{items}',coalesce((select jsonb_agg(
 case when coalesce(x->>'ex','') like 'nhf:%' and not nhf_private.court_available(t,x->>'ex') then x-'snapshot'
 when x->>'ex' like 'nhf:%' and not coalesce((select video from nhf_private.court_sources where team=t),false) and jsonb_typeof(x->'snapshot')='object' then jsonb_set(x,'{snapshot,vimeo}','""')
 else x end order by n) from jsonb_array_elements(d->'items') with ordinality q(x,n)),'[]'::jsonb)) end
$display$;
revoke all on function nhf_private.court_display(uuid,jsonb) from public,anon,authenticated;
create function nhf_private.court(t uuid,action text,sid uuid,expected int,v jsonb,request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();coach boolean; s nhf_private.court_sessions; d jsonb;aud uuid[];x jsonb;k text;
begin
 coach:=nhf_private.coaches(t);if actor is null or not coach and not exists(select from public.beta_members where id=actor and squad=t and role='athlete') then raise exception 'Ingen tilgang til laget';end if;
 if jsonb_typeof(v) is distinct from 'object' or pg_column_size(v)>200000 then raise exception 'Ugyldig forespørsel';end if;
 if sid is not null then select * into s from nhf_private.court_sessions where id=sid and team=t for update;
  if not found and action<>'save' or not coach and (s.shared is null or s.archived or s.audience is not null and not (actor=any(s.audience))) then raise exception 'Økten er ikke tilgjengelig';end if;
 end if;
 if action in ('save','publish','unpublish','archive') then
  if not coach or sid is null or request_id is null then raise exception 'Trenertilgang kreves';end if;
  if s.last_key=request_id and s.writer=actor then null;
  elsif expected is distinct from coalesce(s.rev,0) then raise exception 'Versjonskonflikt. Last inn gjeldende økt.'; 
  elsif action='save' then
   d:=nhf_private.court_doc(t,sid,v->'plan',false);
   if s.id is null then insert into nhf_private.court_sessions(id,team,doc,rev,writer,last_key) values(sid,t,d,1,actor,request_id);
   else update nhf_private.court_sessions set doc=d,rev=rev+1,writer=actor,last_key=request_id,edited=now() where id=sid;end if;
   insert into nhf_private.court_notes values(sid,coalesce(v->'notes','{}')) on conflict(id) do update set notes=excluded.notes;
  else
   if s.id is null then raise exception 'Lagre økten først';end if;
   if action='publish' then
    if s.doc->>'origin'='template' then raise exception 'Lag et utkast fra malen først';end if;
    d:=nhf_private.court_doc(t,sid,s.doc,true);
    if v->>'scope'='players' then select array_agg(distinct a::uuid) into aud from jsonb_array_elements_text(v->'players') a;
     if aud is null or exists(select from unnest(aud) a where not exists(select from public.beta_members where id=a and squad=t and role='athlete')) then raise exception 'Kontroller mottakerne';end if;
    elsif v->>'scope' is distinct from 'team' then raise exception 'Velg mottakere';end if;
   end if;
   update nhf_private.court_sessions set shared=case when action='publish' then d end,audience=aud,archived=action='archive',rev=rev+1,writer=actor,last_key=request_id,edited=now() where id=sid;
  end if;
 elsif action='favorite' then k:=v->>'exercise';if not nhf_private.court_available(t,k) then raise exception 'Øvelse ikke tilgjengelig';end if;
  if (v->>'on')::boolean then insert into nhf_private.court_favorites values(actor,t,k) on conflict do nothing;else delete from nhf_private.court_favorites where team=t and court_favorites.actor=auth.uid() and exercise=k;end if;
 elsif action='seen' then if sid is null or s.shared is null or not exists(select from jsonb_array_elements(s.shared->'items') i where i->>'id'=v->>'item') then raise exception 'Aktiviteten finnes ikke';end if;
  insert into nhf_private.court_seen values(actor,sid,v->>'item') on conflict on constraint court_seen_pkey do update set item=excluded.item;
 elsif action='exercise' then
  if not coach or length(trim(coalesce(v->>'title',''))) not between 1 and 120 or coalesce(v->>'id','') !~ '^local:[0-9a-f-]{36}$' or coalesce(v->>'vimeo','') !~ '^[0-9]{0,15}$' then raise exception 'Ugyldig klubbøvelse';end if;
  insert into nhf_private.court_catalog(team,id,record) values(t,v->>'id',(v-'original')||jsonb_build_object('source','Klubb','original','')) on conflict(team,id) do update set record=excluded.record;
 elsif action='overlay' then
  if not coach or not nhf_private.court_available(t,v->>'id') then raise exception 'Øvelse ikke tilgjengelig';end if;
  insert into nhf_private.court_overlays values(t,v->>'id',jsonb_build_object('tip',left(coalesce(v->>'tip',''),1000))) on conflict(team,id) do update set fields=excluded.fields;
 elsif action<>'read' then raise exception 'Ukjent handling';end if;
 return jsonb_build_object('sessions',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'plan',nhf_private.court_display(t,case when coach then g.doc else g.shared end),'rev',g.rev,'published',g.shared is not null,'archived',g.archived,'edited',g.edited,'seen',w.item)||case when coach then jsonb_build_object('notes',n.notes,'audience',g.audience,'sharedPlan',nhf_private.court_display(t,g.shared)) else '{}'::jsonb end order by g.edited desc) from nhf_private.court_sessions g left join nhf_private.court_notes n on coach and n.id=g.id left join nhf_private.court_seen w on w.id=g.id and w.actor=auth.uid()
 where g.team=t and (sid is null or g.id=sid) and (coach or g.shared is not null and not g.archived and (g.audience is null or auth.uid()=any(g.audience)))),'[]'),
 'favorites',coalesce((select jsonb_agg(exercise) from nhf_private.court_favorites f where f.team=t and f.actor=auth.uid() and nhf_private.court_available(t,f.exercise)),'[]'),
 'catalog',coalesce((select jsonb_agg(c.record||coalesce(o.fields,'{}')||jsonb_build_object('vimeo',case when c.id not like 'nhf:%' or src.video then c.record->>'vimeo' else '' end)) from nhf_private.court_catalog c left join nhf_private.court_sources src on src.team=c.team left join nhf_private.court_overlays o on o.team=c.team and o.id=c.id where c.team=t and nhf_private.court_available(t,c.id)),'[]'),
 'teamExercises',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'dose',dose)) from public.beta_exercises where squad=t),'[]'));
end $$;
create function public.beta_court(t uuid,action text default 'read',sid uuid default null,expected int default 0,v jsonb default '{}',request_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select nhf_private.court(t,action,sid,expected,v,request_id)$$;
revoke all on function public.beta_court(uuid,text,uuid,int,jsonb,uuid),nhf_private.court(uuid,text,uuid,int,jsonb,uuid) from public,anon;
grant execute on function public.beta_court(uuid,text,uuid,int,jsonb,uuid),nhf_private.court(uuid,text,uuid,int,jsonb,uuid) to authenticated;
create function nhf_private.court_run(t uuid,sid uuid,cmd text,expected int,request_id uuid,v jsonb) returns jsonb language plpgsql security definer set search_path='' as $run$
declare actor uuid:=auth.uid();r nhf_private.court_runs;s nhf_private.court_sessions;st jsonb;steps jsonb;idx int;step jsonb;ms bigint;stamp bigint:=floor(extract(epoch from clock_timestamp())*1000);started bigint;dest int;
begin
 if actor is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict s from nhf_private.court_sessions where id=sid and team=t for update;
 select * into r from nhf_private.court_runs where id=sid;
 if cmd='read' then null;
 elsif request_id is null then raise exception 'Mangler forespørsels-ID';
 elsif r.id is not null and r.owner_id<>actor then raise exception 'Bare ansvarlig trener kan styre denne økten';
 elsif r.last_key=request_id then null;
 elsif coalesce(r.rev,0)<>expected then raise exception 'Versjonskonflikt i pågående økt';
 elsif cmd='start' then
  if r.id is not null or s.shared is null or s.archived then raise exception 'Start en delt, ikke tidligere startet økt';end if;
  select jsonb_agg(jsonb_build_object('status',case when n=1 then 'running' else 'ready' end,'elapsed',0) order by n) into steps from jsonb_array_elements(s.shared->'items') with ordinality x(i,n);
  insert into nhf_private.court_runs values(sid,actor,jsonb_build_object('snap',s.shared,'index',0,'steps',steps,'since',stamp,'finished',false),1,request_id) returning * into r;
 else
  if r.id is null or (r.state->>'finished')::boolean and cmd<>'reflect' then raise exception 'Ingen aktiv økt';end if;
  st:=r.state;idx:=(st->>'index')::int;steps:=st->'steps';step:=steps->idx;started:=(st->>'since')::bigint;ms:=(step->>'elapsed')::bigint+coalesce(greatest(stamp-started,0),0);
  if started is not null then step:=step||jsonb_build_object('status','paused','elapsed',ms);end if;
  st:=st||jsonb_build_object('since',null);
  if cmd='pause' and started is not null then null;
  elsif cmd='play' and started is null and step->>'status' not in ('done','skipped') then step:=step||'{"status":"running"}';st:=st||jsonb_build_object('since',stamp);
  elsif cmd='reset' then step:='{"status":"paused","elapsed":0}';
  elsif cmd in ('next','skip','back') then
   if cmd<>'back' and step->>'status' not in ('done','skipped') then step:=step||jsonb_build_object('status',case when cmd='skip' then 'skipped' else 'done' end);end if;
   dest:=greatest(0,least(jsonb_array_length(steps)-1,idx+case when cmd='back' then -1 else 1 end));st:=st||jsonb_build_object('index',dest);
  elsif cmd='finish' then
   if exists(select from jsonb_array_elements(jsonb_set(steps,array[idx::text],step)) q where q->>'status' not in ('done','skipped')) and v->>'confirmed' is distinct from 'true' then raise exception 'Bekreft tidlig avslutning';end if;
   select jsonb_agg(case when q->>'status' in ('done','skipped') then q else q||'{"status":"skipped"}' end order by n) into steps from jsonb_array_elements(jsonb_set(steps,array[idx::text],step)) with ordinality q1(q,n);
   step:=steps->idx;st:=st||'{"finished":true}';
  elsif cmd='reflect' and (st->>'finished')::boolean and length(coalesce(v->>'text','')) between 1 and 1500 then insert into nhf_private.court_reflections values(sid,v->>'text') on conflict(id) do update set reflection=excluded.reflection;
  else raise exception 'Handlingen passer ikke med timeren';end if;
  st:=st||jsonb_build_object('steps',jsonb_set(steps,array[idx::text],step));
  update nhf_private.court_runs set state=st,rev=rev+1,last_key=request_id where id=sid returning * into r;
 end if;
 if r.id is null then return null;end if;
 return jsonb_set(r.state,'{snap}',nhf_private.court_display(t,r.state->'snap'))||jsonb_build_object('owner',r.owner_id,'rev',r.rev,'now',stamp,'reflection',(select reflection from nhf_private.court_reflections where id=sid));
end $run$;
create function public.beta_court_run(t uuid,sid uuid,cmd text default 'read',expected int default 0,request_id uuid default null,v jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.court_run(t,sid,cmd,expected,request_id,v)$$;
revoke all on function public.beta_court_run(uuid,uuid,text,int,uuid,jsonb),nhf_private.court_run(uuid,uuid,text,int,uuid,jsonb) from public,anon;
grant execute on function public.beta_court_run(uuid,uuid,text,int,uuid,jsonb),nhf_private.court_run(uuid,uuid,text,int,uuid,jsonb) to authenticated;
create function nhf_private.court_source(t uuid,action text,rows jsonb) returns jsonb language plpgsql security definer set search_path='' as $src$
declare rights nhf_private.court_sources;old int;n int;ins int;upd int;gone int;report jsonb;
begin
 if auth.uid() is null or not nhf_private.club_active() then raise exception 'Klubbadministrator kreves';end if;
 select * into rights from nhf_private.court_sources where team=t for update;
 if action='check' then return jsonb_build_object('approved',coalesce(rights.approved,false),'video',coalesce(rights.video,false));end if;
 if rights.team is null or not rights.approved or length(trim(rights.reference))=0 then raise exception 'Manglende kildegodkjenning';end if;
 if action not in ('preview','import') or jsonb_typeof(rows) is distinct from 'array' or pg_column_size(rows)>12000000 then raise exception 'Ugyldig import';end if;
 n:=jsonb_array_length(rows);if n not between 1 and 20000 or (select count(distinct x->>'id') from jsonb_array_elements(rows) x)<>n
 or exists(select from jsonb_array_elements(rows) x where coalesce(x->>'id','') !~ '^nhf:[a-zA-Z0-9_-]{1,80}$' or x->>'source' is distinct from 'NHF' or length(trim(coalesce(x->>'title',''))) not between 1 and 1500 or coalesce(x->>'original','') not like 'https://www.ovelsesbanken.no/ovelser/%' or coalesce(x->>'vimeo','') !~ '^[0-9]{0,15}$') then raise exception 'Ugyldige øvelsesrader';end if;
 select count(*) into old from nhf_private.court_catalog where team=t and id like 'nhf:%' and available;
 select count(*) filter(where c.id is null),count(*) filter(where c.id is not null and (not c.available or c.content_hash<>md5(x::text))) into ins,upd from jsonb_array_elements(rows) x left join nhf_private.court_catalog c on c.team=t and c.id=x->>'id';
 select count(*) into gone from nhf_private.court_catalog c where c.team=t and c.id like 'nhf:%' and available and not exists(select from jsonb_array_elements(rows) x where x->>'id'=c.id);
 report:=jsonb_build_object('inserted',ins,'updated',upd,'unchanged',n-ins-upd,'missing',gone,'total',n,'major_drop',old>0 and gone>old*.2);
 if action='import' then
 if old>0 and gone>old*.2 then raise exception 'Stort frafall. Undersøk kilden før ny import.';end if;
 insert into nhf_private.court_catalog(team,id,record,available,content_hash) select t,x->>'id',x,true,md5(x::text) from jsonb_array_elements(rows) x
 on conflict(team,id) do update set record=excluded.record,available=true,content_hash=excluded.content_hash where not nhf_private.court_catalog.available or nhf_private.court_catalog.content_hash<>excluded.content_hash;
 update nhf_private.court_catalog c set available=false where team=t and id like 'nhf:%' and available and not exists(select from jsonb_array_elements(rows) x where x->>'id'=c.id);
 insert into nhf_private.court_imports(team,counts) values(t,report);
 end if;return report;
end $src$;
create function public.beta_court_source(t uuid,action text,rows jsonb default '[]') returns jsonb language sql security invoker set search_path='' as $$select nhf_private.court_source(t,action,rows)$$;
revoke all on function public.beta_court_source(uuid,text,jsonb),nhf_private.court_source(uuid,text,jsonb) from public,anon;
grant execute on function public.beta_court_source(uuid,text,jsonb),nhf_private.court_source(uuid,text,jsonb) to authenticated;
create function nhf_private.court_rights(t uuid,action text,reference_text text,allow_video boolean) returns jsonb language plpgsql security definer set search_path='' as $rights$
begin
 if auth.uid() is null or not nhf_private.club_active() or not exists(select from public.beta_teams where id=t) then raise exception 'Klubbadministrator kreves';end if;
 if action='approve' then
  if length(trim(coalesce(reference_text,''))) not between 8 and 600 then raise exception 'Oppgi referanse til skriftlig tillatelse for lagets publikum';end if;
  insert into nhf_private.court_sources values(t,true,allow_video,trim(reference_text)) on conflict(team) do update set approved=true,video=excluded.video,reference=excluded.reference;
 elsif action='revoke' then update nhf_private.court_sources set approved=false,video=false where team=t;
 elsif action<>'read' then raise exception 'Ukjent handling';end if;
 return jsonb_build_object('approved',coalesce((select approved from nhf_private.court_sources where team=t),false),'history',coalesce((select jsonb_agg(to_jsonb(z) order by z.at_time desc) from (select at_time,counts from nhf_private.court_imports where team=t order by at_time desc limit 20) z),'[]'));
end $rights$;
create function public.beta_court_rights(t uuid,action text default 'read',reference_text text default '',allow_video boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.court_rights(t,action,reference_text,allow_video)$$;
revoke all on function public.beta_court_rights(uuid,text,text,boolean),nhf_private.court_rights(uuid,text,text,boolean) from public,anon;
grant execute on function public.beta_court_rights(uuid,text,text,boolean),nhf_private.court_rights(uuid,text,text,boolean) to authenticated;
