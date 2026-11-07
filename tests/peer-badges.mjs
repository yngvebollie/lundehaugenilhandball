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
}
