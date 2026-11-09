insert into nhf_private.court_builtin(id) values
  ('ref:804248109'), ('ref:793713427'), ('ref:804889122'), ('ref:793607095')
on conflict (id) do nothing;

create table nhf_private.court_exercise_ratings (
  team uuid not null references public.beta_teams on delete cascade,
  athlete uuid not null references auth.users on delete cascade,
  exercise text not null,
  stars smallint not null check (stars between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (team,athlete,exercise)
);
alter table nhf_private.court_exercise_ratings enable row level security;
revoke all on nhf_private.court_exercise_ratings from public,anon,authenticated;

create function nhf_private.court_rating(t uuid,k text,score integer) returns integer
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
  if me is null or not exists(select 1 from public.beta_members where id=me and squad=t and role='athlete')
     or not nhf_private.court_available(t,k) then raise exception 'Ingen tilgang til øvelsen'; end if;
  if score is not null then
    if score not between 1 and 5 then raise exception 'Velg 1 til 5 stjerner'; end if;
    insert into nhf_private.court_exercise_ratings(team,athlete,exercise,stars) values(t,me,k,score)
    on conflict(team,athlete,exercise) do update set stars=excluded.stars,updated_at=now();
  end if;
  return (select stars from nhf_private.court_exercise_ratings where team=t and athlete=me and exercise=k);
end $$;
create function public.beta_court_rating(t uuid,k text,score integer default null) returns integer
language sql security invoker set search_path='' as $$ select nhf_private.court_rating(t,k,score) $$;
revoke all on function public.beta_court_rating(uuid,text,integer),nhf_private.court_rating(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.beta_court_rating(uuid,text,integer),nhf_private.court_rating(uuid,text,integer) to authenticated;
