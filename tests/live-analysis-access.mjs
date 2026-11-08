import assert from "node:assert/strict";
export async function checkLive(pg,login,team,reg,mid){
 const rpc=(cmd,rev=0,v={})=>pg.query("select public.beta_live_match($1,$2,$3,$4) s",[mid,cmd,rev,v]).then(x=>x.rows[0].s);
 const season=()=>pg.query("select public.beta_live_season($1,$2) s",[team,reg]).then(x=>x.rows[0].s);
 assert.equal((await rpc("read")).status,"idle");await assert.rejects(rpc("event"));
 const first=await rpc("start");assert.equal(first.status,"running");await assert.rejects(rpc("start"));
 const event={kind:"save",side:"opp",keeper:"Testkeeper",x:0,y:100,phase:"7 m",origin:"7 m"};
 await assert.rejects(rpc("event",1,{...event,x:101}));await assert.rejects(rpc("event",1,{...event,keeper:""}));
 const log=await rpc("event",1,event);assert.equal(log.events[0].x,0);assert.equal(log.events[0].y,100);
 await assert.rejects(rpc("event",1,event));assert.equal((await rpc("read")).events.length,1);
 const paused=await rpc("pause",2);assert.equal(paused.started,null);await assert.rejects(rpc("event",3,event));
 const again=await rpc("read");assert.equal(again.elapsed,paused.elapsed);
 const second=await rpc("period",3);assert.equal(second.period,2);
 const goal=await rpc("event",4,{...event,side:"own",kind:"goal",player:"Spiller A",assist:"Spiller B"});assert.equal(goal.events[1].assist,"Spiller B");assert.equal(goal.events[1].period,2);
 await rpc("undo",5);assert.equal((await season())[0].events.length,1);
 assert.equal((await rpc("finish",6)).status,"finished");await assert.rejects(rpc("event",7,event));await assert.rejects(rpc("resume",7));
 assert.equal((await pg.query("select score from beta_matches where id=$1",[mid])).rows[0].score,"12-11");
 await login(4);assert.equal((await rpc("read")).status,"finished");
 await pg.exec("reset role;insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000904','outsider@example.invalid');insert into beta_members(id,name,role,squad) values('00000000-0000-4000-8000-000000000904','Unrelated coach','coach','00000000-0000-4000-8000-000000000020');set role authenticated");
 for(const person of [2,904]){await login(person);await assert.rejects(rpc("read"));await assert.rejects(season());await assert.rejects(rpc("undo",7));}
 await login(1);
}
