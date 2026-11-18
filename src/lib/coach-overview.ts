import type {EventLoad} from "./load-summary";
import type {Snapshot} from "./beta";
import type {Doc} from "./court/client";
import type {Fixture,ReportStatus} from "./match-journal";

export function coachFollowups(data:Snapshot,docs:Doc[],games:Fixture[],reports:Record<string,ReportStatus>,day:string,from:string,actual:EventLoad[]=[]){
 const players=data.roster.filter(p=>p.role==="athlete"&&p.squad===data.me.squad);
 const ids=new Set(players.map(p=>p.id));
 const hard=new Set(data.feedback.filter(f=>f.effort==="Hard").map(f=>f.assignment));
 const recent=actual.filter(e=>ids.has(e.athlete)&&e.day>=from&&e.day<=day);
 const effortPlayers=players.filter(p=>recent.some(e=>e.athlete===p.id&&e.minutes>0&&e.weight>=4)||data.plans.some(a=>a.squad===data.me.squad&&a.athlete===p.id&&a.day>=from&&a.day<=day&&hard.has(a.id)&&!recent.some(e=>e.source==="assignment"&&e.event===a.id&&e.athlete===p.id)));
 const drafts=docs.filter(d=>!d.archived&&!d.published&&d.plan.origin!=="template").sort((a,b)=>b.edited.localeCompare(a.edited));
 const missing=games.filter(g=>g.team===data.me.squad&&g.completed&&g.day<=day&&!/avlyst|utsatt|cancel/i.test(g.status||"")&&reports[g.id]?.revision===null)
  .sort((a,b)=>b.day.localeCompare(a.day));
 return {players:players.length,drafts,missing,effortPlayers,planned:data.plans.some(a=>a.squad===data.me.squad&&ids.has(a.athlete)&&!a.personal)};
}
