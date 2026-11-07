create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create table nhf_private.nhf_sync_endpoint(id boolean primary key check(id),public_url text not null
 check(public_url ~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/nhf-public-schedule$'));
revoke all on nhf_private.nhf_sync_endpoint from public,anon,authenticated;
create function nhf_private.dispatch_nhf_schedules() returns integer language plpgsql security definer set search_path='' as $fn$
declare endpoint text; team_id uuid; job_id uuid; total int:=0;
begin
 select public_url into endpoint from nhf_private.nhf_sync_endpoint;
 if endpoint is null then return 0;end if;
 delete from nhf_private.nhf_sync_jobs where expires<now()-interval '1 day';
 for team_id in select r.id from public.beta_team_seasons r join nhf_private.active_seasons s on r.team=s.team and r.season=s.season
 where r.active and not exists(select from nhf_private.nhf_sync_jobs j where j.reg=r.id and j.expires>now() and not used)
 loop
   insert into nhf_private.nhf_sync_jobs(reg) values(team_id) returning token into job_id;
   perform net.http_post(url:=endpoint,headers:='{"Content-Type":"application/json"}',body:=jsonb_build_object('id',team_id,'job',job_id),timeout_milliseconds:=45000);total:=total+1;
 end loop;
 return total;
end $fn$;
revoke all on function nhf_private.dispatch_nhf_schedules() from public,anon,authenticated;
select cron.schedule('nhf-published-weekends','0 4 * * 5,6,0','select nhf_private.dispatch_nhf_schedules()');
