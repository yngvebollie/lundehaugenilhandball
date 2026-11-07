-- NHF reports may omit a squad number shown in the fixture list.
create function nhf_private.report_side_matches(label text, fixture text, opponent text)
returns boolean language sql immutable security invoker set search_path='' as $$
 with names as (select btrim(lower(regexp_replace(coalesce(label,''),'[[:space:]]+',' ','g'))) r,
 btrim(lower(regexp_replace(coalesce(fixture,''),'[[:space:]]+',' ','g'))) f,
 btrim(lower(regexp_replace(coalesce(opponent,''),'[[:space:]]+',' ','g'))) o)
 select r<>'' and (r=f or (f ~ ' [0-9]+$' and r=regexp_replace(f,' [0-9]+$','')
 and r<>regexp_replace(o,' [0-9]+$',''))) from names
$$;
revoke all on function nhf_private.report_side_matches(text,text,text) from public,anon,authenticated;
create or replace function nhf_private.report_access(action text,t uuid,m uuid,digest text,original jsonb,reviewed jsonb,expected integer)
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
 if not nhf_private.report_side_matches(h->>'home',g.home,g.away) or not nhf_private.report_side_matches(h->>'away',g.away,g.home) then
   raise exception 'Rapporten viser % – %. Valgt kamp: % – %. Kontroller lagene under Kampinformasjon.',coalesce(h->>'home','?'),coalesce(h->>'away','?'),g.home,g.away;
 end if;
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
