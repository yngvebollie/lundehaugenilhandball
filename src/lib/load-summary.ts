import type {Snapshot} from "./beta";
import type {Doc} from "./court/client";
import {total,wallTime} from "./court/model";
import {onDate,plusDay,type Rule} from "./regular";

export const categories={gym:"Skolegym",other:"Annen aktivitet",team:"Lagtrening",game:"Kamper"} as const;
export type Category=keyof typeof categories;
export type EventLoad={athlete:string;source:"assignment"|"court";event:string;day:string;category:Exclude<Category,"gym">;minutes:number;weight:number};
export type PlannedEvent=Omit<EventLoad,"minutes">&{title:string;minutes:number|null};
export function eventsFor(data:Snapshot,docs:Doc[],from:string,until:string,athlete:string):PlannedEvent[]{
 const result:PlannedEvent[]=[];
 for(const a of data.plans){
  if(a.squad!==data.me.squad||a.day<from||a.day>=until||(athlete&&a.athlete!==athlete))continue;
  const category=a.kind==="Game"?"game":a.kind==="Practice"?"team":"other";
  result.push({athlete:a.athlete,source:"assignment",event:a.id,day:a.day,category,title:a.title,minutes:a.minutes??null,weight:category==="game"?5:category==="team"?4:3});
 }
 const players=data.me.role==="athlete"?[data.me]:data.roster.filter(a=>a.role==="athlete"&&a.squad===data.me.squad);
 for(const d of docs){
  if(!d.published||d.archived)continue;
  const p=d.sharedPlan||d.plan,day=wallTime(p.start).slice(0,10);
  if(!day||day<from||day>=until)continue;
  for(const a of players){
   if((athlete&&athlete!==a.id)||(d.audience&&!d.audience.includes(a.id)))continue;
   result.push({athlete:a.id,source:"court",event:d.id,day,category:p.purpose==="team"?"team":"other",title:p.title,minutes:Math.round(total(p)/60)||null,weight:p.purpose==="team"?4:3});
  }
 }
 return result;
}
const blank=()=>({planMin:0,planPoints:0,actualMin:0,actualPoints:0,confirmed:0,pending:0,future:0,noDuration:0});
export function loadSummary(rules:Rule[],events:PlannedEvent[],actual:EventLoad[],from:string,until:string,asOf:string,athlete:string){
 const rows={gym:blank(),other:blank(),team:blank(),game:blank()};
 const key=(e:EventLoad|PlannedEvent)=>[e.athlete,e.source,e.event,e.day].join(":");
 const logged=new Set<string>();
 for(const e of actual){
  if(e.day<from||e.day>=until||e.day>asOf||(athlete&&e.athlete!==athlete)||logged.has(key(e)))continue;
  logged.add(key(e));const r=rows[e.category];r.confirmed++;r.actualMin+=e.minutes;r.actualPoints+=e.minutes*e.weight;
 }
 for(const e of events){
  if(e.day<from||e.day>=until||(athlete&&e.athlete!==athlete))continue;
  const r=rows[e.category];if(e.minutes==null)r.noDuration++;else{r.planMin+=e.minutes;r.planPoints+=e.minutes*e.weight;}
  if(e.day>asOf)r.future++;else if(!logged.has(key(e)))r.pending++;
 }
 for(let day=from;day<until;day=plusDay(day,1))for(const rule of onDate(rules,day,athlete)){
  const r=rows[rule.kind==="gym"?"gym":"other"];r.planMin+=rule.minutes;r.planPoints+=rule.minutes*rule.weight;
  const c=rule.checks?.[day];
  if(day>asOf)r.future++;else if(!c)r.pending++;else{r.confirmed++;if(c.done){r.actualMin+=c.minutes;r.actualPoints+=c.minutes*c.weight;}}
 }
 const sum=blank();for(const r of Object.values(rows))for(const k of Object.keys(sum) as (keyof typeof sum)[])sum[k]+=r[k];
 return {rows,sum};
}
