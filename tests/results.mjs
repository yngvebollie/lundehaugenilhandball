import assert from "node:assert/strict";
import {matchResult} from "../src/lib/match-result.ts";
const g={completed:true,score:"20-21",home:"Hundvåg",away:"Sola",opponent:"Sola"};
assert.equal(matchResult(g).label,"Tap");
assert.equal(matchResult({...g,opponent:"Hundvåg"}).label,"Seier");
assert.equal(matchResult({...g,score:"20 – 20"}).label,"Uavgjort");
assert.equal(matchResult({...g,score:null}).kind,"neutral");
assert.equal(matchResult({...g,completed:false,status:"Planlagt"}).label,"Kommende");
console.log("PASS: home and away outcomes, draws, unavailable and upcoming scores.");
