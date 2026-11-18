import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {followedUp} from "../src/lib/coach-suggestions.ts";
const pg=new PGlite(),[t,t2,c,c2,out,p,q]=Array.from({length:7},()=>crypto.randomUUID());
try{
 await pg.exec(`create role authenticated;create role anon;create schema auth;create schema nhf_private;grant usage on schema auth,nhf_private to authenticated;
 create table auth.users(id uuid primary key);create table beta_teams(id uuid primary key);create table beta_members(id uuid,squad uuid,role text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function nhf_private.coaches(t uuid) returns boolean language sql security definer as $$select exists(select from public.beta_members where squad=t and id=auth.uid() and role='coach')$$;
 create table beta_assignments(id uuid primary key,squad uuid,athlete uuid,day date,title text,kind text,personal boolean default false,exercises text[]);
 create table beta_team_messages(id uuid primary key,team uuid,athlete uuid,sender uuid,body text);
 create table beta_checks(assignment uuid);create table beta_feedback(assignment uuid);create table beta_workout_reviews(assignment uuid);
 create table nhf_private.court_exercise_ratings(activity_id uuid,origin text);create table nhf_private.session_load_entries(event uuid,source text);`);
 for(const file of ['20261113165129_player_desk.sql','20261118113316_coach_followup_log.sql','20261118115833_reopen_coach_followup.sql'])await pg.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await pg.query('insert into beta_teams values($1),($2)',[t,t2]);
 for(const [u,team,role] of [[p,t,'athlete'],[q,t2,'athlete'],[c,t,'coach'],[c2,t,'coach'],[out,t2,'coach']]){await pg.query('insert into auth.users values($1)',[u]);await pg.query('insert into beta_members values($1,$2,$3)',[u,team,role]);}
 const login=u=>pg.query("select set_config('test.uid',$1,false)",[u]);
 const v={key:p+':rating',signals:['b','a'],title:'Snakk om ovelsen',note:'Avtalte en enklere variant.',evidence:'2 av 5 stjerner',kind:'ratings'};
 const save=(patch={},person=p,team=t)=>pg.query('select beta_complete_followup($1,$2,$3) as r',[team,person,{...v,...patch}]);
 await pg.exec('set role authenticated');await login(c);const first=(await save()).rows[0].r;assert.equal(first.actor,c);assert.equal(first.followup.note,v.note);assert.deepEqual(first.followup.signals,['a','b']);assert.match(first.detail,/Notat: Avtalte/);
 const retry=(await save({signals:['a','b','a'],note:'Skal ikke overskrive'})).rows[0].r;assert.equal(retry.id,first.id);assert.equal(retry.followup.note,v.note);
 await login(c2);assert.equal((await save()).rows[0].r.id,first.id);assert.equal((await pg.query('select * from beta_player_log')).rows.length,1);
 await assert.rejects(save({note:' '}));await assert.rejects(save({note:'x'.repeat(1001)}));await assert.rejects(save({signals:[]}));await assert.rejects(save({signals:[{}]}));await assert.rejects(save({kind:'fake'}));await assert.rejects(save({},q));await assert.rejects(save({},p,t2));
 await assert.rejects(pg.query("update beta_player_log set detail='changed'"));await assert.rejects(pg.query('delete from beta_player_log'));await assert.rejects(pg.query("insert into beta_player_log(team,athlete,actor,action,detail,subject) values($1,$2,$3,'x','x',$2)",[t,p,c2]));
 for(const who of [p,q,out,'']){await login(who);await assert.rejects(save());assert.equal((await pg.query('select * from beta_player_log')).rows.length,0);}
 await pg.exec('reset role;set role anon');await assert.rejects(save());await assert.rejects(pg.query('select * from beta_player_log'));
 await pg.exec('reset role;set role authenticated');await login(c);const newer=(await save({signals:['a','b','c'],note:'Ny samtale.'})).rows[0].r;assert.notEqual(newer.id,first.id);assert.equal((await pg.query('select * from beta_player_log')).rows.length,2);
 const reopen=(id,person=p,team=t)=>pg.query('select beta_reopen_followup($1,$2,$3) as r',[team,person,id]);
 await assert.rejects(reopen(first.id));await assert.rejects(reopen(newer.id,q));await assert.rejects(reopen(newer.id,p,t2));await assert.rejects(reopen(999999));
 await login(c2);const opened=(await reopen(newer.id)).rows[0].r;assert.equal(opened.actor,c2);assert.equal(opened.followup.state,'reopened');assert.equal(opened.followup.reopens,String(newer.id));
 assert.equal((await reopen(newer.id)).rows[0].r.id,opened.id);assert.equal((await pg.query('select * from beta_player_log')).rows.length,3);
 assert.equal((await pg.query('select detail from beta_player_log where id=$1',[first.id])).rows[0].detail,first.detail);
 assert.equal(followedUp({id:v.key,athlete:p,signals:['a','b']},[opened,newer,first]),false);
 await assert.rejects(save());await assert.rejects(save({cycle:String(first.id)}));
 for(const who of [p,out,'']){await login(who);await assert.rejects(reopen(newer.id));assert.equal((await pg.query('select * from beta_player_log')).rows.length,0);}
 await pg.exec('reset role;set role anon');await assert.rejects(reopen(newer.id));await pg.exec('reset role;set role authenticated');await login(c);
 const again=(await save({cycle:String(opened.id),note:'Ny oppfolging etter feilkryss.'})).rows[0].r;
 assert.notEqual(again.id,first.id);assert.equal((await save({cycle:String(opened.id),note:'Ny oppfolging etter feilkryss.'})).rows[0].r.id,again.id);
 await assert.rejects(reopen(newer.id));assert.equal(followedUp({id:v.key,athlete:p,signals:['a','b']},[again,opened,newer,first]),true);
 const reopenedAgain=(await reopen(again.id)).rows[0].r;assert.notEqual(reopenedAgain.id,opened.id);await assert.rejects(save({cycle:String(opened.id)}));
 await pg.exec('reset role');await pg.query('delete from beta_members where id=$1',[c]);await pg.exec('set role authenticated');await assert.rejects(save());await assert.rejects(reopen(again.id));assert.equal((await pg.query('select * from beta_player_log')).rows.length,0);
 const s={id:v.key,athlete:p,signals:['a','b']};assert.equal(followedUp(s,[first]),true);assert.equal(followedUp({...s,signals:['b']},[first]),true);assert.equal(followedUp({...s,signals:['a','b','c']},[first]),false);assert.equal(followedUp({...s,athlete:q},[first]),false);
 console.log('PASS: reopen/recomplete cycles, immutable notes, stale-state rejection, idempotent reopening, atomic log/status, server actor/time, dedup/retry/co-coach, immutable notes, new signals, rolling windows, denied athlete/other-team/anon/revoked coach and input validation');
}finally{await pg.close();}
