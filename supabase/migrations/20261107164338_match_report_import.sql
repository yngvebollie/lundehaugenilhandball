alter table public.beta_team_seasons drop constraint beta_team_seasons_season_check,
 add check(season>=0), add unique(team,org_id),
 add column leagues integer[] not null default '{}' check(cardinality(leagues)<=40 and 0<all(leagues)),
 add column profile_note text not null default '' check(length(profile_note)<=1000);
update public.beta_team_seasons set leagues=array[tournament] where tournament is not null;
grant insert(leagues),update(leagues,profile_note) on public.beta_team_seasons to authenticated;

-- Original and corrected summaries never share storage with private coach evaluations.
create table nhf_private.match_reports(
 id uuid primary key default gen_random_uuid(),match_id uuid not null unique references public.beta_matches on delete cascade,
 digest text not null, original jsonb not null, reviewed jsonb not null, revision int not null default 1,
 updated_by uuid references auth.users on delete set null,updated_at timestamptz not null default now()
);
create table nhf_private.report_history(
 report_id uuid references nhf_private.match_reports on delete cascade, revision integer,
 original jsonb not null,reviewed jsonb not null,digest text not null,actor uuid,at timestamptz default now(),primary key(report_id,revision)
);
revoke all on nhf_private.match_reports,nhf_private.report_history from public,anon,authenticated;
create function nhf_private.report_access(action text,t uuid,m uuid,digest text,original jsonb,reviewed jsonb,expected integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.beta_matches;r nhf_private.match_reports; row jsonb;s text;field text;h jsonb;
begin
 if auth.uid() is null or not nhf_private.coaches(t) then raise exception 'Trenertilgang kreves';end if;
 select * into strict g from public.beta_matches where id=m and team=t for update;
 select * into r from nhf_private.match_reports where match_id=m;
 insert into nhf_private.match_audit(actor,team,match_id,action) values(auth.uid(),t,m,'report:'||action);
 if action='read' then if r.id is null then return null;end if;return to_jsonb(r);end if;
 if coalesce(r.revision,0) is distinct from expected then raise exception 'Rapporten er endret. Last inn på nytt.';end if;
 if action='delete' and nhf_private.admin_of(t) then delete from nhf_private.match_reports where match_id=m;return 'true';end if;
 if action is distinct from 'save' or digest is null or digest !~ '^[a-f0-9]{64}$' or
    original is null or reviewed is null or pg_column_size(original)>120000 or pg_column_size(reviewed)>120000 then raise exception 'Ugyldig rapport';end if;
 if g.nif_id is null or (original#>>'{match,nif_id}')::int is distinct from g.nif_id or
    (reviewed#>>'{match,nif_id}')::int is distinct from g.nif_id then raise exception 'Feil ResPIN. Velg riktig kamp.';end if;
 h:=reviewed->'match';
 if lower(trim(h->>'home')) is distinct from lower(trim(g.home)) or lower(trim(h->>'away')) is distinct from lower(trim(g.away)) then raise exception 'Kontroller hjemme- og bortelag';end if;
 if jsonb_typeof(reviewed->'players') is distinct from 'array' or jsonb_array_length(reviewed->'players') not between 2 and 100 then raise exception 'Manglende spillerliste';end if;
 for row in select value from jsonb_array_elements(reviewed->'players') loop
   if coalesce(row->>'side','') not in ('A','B') or coalesce(row->>'shirt','') !~ '^[0-9]{1,3}$' or
      length(trim(coalesce(row->>'name',''))) not between 1 and 150 then raise exception 'Ugyldig spillerrad';end if;
   foreach field in array array['goals','penalty','total','suspensions'] loop
     if coalesce(row->>field,'') !~ '^[0-9]{1,3}$' then raise exception 'Kontroller tall for spiller %',row->>'shirt';end if;
   end loop;
   if (row->>'goals')::int+(row->>'penalty')::int<>(row->>'total')::int then raise exception 'Mål og 7 m stemmer ikke med totalen';end if;
 end loop;
 foreach s in array array['A','B'] loop
   if (select count(*)=0 or count(*)<>count(distinct x->>'shirt') or sum((x->>'total')::int) is distinct from
       (case s when 'A' then h->>'home_score' else h->>'away_score' end)::int from jsonb_array_elements(reviewed->'players') x where x->>'side'=s)
       then raise exception 'Kontroller draktnummer og mål for lag %',s;end if;
 end loop;
 if r.digest=digest then original:=r.original;end if;
 if r.digest=digest and r.reviewed=reviewed then return to_jsonb(r);end if;
 insert into nhf_private.match_reports as a(match_id,digest,original,reviewed,updated_by) values(m,digest,original,reviewed,auth.uid())
 on conflict(match_id) do update set digest=excluded.digest,original=excluded.original,reviewed=excluded.reviewed,
 revision=a.revision+1,updated_by=auth.uid(),updated_at=now() returning * into r;
 insert into nhf_private.report_history(report_id,revision,original,reviewed,digest,actor) values(r.id,r.revision,r.original,r.reviewed,r.digest,auth.uid());
 return to_jsonb(r);
end $$;
create function public.beta_report(action text,t uuid,m uuid,digest text default null,original jsonb default null,reviewed jsonb default null,expected integer default 0)
returns jsonb language sql security invoker set search_path='' as $$select nhf_private.report_access(action,t,m,digest,original,reviewed,expected)$$;
revoke all on function public.beta_report(text,uuid,uuid,text,jsonb,jsonb,integer),nhf_private.report_access(text,uuid,uuid,text,jsonb,jsonb,integer) from public,anon;
grant execute on function public.beta_report(text,uuid,uuid,text,jsonb,jsonb,integer),nhf_private.report_access(text,uuid,uuid,text,jsonb,jsonb,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kamprapporter','kamprapporter',false,4000000,array['application/pdf']);
create function nhf_private.report_object(path text,admin_required boolean) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select from public.beta_matches m where path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9]{64}\.pdf$'
 and m.team::text=split_part(path,'/',1) and m.id::text=split_part(path,'/',2)
 and case when admin_required then nhf_private.admin_of(m.team) else nhf_private.coaches(m.team) end)
$$;
revoke all on function nhf_private.report_object(text,boolean) from public,anon;
grant execute on function nhf_private.report_object(text,boolean) to authenticated;
create policy nhf_report_read on storage.objects for select to authenticated using(bucket_id='kamprapporter' and nhf_private.report_object(name,false));
create policy nhf_report_upload on storage.objects for insert to authenticated with check(bucket_id='kamprapporter' and nhf_private.report_object(name,false));
create policy nhf_report_remove on storage.objects for delete to authenticated using(bucket_id='kamprapporter' and nhf_private.report_object(name,true));
