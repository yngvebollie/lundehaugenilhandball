import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseReport} from "../src/lib/nhf-report.mjs";
const path=process.env.NHF_REPORT_FIXTURE||process.argv[2];
if(!path)throw Error("Pass the private reference PDF as a local path; do not check it into Git.");
const r=await parseReport(await readFile(path));
assert.equal(r.method,"text");assert.deepEqual(r.issues,[]);
assert.deepEqual(r.match,{nif_id:8433205,number:"54041308009",competition:"Jenter 13, Breddeserie 08",venue:"Haraldshallen",day:"2026-09-20",time:"12:00",home:"Rival 2",away:"Hundvåg 2",home_score:15,away_score:24,half_home:null,half_away:null});
const a=r.players.filter(p=>p.side==="A"),b=r.players.filter(p=>p.side==="B");
assert.equal(a.length,10);assert.equal(b.length,10);assert.equal(a.reduce((s,p)=>s+p.total,0),15);assert.equal(b.reduce((s,p)=>s+p.total,0),24);
assert.deepEqual(b.map(p=>[+p.shirt,p.goals,p.penalty,p.total,p.played,p.warning,p.suspensions]),[
 [2,3,0,3,true,0,0],[8,2,0,2,true,0,0],[10,0,0,0,false,0,0],[13,1,0,1,true,0,0],[17,2,0,2,true,0,0],
 [20,1,0,1,true,0,0],[23,4,0,4,true,0,2],[25,3,0,3,true,1,0],[26,5,0,5,true,0,0],[27,3,0,3,true,0,0]]);
assert.equal(a.find(p=>p.shirt==="11").warning,1);assert.equal(a.filter(p=>p.played).length,4);
assert.ok(!JSON.stringify(r).match(/\d{2}\.\d{2}\.\d{4}/));
console.log("PASS: private NHF fixture, 20 player rows, score 15-24, participation, goals and discipline columns.");
