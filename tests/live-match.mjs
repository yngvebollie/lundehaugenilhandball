import assert from "node:assert/strict";
import {parseSpondRoster} from "../src/lib/spond-roster.ts";
import {
  appendMatchEvent, clockSeconds, initialClock, liveScore, matchProtocol, matchTimeline, parseMatchTime, shirtNumber,
} from "../src/lib/live-match.ts";

assert.deepEqual(parseSpondRoster(`Svarte deltar (3)
- [image](https://spond.com/static/img/icon_recipient_type_sponder.svg)
  **Signe Østby**
- **Ola Nordmann**
- **Inès Marie Adam"**
- **signe  østby**
Svarte deltar ikke (1)
- **Spiller Utenfor**`),["Signe Østby","Ola Nordmann","Inès Marie Adam"]);

const match = {
  home: {key: "home", name: "Lundehaugen"},
  away: {key: "away", name: "Sola"},
  date: "2026-11-22",
  players: [{id: "a", number: 7, name: "Maja"}, {id: "b", number: 9, name: "Nora"}],
  clock: initialClock,
  events: [],
  finalized: false,
};
const event = (type, side, number, seconds, fields = {}) => ({
  id: String(seconds), half: 1, recordedAt: seconds * 1000, type, side, number, seconds, ...fields,
});
const events = [
  event("goal", "home", 7, 9, {playerId: "a"}),
  event("penalty", "away", 14, 14, {outcome: "miss"}),
  event("penalty", "away", 0, 25, {outcome: "goal"}),
  event("warning", "home", 9, 30, {playerId: "b"}),
  event("suspension", "away", 0, 34),
  event("timeout", "home", undefined, 35),
  event("goal", "home", 7, 4, {half: 2, playerId: "a"}),
];
const played = events.reduce(appendMatchEvent, match);
assert.equal(liveScore(played.events), "2–1");
assert.deepEqual(matchTimeline(played.events).map(({home, away}) => [home, away]), [
  [1, 0], [1, 0], [1, 1], [1, 1], [1, 1], [1, 1], [2, 1],
]);
assert.deepEqual(matchProtocol(played, "away")[0], {
  id: "0", name: "", number: 0, goals: 0, penalties: 1, total: 1, warnings: 0, suspensions: 1,
});
assert.equal(matchProtocol(played, "home")[1].warnings, 1);
const friendly = {...played, title:"Treningskamp", awayPlayers:[{id:"away-7",number:7,name:"Kopervik-spiller"}]};
friendly.events=[...friendly.events,event("goal","away",7,40,{playerId:"away-7"}),event("goal","away",undefined,41)];
assert.equal(matchProtocol(friendly,"away").find(row=>row.number===7)?.name,"Kopervik-spiller");
assert.equal(matchProtocol(friendly,"away").find(row=>row.number===undefined)?.total,1);
assert.equal(matchProtocol(friendly,"away").reduce((sum,row)=>sum+row.total,0),3);

const corrected = {...played, events: played.events.map(row => row.id === "25" ? {...row, number: 14, seconds: 7} : row)};
assert.equal(matchProtocol(corrected, "away")[1].penalties, 1);
assert.equal(matchTimeline(corrected.events)[0].away, 1);
assert.equal(clockSeconds({...initialClock, seconds: 20, since: 1000}, 4550), 23);
assert.equal(clockSeconds({...initialClock, seconds: 20}, 4550), 20);
assert.equal(shirtNumber("07"), 7);
assert.equal(shirtNumber("100"), null);
assert.equal(parseMatchTime("05:59"), 359);
assert.equal(parseMatchTime("05:60"), null);
console.log("PASS: clock, timeline, corrections and both teams' protocols.");
