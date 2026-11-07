create table public.beta_notices (
  id uuid primary key, batch uuid not null, squad uuid not null references public.beta_teams on delete cascade,
  coach uuid not null references auth.users on delete cascade, athlete uuid not null,
  member_role text not null default 'athlete' check(member_role='athlete'),
  cadence text not null check(cadence in ('Daily','Weekly')), starts_on date not null,
  body text not null check(length(trim(body)) between 1 and 2000),
  posted_at timestamptz not null default now(),
  check(cadence<>'Weekly' or extract(isodow from starts_on)=1),
  foreign key(athlete,squad,member_role) references public.beta_members(id,squad,role) on delete cascade,
  unique(batch,athlete)
);
create index beta_notices_team on public.beta_notices(squad,starts_on);
create index beta_notices_recipient on public.beta_notices(athlete,starts_on);
create table public.beta_notice_reads (
  notice uuid primary key references public.beta_notices on delete cascade,
  read_at timestamptz not null default now()
);
alter table public.beta_notices enable row level security;
alter table public.beta_notice_reads enable row level security;
revoke all on public.beta_notices,public.beta_notice_reads from public,anon,authenticated;
grant select,insert(id,batch,squad,coach,athlete,cadence,starts_on,body) on public.beta_notices to authenticated;
grant select,insert(notice) on public.beta_notice_reads to authenticated;
create policy notice_read on public.beta_notices for select to authenticated using(
  nhf_private.coaches(squad) or (athlete=(select auth.uid()) and starts_on<=(now() at time zone 'Europe/Oslo')::date)
);
create policy notice_send on public.beta_notices for insert to authenticated with check(coach=(select auth.uid()) and nhf_private.coaches(squad));
create policy receipt_read on public.beta_notice_reads for select to authenticated using(exists(select from public.beta_notices n where n.id=notice));
create policy receipt_accept on public.beta_notice_reads for insert to authenticated with check(exists(
  select from public.beta_notices n where n.id=notice and n.athlete=(select auth.uid())
));
