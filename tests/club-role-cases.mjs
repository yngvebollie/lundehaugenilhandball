import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
export async function checkClubRole(pg,login,uuid,team){
  await pg.exec("reset role;create table auth.sessions(id uuid primary key,user_id uuid references auth.users)");
  await pg.exec(await readFile(new URL("../supabase/migrations/20261107201028_club_user_directory.sql",import.meta.url),"utf8"));
  const session=uuid(901),another=uuid(902),claims=id=>pg.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({session_id:id})]);
  const role=mode=>pg.query("select beta_club_role($1) v",[mode]).then(r=>r.rows[0].v);
  const directory=()=>pg.query("select beta_club_directory() v").then(r=>r.rows[0].v);
  await pg.query("insert into nhf_private.club_admins values($1)",[uuid(1)]);
  await pg.query("insert into auth.sessions values($1,$3),($2,$3)",[session,another,uuid(1)]);
  await pg.exec("set role authenticated");await login(1);await claims(session);
  assert.deepEqual(await role("read"),{eligible:true,active:false});const own=await directory();
  assert.ok(!own.teams.some(t=>t.id===uuid(20)));assert.ok(own.teams.some(t=>t.id===team));
  assert.deepEqual(await role("club"),{eligible:true,active:true});const club=await directory();
  assert.ok(club.teams.some(t=>t.id===uuid(20)));assert.ok(club.members.some(m=>m.team===uuid(20)));
  assert.ok(!JSON.stringify(club).includes('"token"'));
  await claims(another);assert.equal((await role("read")).active,false);
  await claims(session);await login(4);await assert.rejects(role("club"));assert.ok(!(await directory()).teams.some(t=>t.id===uuid(10)));
  await login(7);await assert.rejects(directory());await assert.rejects(role("club"));
  await login(1);await role("coach");assert.ok(!(await directory()).teams.some(t=>t.id===uuid(20)));
}
