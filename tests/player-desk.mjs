import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const pg=new PGlite(),[t,t2,c,c2,out,p,q,k,k2,msg]=Array.from({length:10},()=>crypto.randomUUID());
try{
 await pg.exec(`create role authenticated;create role anon;create schema auth;create schema nhf_private;grant usage on schema auth,nhf_private to authenticated;
 create table auth.users(id uuid primary key);create table beta_teams(id uuid primary key);create table beta_members(id uuid,squad uuid,role text);
 create function auth.uid() returns uuid language sql as $$select current_setting('test.uid',true)::uuid$$;
 create function nhf_private.coaches(t uuid) returns boolean language sql security definer as $$select exists(select from public.beta_members where squad=t and id=auth.uid() and role='coach')$$;
 create table beta_assignments(id uuid primary key,squad uuid,athlete uuid,day date,title text,kind text,personal boolean default false,exercises text[]);
 create table beta_team_messages(id uuid primary key,team uuid,athlete uuid,sender uuid,body text);
 create table beta_checks(assignment uuid);create table beta_feedback(assignment uuid);create table beta_workout_reviews(assignment uuid);
 create table nhf_private.court_exercise_ratings(activity_id uuid,origin text);create table nhf_private.session_load_entries(event uuid,source text);`);
 await pg.exec(await readFile(new URL("../supabase/migrations/20261113165129_player_desk.sql",import.meta.url),"utf8"));
 await pg.query("insert into beta_teams values ($1),($2)",[t,t2]);
 for(const [u,team,role] of [[p,t,"athlete"],[q,t,"athlete"],[c,t,"coach"],[c2,t,"coach"],[out,t2,"coach"]]){await pg.query("insert into auth.users values($1)",[u]);await pg.query("insert into beta_members values($1,$2,$3)",[u,team,role]);}
 const login=u=>pg.query("select set_config('test.uid',$1,false)",[u]);
 const act=(cmd,id,player=p,prev=["A"],lines=["B"])=>pg.query("select beta_change_player_plan($1,$2,$3,$4,$5,$6)",[t,player,id,cmd,prev,lines]);
 await login(c);for(const [id,pl] of [[k,p],[k2,q]])await pg.query("insert into beta_assignments values($1,$2,$3,current_date+1,'Styrke','Session',false,array['A'])",[id,t,pl]);
 await pg.query("insert into beta_team_messages values($1,$2,$3,$4,'Syntetisk melding')",[msg,t,p,c]);
 await pg.exec("set role authenticated");await login(p);await assert.rejects(act("remove",k));assert.equal((await pg.query("select * from beta_player_log")).rows.length,0);
 await login(out);await assert.rejects(act("retract",msg));assert.equal((await pg.query("select * from beta_player_log")).rows.length,0);
 await login(c2);await assert.rejects(act("retract",msg));await act("exercises",k);await assert.rejects(act("remove",k));await assert.rejects(act("remove",k,q));
 await login(c);await act("retract",msg);await act("remove",k,p,["B"]);const events=(await pg.query("select action,detail from beta_player_log where athlete=$1 order by id",[p])).rows;
 assert.deepEqual(events.map(r=>r.action),["Aktivitet lagt til","Melding sendt","Øvelser endret","Melding trukket tilbake","Aktivitet fjernet"]);assert.equal(events[3].detail,"Syntetisk melding");
 await pg.exec("reset role");assert.equal((await pg.query("select * from beta_team_messages")).rows.length,0);assert.equal((await pg.query("select id from beta_assignments")).rows[0].id,k2);
 await pg.query("insert into beta_checks values($1)",[k2]);await assert.rejects(act("remove",k2,q));console.log("PASS: team scope, coach-only log, edit conflict, protected results and message retraction");
}finally{await pg.close();}
