import assert from "node:assert/strict";
import {coachFollowups} from "../src/lib/coach-overview.ts";
const data={me:{squad:"t"},roster:[{id:"a",role:"athlete",squad:"t"},{id:"b",role:"athlete",squad:"elsewhere"}],plans:[
 {id:"hard",athlete:"a",squad:"t",day:"2026-11-16"},{id:"other",athlete:"b",squad:"elsewhere",day:"2026-11-16"},
 {id:"old",athlete:"a",squad:"t",day:"2026-10-01"}],feedback:["hard","other","old"].map(assignment=>({assignment,effort:"Hard"}))};
const doc=(id,props={})=>({id,edited:"2026-11-16",plan:{origin:"manual"},...props});
const docs=[doc("draft"),doc("published",{published:true}),doc("archive",{archived:true}),doc("template",{plan:{origin:"template"}})];
const match=(id,props={})=>({id,team:"t",day:"2026-11-15",completed:true,...props});
const games=[match("missing"),match("saved"),match("unknown"),match("future",{day:"2026-11-20"}),match("foreign",{team:"elsewhere"}),match("cancelled",{status:"Avlyst"})];
const reports=Object.fromEntries(games.filter(g=>g.id!=="unknown").map(g=>[g.id,{revision:g.id==="saved"?1:null,rows:0}]));
const result=coachFollowups(data,docs,games,reports,"2026-11-17","2026-11-11");
assert.deepEqual(result.drafts.map(d=>d.id),["draft"]);
assert.deepEqual(result.missing.map(g=>g.id),["missing"]);
assert.deepEqual(result.effortPlayers.map(p=>p.id),["a"]);
assert.equal(result.players,1);
assert.equal(coachFollowups({...data,feedback:[]},[],games,{},"2026-11-17","2026-11-11").missing.length,0);
const actual=[{athlete:"a",source:"court",event:"court",day:"2026-11-16",minutes:75,weight:4},{athlete:"b",source:"court",event:"other",day:"2026-11-16",minutes:90,weight:5}];
assert.deepEqual(coachFollowups({...data,feedback:[]},[],[],{},"2026-11-17","2026-11-11",actual).effortPlayers.map(p=>p.id),["a"]);
assert.equal(coachFollowups({...data,feedback:[]},[],[],{},"2026-11-17","2026-11-11",actual.map(e=>({...e,minutes:0,weight:0}))).effortPlayers.length,0);
assert.equal(coachFollowups(data,[],[],{},"2026-11-17","2026-11-11",[{athlete:"a",source:"assignment",event:"hard",day:"2026-11-16",minutes:60,weight:2}]).effortPlayers.length,0);
assert.equal(coachFollowups({...data,feedback:[]},[],[],{},"2026-11-17","2026-11-11",actual.map(e=>({...e,day:"2026-10-01"}))).effortPlayers.length,0);
console.log("PASS: follow-up scope, date bounds, missing vs unknown reports, draft/template/archive separation");
