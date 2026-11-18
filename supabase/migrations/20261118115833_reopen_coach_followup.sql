create index player_followup_state on public.beta_player_log(team,athlete,(followup->>'key'),id desc) where followup is not null;

create or replace function nhf_private.complete_followup(t uuid,p uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare signals jsonb; version text; saved public.beta_player_log%rowtype; payload jsonb; latest public.beta_player_log%rowtype; cycle text;
begin
 if auth.uid() is null or not nhf_private.coaches(t) or not exists(select from public.beta_members where id=p and squad=t and role='athlete') then
  raise exception 'Trenertilgang paa spillerens lag kreves.' using errcode='42501';
 end if;
 if v is null or jsonb_typeof(v)<>'object' or octet_length(v::text)>100000 then raise exception 'Ugyldig oppfolging.';end if;
 if coalesce(jsonb_typeof(v->'key'),'')<>'string' or length(v->>'key') not between 1 and 200
  or coalesce(jsonb_typeof(v->'title'),'')<>'string' or length(trim(v->>'title')) not between 1 and 250
  or coalesce(jsonb_typeof(v->'note'),'')<>'string' or length(trim(v->>'note')) not between 1 and 1000
  or coalesce(jsonb_typeof(v->'evidence'),'')<>'string' or length(v->>'evidence') not between 1 and 3000
  or coalesce(v->>'kind','') not in ('goals','ratings','activity') then raise exception 'Kontroller notat og forslag.';end if;
 if coalesce(jsonb_typeof(v->'signals'),'')<>'array' then raise exception 'Grunnlag mangler.';end if;
 if jsonb_array_length(v->'signals') not between 1 and 1000 or exists(select from jsonb_array_elements(v->'signals') x where jsonb_typeof(x)<>'string' or length(x #>> '{}') not between 1 and 1000) then raise exception 'Ugyldig grunnlag.';end if;
 -- Serialize state transitions for this player without changing membership or log rows.
 perform 1 from public.beta_members where id=p and squad=t and role='athlete' for update;
 if not found then raise exception 'Spilleren er ikke paa laget.';end if;
 select * into latest from public.beta_player_log where team=t and athlete=p and followup is not null and followup->>'key'=v->>'key' order by id desc limit 1;
 cycle:=case when latest.followup->>'state'='reopened' then latest.id::text else latest.followup->>'cycle' end;
 if coalesce(v->>'cycle','')<>coalesce(cycle,'') then raise exception 'Oppfolgingsstatus er endret. Oppdater oversikten.' using errcode='40001';end if;
 select jsonb_agg(s order by s) into signals from (select distinct value as s from jsonb_array_elements_text(v->'signals')) x;
 version:=encode(sha256(convert_to((case when cycle is null then jsonb_build_array(v->>'key',signals) else jsonb_build_array(v->>'key',signals,cycle) end)::text,'UTF8')),'hex');
 payload:=jsonb_build_object('key',v->>'key','signals',signals,'title',trim(v->>'title'),'note',trim(v->>'note'),'kind',v->>'kind','state','completed','cycle',cycle,'evidence',v->>'evidence');
 insert into public.beta_player_log(team,athlete,actor,action,detail,subject,followup,followup_version)
 values(t,p,auth.uid(),'Oppfølging gjennomført',trim(v->>'title')||E'\nGrunnlag: '||(v->>'evidence')||E'\nNotat: '||trim(v->>'note'),gen_random_uuid(),payload,version)
 on conflict(team,athlete,followup_version) where followup_version is not null do nothing returning * into saved;
 if saved.id is null then select * into saved from public.beta_player_log where team=t and athlete=p and followup_version=version;end if;
 return jsonb_build_object('id',saved.id,'athlete',saved.athlete,'actor',saved.actor,'at_time',saved.at_time,'action',saved.action,'detail',saved.detail,'followup',saved.followup);
end $$;

create function nhf_private.reopen_followup(t uuid,p uuid,k bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target public.beta_player_log%rowtype; latest public.beta_player_log%rowtype; saved public.beta_player_log%rowtype;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves.' using errcode='42501';end if;
 perform 1 from public.beta_members where id=p and squad=t and role='athlete' for update;
 if not found then raise exception 'Spilleren er ikke paa laget.' using errcode='42501';end if;
 select * into target from public.beta_player_log where id=k and team=t and athlete=p and followup is not null and coalesce(followup->>'state','completed')='completed';
 if target.id is null then raise exception 'Oppfolgingen finnes ikke.';end if;
 select * into latest from public.beta_player_log where team=t and athlete=p and followup is not null and followup->>'key'=target.followup->>'key' order by id desc limit 1;
 if latest.followup->>'state'='reopened' and latest.followup->>'reopens'=k::text then saved:=latest;
 elsif latest.id<>k then raise exception 'Oppfolgingsstatus er endret. Oppdater oversikten.' using errcode='40001';
 else
  insert into public.beta_player_log(team,athlete,actor,action,detail,subject,followup,followup_version)
  values(t,p,auth.uid(),'Oppfølging gjenåpnet',(target.followup->>'title')||E'\nGjenåpnet oppfølging #'||k::text||E'. Det opprinnelige notatet er beholdt i trenerloggen.',target.subject,
   (target.followup-'cycle')||jsonb_build_object('state','reopened','reopens',k::text,'note',''),'reopen:'||k::text) returning * into saved;
 end if;
 return jsonb_build_object('id',saved.id,'athlete',saved.athlete,'actor',saved.actor,'at_time',saved.at_time,'action',saved.action,'detail',saved.detail,'followup',saved.followup);
end $$;
create function public.beta_reopen_followup(t uuid,p uuid,k bigint) returns jsonb
language sql security invoker set search_path='' as $$select nhf_private.reopen_followup(t,p,k)$$;
revoke all on function nhf_private.reopen_followup(uuid,uuid,bigint),public.beta_reopen_followup(uuid,uuid,bigint) from public,anon;
grant execute on function nhf_private.reopen_followup(uuid,uuid,bigint),public.beta_reopen_followup(uuid,uuid,bigint) to authenticated;
