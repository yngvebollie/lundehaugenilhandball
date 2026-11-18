alter table public.beta_player_log add column followup jsonb, add column followup_version text;
alter table public.beta_player_log add constraint player_followup_pair check ((followup is null) = (followup_version is null));
create unique index player_followup_once on public.beta_player_log(team,athlete,followup_version) where followup_version is not null;

-- Only this guarded function can append follow-ups. Existing log RLS stays coach-only.
create function nhf_private.complete_followup(t uuid,p uuid,v jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare signals jsonb; version text; saved public.beta_player_log%rowtype; payload jsonb;
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
 select jsonb_agg(s order by s) into signals from (select distinct value as s from jsonb_array_elements_text(v->'signals')) x;
 version:=encode(sha256(convert_to(jsonb_build_array(v->>'key',signals)::text,'UTF8')),'hex');
 payload:=jsonb_build_object('key',v->>'key','signals',signals,'title',trim(v->>'title'),'note',trim(v->>'note'),'kind',v->>'kind');
 insert into public.beta_player_log(team,athlete,actor,action,detail,subject,followup,followup_version)
 values(t,p,auth.uid(),'Oppfølging gjennomført',trim(v->>'title')||E'\nGrunnlag: '||(v->>'evidence')||E'\nNotat: '||trim(v->>'note'),gen_random_uuid(),payload,version)
 on conflict(team,athlete,followup_version) where followup_version is not null do nothing returning * into saved;
 if saved.id is null then select * into saved from public.beta_player_log where team=t and athlete=p and followup_version=version;end if;
 return jsonb_build_object('id',saved.id,'athlete',saved.athlete,'actor',saved.actor,'at_time',saved.at_time,'action',saved.action,'detail',saved.detail,'followup',saved.followup);
end $$;
create function public.beta_complete_followup(t uuid,p uuid,v jsonb) returns jsonb
language sql security invoker set search_path='' as $$select nhf_private.complete_followup(t,p,v)$$;
revoke all on function nhf_private.complete_followup(uuid,uuid,jsonb),public.beta_complete_followup(uuid,uuid,jsonb) from public,anon;
grant execute on function nhf_private.complete_followup(uuid,uuid,jsonb),public.beta_complete_followup(uuid,uuid,jsonb) to authenticated;
