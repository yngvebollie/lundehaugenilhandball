begin;
create table public.beta_invitation_deliveries (
 id uuid primary key default gen_random_uuid(),
 team uuid not null references public.beta_teams on delete cascade,
 recipient text not null check(length(recipient) between 3 and 254),
 member_role text not null check(member_role in ('athlete','coach')),
 sender text not null,
 provider_id text unique,
 status text not null default 'pending' check(status in
   ('pending','queued','sent','delivered','delivery_delayed','bounced','failed','suppressed','complained','canceled','unknown')),
 error_code text,
 created_at timestamptz not null default now(),
 checked_at timestamptz,
 check_error text,
 created_by uuid references auth.users on delete set null
);
create index invitation_delivery_team_date on public.beta_invitation_deliveries(team,created_at desc);
alter table public.beta_invitation_deliveries enable row level security;
revoke all on public.beta_invitation_deliveries from public,anon,authenticated;
grant select on public.beta_invitation_deliveries to authenticated;
grant select,insert,update,delete on public.beta_invitation_deliveries to service_role;
create policy coach_delivery_read on public.beta_invitation_deliveries for select to authenticated
 using(nhf_private.coaches(team));
comment on table public.beta_invitation_deliveries is
 'Server-observed invitation delivery receipts. No invitation tokens or email bodies. Coaches can read their teams; only service_role writes.';
commit;
