create table public.beta_player_log (
 id bigint generated always as identity primary key,
 team uuid not null references public.beta_teams on delete cascade,
 athlete uuid not null references auth.users on delete cascade,
 actor uuid not null, at_time timestamptz not null default now(), action text not null,
 detail text not null, subject uuid not null
);
create index player_log_scroll on public.beta_player_log(team,athlete,id desc);
alter table public.beta_player_log enable row level security;
revoke all on public.beta_player_log from public,anon,authenticated;
grant select on public.beta_player_log to authenticated;
create policy coach_log on public.beta_player_log for select to authenticated using(nhf_private.coaches(team));

create function nhf_private.log_player_change() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb; t uuid; action_name text; detail_text text;
begin
 r:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 t:=coalesce(r->>'team',r->>'squad')::uuid;
 if auth.uid() is null or not nhf_private.coaches(t) then return null;end if;
 if not exists(select from auth.users where id=(r->>'athlete')::uuid) or not exists(select from public.beta_teams where id=t) then return null;end if;
 if tg_table_name='beta_team_messages' then
  action_name:=case when tg_op='DELETE' then 'Melding trukket tilbake' else 'Melding sendt' end;
  detail_text:=r->>'body';
 else
  action_name:=case tg_op when 'INSERT' then 'Aktivitet lagt til' when 'DELETE' then 'Aktivitet fjernet' else 'Øvelser endret' end;
  detail_text:=concat_ws(' · ',r->>'title',r->>'day',r->>'start_time');
  if tg_op='UPDATE' then detail_text:=detail_text||E'\nFør: '||array_to_string(old.exercises,', ')||E'\nEtter: '||array_to_string(new.exercises,', ');else detail_text:=detail_text||E'\n'||array_to_string(array(select jsonb_array_elements_text(r->'exercises')),', ');end if;
 end if;
 insert into public.beta_player_log(team,athlete,actor,action,detail,subject) values(t,(r->>'athlete')::uuid,auth.uid(),action_name,detail_text,(r->>'id')::uuid);
 return null;
end $$;
revoke all on function nhf_private.log_player_change() from public,anon,authenticated;
create trigger player_message_log after insert or delete on public.beta_team_messages for each row execute function nhf_private.log_player_change();
create trigger player_plan_log after insert or update of exercises or delete on public.beta_assignments for each row execute function nhf_private.log_player_change();

create function nhf_private.change_player_plan(t uuid,p uuid,k uuid,cmd text,prior text[],lines text[]) returns void
language plpgsql security definer set search_path='' as $$
declare a public.beta_assignments%rowtype;
begin
 if auth.uid() is null or not nhf_private.coaches(t) or not exists(select from public.beta_members where id=p and role='athlete' and squad=t) then raise exception 'Trenertilgang på spillerens lag kreves.';end if;
 if cmd='retract' then
  delete from public.beta_team_messages where id=k and team=t and athlete=p and sender=auth.uid();
  if not found then raise exception 'Du kan bare trekke tilbake egne meldinger.';end if;return;
 end if;
 select * into a from public.beta_assignments where id=k and squad=t and athlete=p for update;
 if not found or a.personal or a.day<(now() at time zone 'Europe/Oslo')::date or a.exercises is distinct from prior then raise exception 'Planen er endret eller kan ikke redigeres. Oppdater oversikten.';end if;
 if exists(select from public.beta_checks where assignment=k) or exists(select from public.beta_feedback where assignment=k) or exists(select from public.beta_workout_reviews where assignment=k) or exists(select from nhf_private.court_exercise_ratings where activity_id=k and origin='assignment') or exists(select from nhf_private.session_load_entries where event=k and source='assignment') then raise exception 'Spilleren har registrert aktivitet. Historikken kan ikke endres.'; end if;
 if cmd='remove' then delete from public.beta_assignments where id=k;
 elsif cmd='exercises' and a.kind='Session' and cardinality(lines) between 1 and 40 and array_ndims(lines)=1 and array_lower(lines,1)=1 and not exists(select from unnest(lines) x where x is null or length(trim(x)) not between 1 and 250) then update public.beta_assignments set exercises=lines where id=k;
 else raise exception 'Velg mellom 1 og 40 øvelser.';end if;
end $$;
create function public.beta_change_player_plan(t uuid,p uuid,k uuid,cmd text,prior text[],lines text[]) returns void language sql security invoker set search_path='' as $$select nhf_private.change_player_plan(t,p,k,cmd,prior,lines)$$;
revoke all on function public.beta_change_player_plan(uuid,uuid,uuid,text,text[],text[]),nhf_private.change_player_plan(uuid,uuid,uuid,text,text[],text[]) from public,anon;
grant execute on function public.beta_change_player_plan(uuid,uuid,uuid,text,text[],text[]),nhf_private.change_player_plan(uuid,uuid,uuid,text,text[],text[]) to authenticated;
