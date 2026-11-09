import assert from "node:assert/strict";
import {registerHooks} from "node:module";
registerHooks({resolve(s,c,next){if(c.parentURL?.endsWith("load-summary.ts")&&["./regular","./court/model"].includes(s)||s==="../development/model"&&c.parentURL?.endsWith("court/model.ts"))return next(s+".ts",c);return next(s,c);}});
const {eventsFor,loadSummary}=await import("../src/lib/load-summary.ts");
const data={me:{squad:"t",role:"coach"},roster:["a","b"].map(id=>({id,squad:"t",role:"athlete"})),plans:[
 {id:"g",day:"2026-11-03",squad:"t",athlete:"a",kind:"Game",minutes:50},
 {id:"w",day:"2026-11-04",squad:"t",athlete:"a",kind:"Session",minutes:null},
 {id:"p",day:"2026-11-06",squad:"t",athlete:"b",kind:"Practice",minutes:60}]};
const doc={id:"d",published:true,archived:false,audience:["a"],plan:{title:"Økt",purpose:"team",start:"2026-11-03T23:30:00Z",items:[{work:1740,setup:60}]}};
const from="2026-11-02",until="2026-11-09",events=eventsFor(data,[doc],from,until,"");
assert.equal(events.find(e=>e.source==="court").day,"2026-11-04");
assert.equal(events.filter(e=>e.source==="court").length,1);
const rule={kind:"gym",athlete:"a",days:[2],starts:from,minutes:45,weight:3,checks:{"2026-11-03":{done:true,minutes:30,weight:2}}};
const actual=[{...events[0],minutes:25,weight:4}];
const s=loadSummary([rule],events,actual,from,until,"2026-11-04","a");
assert.equal(s.rows.game.actualPoints,100);assert.equal(s.rows.team.pending,1);assert.equal(s.rows.other.noDuration,1);assert.equal(s.sum.actualPoints,160);assert.equal(s.sum.planPoints,505);
assert.equal(loadSummary([rule],events,actual,from,until,"2026-11-04","b").sum.future,1);
assert.equal(loadSummary([rule],events,actual,from,until,"2026-11-04","b").sum.confirmed,0);
console.log("PASS: categories, scope, selected audience, unavailable minutes, pending and Oslo dates.");
