-- One request, one transaction. Reuse the existing coach, season and conflict checks.
create function public.beta_link_report_group(t uuid, a uuid, entries jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item record; result jsonb;
begin
 if jsonb_typeof(entries) is distinct from 'array' then raise exception 'Velg minst ett spillelag'; end if;
 if a is null or jsonb_array_length(entries) not between 1 and 100 then raise exception 'Velg spiller og 1–100 spillelag'; end if;
 if exists(select 1 from jsonb_to_recordset(entries) as x(reg uuid, player uuid)
           group by x.reg having x.reg is null or count(*)>1 or count(x.player)<>count(*))
 then raise exception 'Velg kun én rapportspiller per spillelag'; end if;
 for item in select * from jsonb_to_recordset(entries) as x(reg uuid, player uuid) order by reg loop
   result:=public.beta_report_roster(t,item.reg,item.player,a);
 end loop;
 return result;
end $$;
revoke all on function public.beta_link_report_group(uuid,uuid,jsonb) from public,anon;
grant execute on function public.beta_link_report_group(uuid,uuid,jsonb) to authenticated;
