import assert from "node:assert/strict";
import {selectFixtures} from "../supabase/functions/nhf-public-schedule/fixtures.mjs";
const r={org_id:226597,season:201068,leagues:[447815]};
const match={matchId:1,seasonId:r.season,tournamentId:r.leagues[0],tournamentName:"Jenter 13, Breddeserie 08",
 homeTeamId:5,awayTeamId:r.org_id,homeTeamName:"Test home",awayTeamName:"Test away",publicResult:true,
 matchDate:"2026-11-07T00:00:00",matchStartTime:910,goalsHome:0,goalsAway:15,isPast:true,referees:["never export"]};
const list=selectFixtures({matches:[match,match,{...match,matchId:2,goalsHome:null,isPast:false},
 {...match,matchId:3,publicResult:false},{...match,matchId:4,cancelled:true},{...match,seasonId:1},{...match,tournamentId:1},{...match,awayTeamId:2}]},r);
assert.equal(list.length,4);assert.equal(list[0].score,"0-15");assert.equal(list[0].time,"09:10");assert.equal(list[0].opponent,"Test home");assert.equal(list[0].age,"J13");
assert.equal(list[1].score,null);assert.equal(list[2].score,null);assert.equal(list[3].status,"Avlyst");assert.ok(!JSON.stringify(list).includes("never export"));assert.throws(()=>selectFixtures({},r));
console.log("PASS: official public schedule format, team/league/season isolation, score privacy and no personnel data.");
