alter table public.beta_team_seasons add column ended_at timestamptz, add constraint beta_ended_not_syncing check(ended_at is null or not active);
grant update(display_name,ended_at) on public.beta_team_seasons to authenticated;
create table public.beta_game_declines(team uuid not null references public.beta_teams,match_id uuid not null references public.beta_matches on delete cascade,athlete uuid not null references public.beta_members on delete cascade,primary key(match_id,athlete));
create index beta_game_declines_team on public.beta_game_declines(team);
alter table public.beta_game_declines enable row level security;
revoke all on public.beta_game_declines from public,anon,authenticated;
grant select,insert(team,match_id,athlete),delete on public.beta_game_declines to authenticated;
create policy gd_read on public.beta_game_declines for select to authenticated using(nhf_private.coaches(team));
create policy gd_remove on public.beta_game_declines for delete to authenticated using(nhf_private.coaches(team));
create policy gd_add on public.beta_game_declines for insert to authenticated with check(nhf_private.coaches(team) and exists(select from public.beta_members p where p.id=athlete and p.squad=beta_game_declines.team and p.role='athlete') and exists(select from public.beta_matches m where m.id=match_id and m.team=beta_game_declines.team));
alter table public.beta_cup_games add column declined uuid[] not null default '{}', add check(not(lineup && declined) and cardinality(declined)<=100);
grant insert(declined),update(declined) on public.beta_cup_games to authenticated;
alter policy cup_game_add on public.beta_cup_games with check(nhf_private.cup_lineup(team,lineup||declined));
alter policy cup_game_edit on public.beta_cup_games with check(nhf_private.cup_lineup(team,lineup||declined));
create table public.beta_club_changes(id bigint generated always as identity primary key,team uuid not null,actor_name text not null,description text not null,at_time timestamptz not null default now());
create index beta_club_changes_feed on public.beta_club_changes(team,at_time desc);
alter table public.beta_club_changes enable row level security;
revoke all on public.beta_club_changes from public,anon,authenticated;
grant select on public.beta_club_changes to authenticated;
create policy changes_read on public.beta_club_changes for select to authenticated using(nhf_private.coaches(team));
create function nhf_private.record_club_change() returns trigger language plpgsql security definer set search_path='' as $$
declare v jsonb; t uuid; actor text; msg text;
begin
 if auth.uid() is null then return null;end if;
 if tg_op='DELETE' then v:=to_jsonb(old);else v:=to_jsonb(new);end if;
 t:=coalesce(v->>'team',v->>'squad')::uuid;
 select name into actor from public.beta_members where id=auth.uid() and role='coach';
 if actor is null or not nhf_private.coaches(t) then return null;end if;
 msg:=case tg_table_name when 'beta_team_seasons' then case when tg_op='INSERT' then 'La til lag: ' when v->>'ended_at' is distinct from to_jsonb(old)->>'ended_at' then 'Avsluttet sesong: ' when v->>'display_name' is distinct from to_jsonb(old)->>'display_name' then 'Endret lagnavn: ' else 'Oppdaterte lagprofil: ' end||coalesce(v->>'display_name',v->>'org_id')
 when 'invites' then 'Opprettet personlig invitasjon ('||(v->>'role')||')'
 when 'application_links' then 'Endret lagets invitasjonslenke'
 when 'beta_programs' then 'Lagret program: '||(v->>'name')
 when 'beta_cups' then 'Opprettet turnering: '||(v->>'name')
 when 'beta_cup_games' then 'Lagret turneringskamp mot '||(v->>'opponent')
 when 'beta_game_declines' then case when tg_op='DELETE' then 'Angret' else 'Registrerte' end||' avslag fra '||coalesce((select name from public.beta_members where id=(v->>'athlete')::uuid),'utøver')
 when 'beta_members' then 'Endret draktnummer for '||(v->>'name')||': '||coalesce(to_jsonb(old)->>'shirt_number','–')||' → '||coalesce(v->>'shirt_number','–')
 end;
 insert into public.beta_club_changes(team,actor_name,description) values(t,actor,msg);
 return null;
end $$;
revoke all on function nhf_private.record_club_change() from public,anon,authenticated;
create trigger change_season after insert or update of display_name,ended_at,profile_note on public.beta_team_seasons for each row execute function nhf_private.record_club_change();
create trigger change_invite after insert on nhf_private.invites for each row execute function nhf_private.record_club_change();
create trigger change_link after insert or update of token on nhf_private.application_links for each row execute function nhf_private.record_club_change();
create trigger change_program after insert or update on public.beta_programs for each row execute function nhf_private.record_club_change();
create trigger change_cup after insert on public.beta_cups for each row execute function nhf_private.record_club_change();
create trigger change_game after insert or update on public.beta_cup_games for each row execute function nhf_private.record_club_change();
create trigger change_decline after insert or delete on public.beta_game_declines for each row execute function nhf_private.record_club_change();
create trigger change_shirt after update of shirt_number on public.beta_members for each row when(old.shirt_number is distinct from new.shirt_number) execute function nhf_private.record_club_change();
create table public.beta_jersey_changes(id bigint generated always as identity primary key,team uuid not null,athlete uuid not null,season integer,previous text,next_num text,effective date not null default ((now() at time zone 'Europe/Oslo')::date));
create index beta_jersey_player on public.beta_jersey_changes(team,athlete,id desc);
alter table public.beta_jersey_changes enable row level security;
revoke all on public.beta_jersey_changes from public,anon,authenticated;
grant select on public.beta_jersey_changes to authenticated;
create policy jersey_read on public.beta_jersey_changes for select to authenticated using(nhf_private.coaches(team));
create function nhf_private.jersey_history() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.beta_jersey_changes(team,athlete,season,previous,next_num) values(new.squad,new.id,(select season from nhf_private.active_seasons where team=new.squad),old.shirt_number,new.shirt_number);return null;end $$;
revoke all on function nhf_private.jersey_history() from public,anon,authenticated;
create trigger save_jersey_history after update of shirt_number on public.beta_members for each row when(new.role='athlete' and new.squad is not null and old.shirt_number is distinct from new.shirt_number) execute function nhf_private.jersey_history();
create function nhf_private.set_jersey(t uuid,p uuid,n text) returns void language plpgsql security definer set search_path='' as $$
begin if not nhf_private.coaches(t) or auth.uid() is null or (n is not null and n !~ '^[1-9][0-9]{0,2}$') then raise exception 'Ugyldig draktbytte';end if;
 update public.beta_members set shirt_number=n where id=p and squad=t and role='athlete';if not found then raise exception 'Ukjent spiller';end if;end $$;
create function public.beta_set_jersey(t uuid,p uuid,n text) returns void language sql security invoker set search_path='' as $$select nhf_private.set_jersey(t,p,n)$$;
revoke all on function public.beta_set_jersey(uuid,uuid,text),nhf_private.set_jersey(uuid,uuid,text) from public,anon;
grant execute on function public.beta_set_jersey(uuid,uuid,text),nhf_private.set_jersey(uuid,uuid,text) to authenticated;
