import assert from "node:assert/strict";
export async function checkPeers(pg,login,uuid,team,reg){
 const athletes=[301,302,303,304,305],mid=uuid(320),rpc=(action,a,v={})=>pg.query("select beta_badges($1,$2,$3,$4) v",[action,team,uuid(a),v]).then(r=>r.rows[0].v);
 await pg.exec("reset role");
 const time=(await pg.query("select ((now()-interval '1 min') at time zone 'Europe/Oslo')::text t")).rows[0].t,day=time.slice(0,10);
 await pg.query("insert into beta_matches(id,team,registration,nif_id,opponent,day,home,away,lineup,completed) values ($1,$2,$3,9999,'Other',$4,'Test','Other','{}',true)",[mid,team,reg,day]);
 for(const n of athletes){
  await pg.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",[uuid(n),n+"@example.invalid"]);
  await pg.query("insert into beta_members(id,squad,name,role) values($1,$2,$3,'athlete')",[uuid(n),team,"Player "+n]);
  await pg.query("insert into nhf_private.match_players(id,name) values($1,$2)",[uuid(n+20),"Player "+n]);
  await pg.query("insert into nhf_private.match_participants(team,match_id,player_id,local_played) values($1,$2,$3,true)",[team,mid,uuid(n+20)]);
 }
 await pg.exec("set role authenticated");await login(1);
 for(const n of athletes)await rpc("link",n,{reg,player:uuid(n+20)});
 await rpc("finish",301,{match:mid,time});
 const give=(from,to,key="fan_favorite")=>rpc("recognize",from,{match:mid,recipient:uuid(to),key});
 await login(301);const page=await rpc("read",301);assert.equal(page.eligible.length,4);
 await assert.rejects(give(301,301));await assert.rejects(give(301,2));await assert.rejects(give(302,303));
 await give(301,302);await give(301,302,"everyones_teammate");await give(301,303);await give(301,304);await assert.rejects(give(301,305),/Maks tre/);
 await login(303);await give(303,302,"everyones_teammate");await login(302);
 let inbox=await rpc("read",302);assert.equal(inbox.counts.everyones_teammate,2);assert.equal(inbox.inbox.length,2);assert.ok(inbox.inbox.every(r=>!("giver" in r)&&!("rating" in r)));
 await rpc("privacy",302,{receive:false});await login(303);await assert.rejects(give(303,302));await login(302);await rpc("privacy",302,{receive:true});
 await login(1);await rpc("revoke",302,{match:mid,giver:uuid(301),reason:"Wrong category"});await login(302);assert.equal((await rpc("read",302)).counts.everyones_teammate,1);
 await pg.exec("reset role");await pg.query("update nhf_private.match_participants set local_played=false where match_id=$1 and player_id=$2",[mid,uuid(323)]);
 await pg.exec("set role authenticated");await login(302);assert.equal((await rpc("read",302)).counts.everyones_teammate??0,0);
 await pg.exec("reset role");await pg.query("update nhf_private.badge_finish set finished_at=now()-interval '73 hours' where match_id=$1",[mid]);
 await pg.exec("set role authenticated");await login(301);await assert.rejects(give(301,304));await login(1);
 // Two levels, one duplicate NIF match, and a different season.
 await pg.exec("reset role");
 await pg.query("update nhf_private.match_participants set report_goals=4 where match_id=$1 and player_id=$2",[mid,uuid(321)]);
 const addReg=async(org,season)=>(await pg.query("insert into beta_team_seasons(team,org_id,season) values($1,$2,$3) returning id",[team,org,season])).rows[0].id;
 const second=await addReg(202,99),previous=await addReg(203,98);
 for(const [regId,no,nif,goals] of [[second,330,9999,4],[second,331,9998,6],[previous,332,9997,7]]){
   await pg.query("insert into beta_matches(id,team,registration,nif_id,opponent,day,home,away,lineup,completed) values ($1,$2,$3,$4,'Other',$5,'Test','Other','{}',true)",[uuid(no),team,regId,nif,day]);
   await pg.query("insert into nhf_private.match_participants(team,match_id,player_id,local_played,report_goals) values($1,$2,$3,true,$4)",[team,uuid(no),uuid(321),goals]);
   await pg.query("insert into nhf_private.badge_links(reg,player,athlete) values($1,$2,$3) on conflict do nothing",[regId,uuid(321),uuid(301)]);
 }
 await pg.exec("set role authenticated");await login(1);
 const repeats=async()=>{const r=await rpc("read",301);return [1,2,3].map(t=>r.earned.filter(e=>e.key==="hat_trick_hero"&&e.level===t).length);};
 assert.deepEqual(await repeats(),[3,2,0]);assert.deepEqual(await repeats(),[3,2,0]);
 await pg.exec("reset role");await pg.query("update nhf_private.match_participants set report_goals=10 where match_id=$1 and player_id=$2",[uuid(332),uuid(321)]);
 await pg.exec("set role authenticated");await login(1);assert.deepEqual(await repeats(),[3,2,1]);
 await pg.exec("reset role");await pg.query("update nhf_private.match_participants set report_goals=7 where match_id=$1 and player_id=$2",[uuid(332),uuid(321)]);
 await pg.exec("set role authenticated");await login(1);assert.deepEqual(await repeats(),[3,2,0]);
 const current=await rpc("read",301);assert.equal(current.counts.goal_machine,10);assert.equal(current.earned.filter(x=>x.key==="goal_machine").length,1);
 await pg.query("select beta_season_settings('save',$1,98,'Earlier')",[team]);
 const earlier=await rpc("read",301);assert.equal(earlier.counts.goal_machine,7);assert.equal(earlier.earned.filter(x=>x.key==="goal_machine").length,0);
 await pg.query("select beta_season_settings('save',$1,99,'2024/25')",[team]);assert.equal((await rpc("read",301)).counts.goal_machine,10);

 const vote=(recipient,cat="vote_best")=>pg.query("select beta_match_ballot($1,$2,$3) p",[mid,cat,recipient==null?null:uuid(recipient)]);
 await login(301);await assert.rejects(vote(301));await assert.rejects(vote(303));await vote(302);await vote(302);
 await login(304);await vote(302);await login(305);await vote(302);await login(302);
 const medal=await rpc("read",302);assert.equal(medal.counts.vote_best,3);assert.equal(medal.earned.find(e=>e.key==="vote_best").match,mid);assert.equal(medal.earned.filter(x=>x.key==="vote_best").length,1);
 await login(305);await vote(301);await login(302);assert.equal((await rpc("read",302)).counts.vote_best,2);
 await login(5);await assert.rejects(vote(302));assert.deepEqual((await pg.query("select beta_my_fixture_log() as v")).rows[0].v,[]);
 await login(301);const mine=(await pg.query("select beta_my_fixture_log() as v")).rows[0].v;assert.ok(mine.some(g=>g.id===mid&&g.goals===4));assert.ok(mine.every(g=>!("lineup" in g)));
 const entries=JSON.stringify([{id:"strength:push-up",name:"Push-up",unit:"rep",sets:[12,12,10]}]);
 const save=()=>pg.query("select beta_quick_training_sets($1,$2,'Workout','2026-01-01 12:00Z',30,$3)",[team,uuid(895),entries]);
 await save();await save();assert.equal((await pg.query("select exercises from beta_assignments where id=$1",[uuid(895)])).rows[0].exercises[0],"Push-up · 12 / 12 / 10 rep");
 await login(1);
}
