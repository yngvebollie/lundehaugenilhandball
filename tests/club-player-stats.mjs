import assert from "node:assert/strict";
import {groupPlayers,uniqueGames} from "../src/lib/club-player-stats.ts";
import {metrics} from "../src/lib/stat-metrics.ts";
const sample=(reg,fixtureKey,player,name,goals)=>({reg,fixtureKey,level:reg,match_id:reg+fixtureKey,player,name,goals,day:"2026-11-01",shirt:"28",home:true,played:true,
field_goals:goals,penalty:null,warnings:null,suspensions:null,disqualifications:null,errors:null,saves:null,missed:null,awards:null,rating:null});
const roster=[{id:"A",name:"Example Player",role:"athlete",shirt_number:"28"},{id:"B",name:"No Games",role:"athlete"}];
const rows=[sample("J13A","1","p1","Example Player",4),sample("J14A","2","p2","Example Player",6),sample("J13B","1","p3","Example Player",4)];
const grouped=groupPlayers(rows,roster,[]);assert.equal(grouped.length,2);
const g=uniqueGames(grouped.find(x=>x.key==="A").rows);assert.equal(g.conflicts,0);assert.equal(metrics(g.rows).games,2);assert.equal(metrics(g.rows).goals,10);assert.equal(metrics(g.rows).average,5);
assert.equal(metrics(grouped.find(x=>x.key==="B").rows).goals,null);
const diff=uniqueGames([...rows,sample("J14A","1","p2","Example Player",9)]);assert.equal(diff.conflicts,1);assert.equal(metrics(diff.rows).goals,6);
assert.equal(groupPlayers([sample("J13A","1","p1","Same Name",1),sample("J13A","1","p2","Same Name",2),sample("J14A","2","p3","Same Name",3)],[],[]).length,3);
assert.equal(groupPlayers([sample("J13A","1","a","Other Lastname",2)],roster,[{reg:"J13A",player:"a",athlete:"A"}]).find(x=>x.key==="A").rows.length,1);
console.log("PASS: registered players, separate levels, cross-level deduplication, missing/conflicting goals, aliases and namesakes.");
