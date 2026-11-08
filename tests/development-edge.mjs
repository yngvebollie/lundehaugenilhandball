import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {posix} from "node:path";
const files=JSON.parse(execFileSync(process.execPath,["scripts/pack-development-edge.mjs"],{encoding:"utf8"}));
const url=name=>{
 const mod=files.find(f=>f.name===name);assert.ok(mod,name);
 const code=mod.content.replace(/from "(\.[^"]+)"/g,(_,p)=>'from "'+url(posix.join(posix.dirname(name),p))+'"');
 return "data:text/javascript;base64,"+Buffer.from(code).toString("base64");
};
const {serveDevelopment}=await import(url("lib/development/server.js"));
const team=crypto.randomUUID(),person=crypto.randomUUID(),coach=crypto.randomUUID(),tokens={"coach-test":coach,"athlete-test":person};
let rev=0,plan=null,notes=[];
const config={url:"https://test.invalid",anonKey:"publishable-test",serviceKey:"server-test"};
async function mock(url,init){
 if(url.endsWith("/auth/v1/user")){
  assert.equal(init.headers.apikey,config.anonKey);
  const id=tokens[init.headers.Authorization.split(" ")[1]];return id?Response.json({id}):Response.json({}, {status:401});
 }
 assert.equal(init.headers.apikey,config.serviceKey);const r=JSON.parse(init.body);
 assert.equal(r.t,team);assert.equal(r.p,person);assert.ok(Object.values(tokens).includes(r.actor));
 if(r.mode==="write"){assert.equal(r.expected,rev);rev++;plan=r.next_doc;if(r.note)notes.push({text:r.note,at:new Date().toISOString()});}
 return Response.json({rev,plan,coach:r.actor===coach,notes:r.actor===coach?notes:[],limit:3,keeper:false,keeperAxes:[],sessions:[],library:[]});
}
const send=(token,cmd,extra={})=>serveDevelopment(new Request("https://test.invalid",{method:"POST",headers:token?{Authorization:"Bearer "+token}:{},body:JSON.stringify({team,person,rev,cmd,...extra})}),config,mock);
assert.equal((await send("")).status,401);assert.equal((await send("bad")).status,401);
const command=(action,v)=>({action,key:crypto.randomUUID(),v});
assert.equal((await send("coach-test",command("note",{text:"PRIVATE_SENTINEL"}))).status,200);
const goal=command("publish",{title:"Mottak",criteria:"Avtalt handling",intention:"Øve sammen",profile:"field",skill:""});assert.equal((await send("coach-test",goal)).status,200);
assert.equal((await send("coach-test",command("draft",{...goal.v,title:"PRIVATE_DRAFT"}))).status,200);
const page=await (await send("athlete-test",undefined,{actor:coach,coach:true})).json();assert.ok(!page.coach);assert.equal(page.plan.goals.length,1);assert.equal(page.plan.goals[0].id,goal.key);
assert.ok(!JSON.stringify(page).includes("PRIVATE_"));assert.equal((await send("athlete-test",command("assess",{}))).status,403);
assert.equal((await send("athlete-test",command("review",{goal:goal.key}),{rev:0})).status,409);
assert.equal((await send("athlete-test",command("review",{goal:goal.key}))).status,200);
console.log("PASS: deployable Edge bundle; verified identity, no client role escalation, draft/note filtering, optimistic revision and athlete review request.");
