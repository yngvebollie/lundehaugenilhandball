import assert from "node:assert/strict";
import {parsePaste,validateReport,importDraft,reportTeamMatches} from "../src/lib/report-text.ts";
const line=(shirt,played,goals,penalty,susp=0)=>[shirt," ","Test "+shirt,played?"X":"","01.01.2000","",susp?"X":"","","","","","",goals||"",penalty||"",goals+penalty||""].join("\t");
const raw=["KAMPRAPPORT","Turnering: Jenter 13, A-serie 04","Kamp Nr\t54041311009\tResPIN\t8432765\tTilskuere\t60",
" Hundvåghallen A\t01.11.2026 - 13:20","A\tHjemmelag"," Hundvåg","mot","B\tBortelag"," Sola","Sluttresultat\tA","20\tB","21","Halv tid\tA","B","Full tid\tA","20\tB","21",
"Lag A\tDeltatt: >",line(5,true,3,0),line(15,true,6,0,1),line(23,true,7,0),line(26,true,2,0),line(28,true,1,0),line(22,true,1,0),line(30,false,0,0),
"Leder A:\tStaff\t01.01.1980","Lag B\tDeltatt: >",line(4,true,4,0),line(10,true,5,1),line(14,true,3,1),line(21,true,2,0),line(22,true,4,0,1),line(30,true,1,0)].join("\n");
const r=parsePaste(raw);assert.deepEqual(validateReport(r,8432765),[]);assert.equal(r.players.find(x=>x.shirt==="15").suspensions,1);
assert.equal(r.players.find(x=>x.side==="B"&&x.shirt==="10").total,6);assert.equal(r.players.find(x=>x.shirt==="30").played,false);
assert.ok(!JSON.stringify(r).includes("01.01.2000"));assert.ok(validateReport(r,8433205).length);
const preview=importDraft(r);assert.equal(preview.players.find(x=>x.shirt==="30").played,true);assert.equal(r.players.find(x=>x.shirt==="30").played,false);
const explicit=parsePaste(raw.replace(line(30,false,0,0),line(30,false,0,0).replace("\t\t01.01.2000","\tNei\t01.01.2000")));
assert.equal(importDraft(explicit).players.find(x=>x.shirt==="30").played,false);
console.log("PASS: pasted NHF columns, score validation, identity mismatch, zero/unknown safeguards and DOB exclusion.");
assert.equal(reportTeamMatches(" KFUM ", "KFUM 1","Hundvåg"),true);
assert.equal(reportTeamMatches("KFUM 2","KFUM 1","Hundvåg"),false);
assert.equal(reportTeamMatches("KFUM","KFUM 1","KFUM 2"),false);
assert.equal(reportTeamMatches("Hundvåg","KFUM 1","Hundvåg"),false);

