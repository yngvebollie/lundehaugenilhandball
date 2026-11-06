import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";

const pg = new PGlite();
const uuid = n => typeof n==="string"&&n.length===36?n:"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
try {
  await pg.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    grant usage on schema auth to authenticated;`);
  await pg.exec(await readFile(new URL("../supabase/beta/install.sql",import.meta.url),"utf8"));
  await pg.exec(await readFile(new URL("../supabase/beta/002_programs.sql",import.meta.url),"utf8"));
  for(const [id,squad,role] of [[1,10,"coach"],[2,10,"athlete"],[3,10,"athlete"],[4,20,"coach"],[5,20,"athlete"]]){
    await pg.query("insert into auth.users values ($1,$2,now())",[uuid(id),id+"@test.local"]);
    await pg.query("insert into beta_members values ($1,$2,$3,$4)",[uuid(id),uuid(squad),"Tester "+id,role]);
  }
  for(const script of ["003_weekly_planner","004_teams","005_coach_usage"]){
    await pg.exec(await readFile(new URL("../supabase/beta/"+script+".sql",import.meta.url),"utf8"));
  }
  await pg.query("insert into auth.users values ($1,'new@test.local',now())",[uuid(6)]);
  await pg.exec("set role authenticated");
  const login=id=>pg.query("select set_config('test.uid',$1,false)",[uuid(id)]);
  const assign=(id,squad,athlete)=>pg.query("insert into beta_assignments(id,squad,athlete,title,day,exercises) values($1,$2,$3,'Strength',current_date,array['Squat','Plank'])",[uuid(id),uuid(squad),uuid(athlete)]);
  const check=(id,step)=>pg.query("insert into beta_checks values ($1,$2)",[uuid(id),step]);
  const size=async table=>(await pg.query("select * from "+table)).rows.length;
  await login(1);
  await pg.query("insert into beta_programs values ($1,$2,'Strength week',$3)",[uuid(21),uuid(10),JSON.stringify([{title:"Squat",offset:0,exercises:["Squat 3 x 8"]}])]);
  await assign(11,10,2); await assign(12,10,3);
  await assert.rejects(assign(13,20,5));
  await assert.rejects(assign(13,10,5));
  await login(2);
  assert.equal(await size("beta_programs"),0);
  const rate=(id,effort)=>pg.query("insert into beta_feedback values ($1,$2)",[uuid(id),effort]);
  await assert.rejects(rate(12,"Hard"));
  await rate(11,"Hard");
  await pg.query("update beta_feedback set effort='Easy' where assignment=$1",[uuid(11)]);
  assert.equal(await size("beta_members"),1);
  assert.equal(await size("beta_assignments"),1);
  await assert.rejects(assign(13,10,2));
  await assert.rejects(check(12,0));
  await assert.rejects(check(11,2));
  await check(11,0); await assert.rejects(check(11,0)); await check(11,1);
  await login(3); assert.equal(await size("beta_checks"),0); assert.equal(await size("beta_feedback"),0);
  await login(1); assert.equal(await size("beta_checks"),2); assert.equal((await pg.query("select effort from beta_feedback")).rows[0].effort,"Easy");
  await login(4); assert.equal(await size("beta_assignments"),0); assert.equal(await size("beta_programs"),0);
  await login(1);
  const team=(await pg.query("select public.beta_new_team('Junior squad') as id")).rows[0].id;
  assert.equal(await size("beta_teams"),2);
  const invite=async(address,role)=>(await pg.query("select public.beta_invite($1,$2,$3) as token",[team,address,role])).rows[0].token;
  const join=code=>pg.query("select public.beta_join($1,'New member')",[code]);
  const code=await invite("new@test.local","athlete"), coachCode=await invite("4@test.local","coach"), duplicate=await invite("2@test.local","athlete");
  await login(2); await assert.rejects(join(code)); await assert.rejects(join(duplicate));
  await login(6); await join(code); await assert.rejects(join(code));
  assert.equal(await size("beta_teams"),1);
  await assert.rejects(invite("new@test.local","coach"));
  await pg.query("update beta_members set position='Wing',bio='Training for selection' where id=$1",[uuid(6)]);
  await assert.rejects(pg.query("update beta_members set squad=$1 where id=$2",[uuid(20),uuid(6)]));
  await pg.query("insert into beta_assignments(id,squad,athlete,title,day,exercises,kind,personal) values($1,$2,$3,'Footwork',current_date,array['Drill'],'Session',true)",[uuid(30),team,uuid(6)]);
  await assert.rejects(assign(31,team,6));
  await login(4); await join(coachCode); assert.equal(await size("beta_teams"),2);
  await assign(32,team,6);await assert.rejects(assign(33,10,2));
  await pg.query("insert into beta_exercises values($1,$2,'Row','3 x 10','Upper body')",[uuid(40),team]);
  await login(6);assert.equal(await size("beta_exercises"),0);
  await login(1);assert.equal(await size("beta_exercises"),1);
  await pg.query("select beta_used('strength:goblet-squat')");
  await pg.query("select beta_used('strength:goblet-squat')");
  assert.equal((await pg.query("select uses from beta_exercise_usage")).rows[0].uses,2);
  await login(4);assert.equal(await size("beta_exercise_usage"),0);
  await login(6);await assert.rejects(pg.query("select beta_used('example')"));
  await pg.exec("reset role; set role anon"); await assert.rejects(size("beta_assignments"));
  console.log("PASS: publish, complete, duplicate handling, roster, athlete, squad and anonymous isolation");
} finally {await pg.close();}
