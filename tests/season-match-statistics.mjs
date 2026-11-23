import assert from "node:assert/strict";
import path from "node:path";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const modules=new Map();
function load(file){
  if(modules.has(file))return modules.get(file);
  const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  modules.set(file,exports);
  new Function("exports","require",code)(exports,name=>load(path.resolve(path.dirname(file),name+".ts")));
  return exports;
}
const {seasonMatchStatistics}=load(fileURLToPath(new URL("../src/lib/season-match-statistics.ts",import.meta.url)));
const base={completed:true,home:"Eget lag",away:"Motstander",opponent:"Motstander"};
const game=(id,nif_id,score,attributes={})=>({...base,id,nif_id,score,...attributes});
const log=(first,second,origin="manual")=>({
  periodMinutes:20,finalized:true,eventOrigin:origin,
  events:[first,second].flatMap((sides,index)=>sides.map((side,i)=>({
    id:index+"-"+i,side,half:index+1,seconds:(i+1)*60,recordedAt:i,type:"goal",
  }))),
});
const games=[
  game("a",1,"4–3"),game("a-copy",1,"4–3"),
  game("b",2,"4–2",{opponent:"Eget lag"}),
  game("c",3,"5–1",{opponent:"Eget lag"}),
  game("d",4,"4–2"),
];
const logs={
  a:log(["home","home"],["away","away","away","home","home"]),
  "a-copy":log(["home"],["home","away","home","away","home","away"],"api"),
  b:log(["home","home"],["home","home","away","away"]),
  c:log(["home","home","home"],["home","home","away"]),
  d:log(["home"],["away"]), // Incomplete log disagrees with fulltime.
};
const result=seasonMatchStatistics(games,{d:{halfHome:1,halfAway:0}},logs);
assert.equal(result.total,4);
assert.equal(result.pauseCoverage,4);
assert.equal(result.streakCoverage,3);
assert.deepEqual(result.pause.W,{W:2,D:0,L:0});
assert.deepEqual(result.pause.L,{W:0,D:0,L:2});
assert.deepEqual(result.streaks["3"],{W:1,D:0,L:0});
assert.deepEqual(result.streaks["4"],{W:0,D:0,L:1});
assert.deepEqual(result.streaks["5+"],{W:0,D:0,L:1});
assert.equal(result.rows[0].recovery,60);
assert.equal(result.rows[0].game.id,"a");
assert.equal(result.timed,3);
assert.deepEqual(result.openings,{games:3,first:-3,second:-2});
assert.deepEqual([result.timeStats.seconds,result.timeStats.goals,result.timeStats.against],[7200,7,12]);
assert.equal(result.noResponse,0);
const withoutAnswer=seasonMatchStatistics([game("e",5,"1–3")],{},{
  e:log(["home"],["away","away","away"]),
});
assert.equal(withoutAnswer.noResponse,1);
assert.equal(withoutAnswer.recoveryKnown,0);
assert.equal(result.intervals.length,8);
assert.equal(result.intervals[0].games,3);
assert.equal(result.intervals.find(row=>row.half===2&&row.from===5).goals,0); // 05:00 belongs in the first bin.
assert.equal(seasonMatchStatistics([game("a",1,"4–3"),game("opposite",1,"4–3",{opponent:"Eget lag"})],{},logs).rows.length,0);
console.log("PASS: pause and fulltime coverage, five-minute bins, 3/4/5+ runs, recovery, deduplication and manual precedence.");
