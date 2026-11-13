-- Capture completion, not later edits or reflections. Earlier runs may only have a planned date.
alter table nhf_private.court_runs add column finished_at timestamptz;
create function nhf_private.stamp_court_finish() returns trigger language plpgsql set search_path='' as $$
begin
 if new.state->>'finished'='true' and old.state->>'finished' is distinct from 'true' then new.finished_at:=now();end if;
 return new;
end $$;
create trigger court_finished before update of state on nhf_private.court_runs for each row execute function nhf_private.stamp_court_finish();
create function nhf_private.court_history(t uuid,f uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'title',r.state->'snap'->>'title','finished',r.finished_at,'planned',r.state->'snap'->>'start') order by r.finished_at desc nulls last,r.state->'snap'->>'start' desc),'[]')
 from nhf_private.court_sessions s join nhf_private.court_runs r on r.id=s.id
 left join nhf_private.court_notes n on n.id=s.id
 where auth.uid() is not null and nhf_private.coaches(t) and s.team=t and r.state->>'finished'='true' and coalesce(n.notes->>'family',s.id::text)=f::text;
$$;
create function public.beta_court_history(t uuid,f uuid) returns jsonb language sql stable security invoker set search_path='' as $$select nhf_private.court_history(t,f)$$;
revoke all on function nhf_private.stamp_court_finish(),nhf_private.court_history(uuid,uuid),public.beta_court_history(uuid,uuid) from public,anon;
grant execute on function nhf_private.court_history(uuid,uuid),public.beta_court_history(uuid,uuid) to authenticated;

-- The completed personal assignment and its check must succeed together.
create function public.beta_quick_training(t uuid,k uuid,label text,at_time timestamptz,minutes_done int)
returns uuid language plpgsql security invoker set search_path='' as $$
declare athlete_id uuid:=auth.uid(); local_time timestamp:=at_time at time zone 'Europe/Oslo';
begin
 if athlete_id is null or not exists(select from public.beta_members where id=athlete_id and squad=t and role='athlete') then raise exception 'Utøvertilgang kreves';end if;
 if k is null or label is null or length(trim(label)) not between 1 and 100 or at_time is null or not isfinite(at_time) or at_time>now() or minutes_done is null or minutes_done not between 1 and 600 then raise exception 'Kontroller navn, varighet og tidspunkt. Treningen må være gjennomført.';end if;
 if exists(select from public.beta_assignments where id=k and athlete=athlete_id and squad=t and personal and title=trim(label) and day=local_time::date and start_time=local_time::time and minutes=minutes_done and exercises=array['Gjennomført trening']) then return k;end if;
 insert into public.beta_assignments(id,squad,athlete,title,day,start_time,minutes,kind,personal,exercises)
 values(k,t,athlete_id,trim(label),local_time::date,local_time::time,minutes_done,'Session',true,array['Gjennomført trening']);
 insert into public.beta_checks(assignment,step) values(k,0);
 return k;
end $$;
revoke all on function public.beta_quick_training(uuid,uuid,text,timestamptz,int) from public,anon;
grant execute on function public.beta_quick_training(uuid,uuid,text,timestamptz,int) to authenticated;
