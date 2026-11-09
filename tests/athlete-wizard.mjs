import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const pg=new PGlite(),[team,p,c,other,otherTeam]=Array.from({length:5},()=>crypto.randomUUID());
try{
 await pg.exec(`create role authenticated;create role anon;create schema auth;create schema nhf_private;
 grant usage on schema auth,nhf_private to authenticated;
 create table auth.users(id uuid primary key,email text);
 create table beta_teams(id uuid primary key);create table beta_members(id uuid primary key,name text,given_name text,family_name text,shirt_number text,squad uuid,role text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function nhf_private.coaches(t uuid) returns boolean language sql security definer as $$select exists(select from public.beta_members where id=auth.uid() and squad=t and role='coach')$$;
 create table nhf_private.regular_activities(id uuid primary key default gen_random_uuid(),team uuid,athlete uuid,title text,kind text,days int[],clock time,minutes int,weight int,starts date,ends date,check(ends is null or ends>=starts));
 create table nhf_private.regular_checkins(rule uuid references nhf_private.regular_activities on delete cascade,day date,primary key(rule,day));`);
 for(const id of [team,otherTeam])await pg.query("insert into beta_teams values($1)",[id]);
 for(const [id,squad,role] of [[p,team,"athlete"],[c,team,"coach"],[other,otherTeam,"coach"]]){
  await pg.query("insert into auth.users values($1,'fictional@example.invalid')",[id]);await pg.query("insert into beta_members(id,name,squad,role) values($1,'Test Spiller',$2,$3)",[id,squad,role]);
 }
 await pg.exec(await readFile(new URL("../supabase/migrations/20261109200146_athlete_onboarding_profile.sql",import.meta.url),"utf8"));await pg.exec("set role authenticated");
 const login=id=>pg.query("select set_config('test.uid',$1,false)",[id]);
 const rpc=(cmd,v=null)=>pg.query("select beta_athlete_wizard($1,$2,$3) x",[team,cmd,v]).then(r=>r.rows[0].x);
 await login(p);assert.equal((await rpc("read")).completed,false);await assert.rejects(rpc("board"));
 const v={given:"Test",family:"Spiller",shirt:"27",days:[2,4],minutes:55,skills:["duel","feint","decisions"],physical:["footwork","jump"],positions:["cb","lw"]};
 assert.equal((await rpc("save",v)).completed,true);assert.deepEqual((await rpc("save",v)).days,[2,4]);await assert.rejects(rpc("save",{...v,positions:["unknown"]}));
 await pg.exec("reset role");const initial=(await pg.query("select * from nhf_private.regular_activities")).rows;assert.equal(initial.length,1);assert.equal(initial[0].minutes,55);
 await pg.query("insert into nhf_private.regular_checkins select $1,(now() at time zone 'Europe/Oslo')::date",[initial[0].id]);await pg.exec("set role authenticated");
 await rpc("save",{...v,days:[1],minutes:90,positions:["gk"]});await rpc("save",{...v,days:[2],minutes:60,positions:["gk"]});await login(c);
 const b=await rpc("board");assert.deepEqual(b,[{id:p,name:"Test Spiller",shirt:"27",positions:["gk"]}]);await assert.rejects(rpc("save",v));await assert.rejects(rpc("read"));await login(other);await assert.rejects(rpc("board"));await assert.rejects(pg.query("select * from nhf_private.athlete_preferences"));
 await pg.exec("reset role");assert.equal((await pg.query("select count(*)::int n from nhf_private.regular_checkins")).rows[0].n,1);assert.equal((await pg.query("select count(*)::int n from nhf_private.regular_activities where ends is null")).rows[0].n,1);
 await assert.rejects(pg.query("insert into nhf_private.regular_activities(team,athlete,kind,starts,days) values($1,$2,'gym',current_date+1,array[2])",[team,p]));
 console.log("PASS: repeat saves, own profile, court privacy, gym history, validated choices and team isolation.");
}finally{await pg.close();}
