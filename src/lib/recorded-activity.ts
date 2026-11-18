import type {Snapshot} from "./beta";
import type {Doc} from "./court/client";
import {total,wallTime} from "./court/model";
import type {EventLoad,Category} from "./load-summary";
import type {Rule} from "./regular";

export type RecordedActivity={id:string;event:string;source:"assignment"|"court"|"regular";athlete:string;day:string;title:string;category:Category;planned:number|null;minutes:number;weight:number;done:boolean;href?:string};
export function recordedActivities(data:Snapshot,docs:Doc[],rules:Rule[],logs:EventLoad[],from:string,until:string,asOf:string,person?:string){
 const allowed=new Set(data.roster.filter(p=>p.squad===data.me.squad&&p.role==="athlete"&&(!person||p.id===person)&&(data.me.role==="coach"||p.id===data.me.id)).map(p=>p.id));
 if(data.me.role==="athlete"&&(!person||person===data.me.id))allowed.add(data.me.id);
 const valid=(athlete:string,day:string)=>allowed.has(athlete)&&day>=from&&day<until&&day<=asOf;
 const rows=new Map<string,RecordedActivity>();
 for(const e of logs){
  if(!valid(e.athlete,e.day))continue;
  const key=[e.athlete,e.source,e.event,e.day].join(":"),a=e.source==="assignment"?data.plans.find(p=>p.id===e.event&&p.squad===data.me.squad&&p.athlete===e.athlete&&p.day===e.day):undefined;
  const d=e.source==="court"?docs.find(d=>d.id===e.event&&d.published&&!d.archived&&(!d.audience||d.audience.includes(e.athlete))):undefined;
  const shared=d&&(data.me.role==="coach"?d.sharedPlan:d.plan),p=shared&&wallTime(shared.start).slice(0,10)===e.day?shared:undefined;
  const quick=a?.personal&&(!!a.logged_sets?.length||a.exercises[0]==="Gjennomført trening");
  rows.set(key,{id:key,event:e.event,source:e.source,athlete:e.athlete,day:e.day,title:a?.title||p?.title||(e.category==="team"?"Tidligere lagtrening":e.category==="game"?"Tidligere kamp":"Tidligere aktivitet"),category:e.category,planned:a?(quick?null:a.minutes??null):p?Math.round(total(p)/60):null,minutes:e.minutes,weight:e.weight,done:e.minutes>0,...(p?{href:"/okter?session="+e.event}:a?{href:data.me.role==="coach"?"/spillere?athlete="+e.athlete+"&uke="+e.day+"#plan":"/athlete?dag="+e.day+"&vis=plan"}:{})});
 }
 for(const r of rules){if(r.team!==data.me.squad)continue;for(const [day,c] of Object.entries(r.checks||{})){
  if(!valid(r.athlete,day))continue;const key=[r.athlete,"regular",r.id,day].join(":");
  rows.set(key,{id:key,event:r.id,source:"regular",athlete:r.athlete,day,title:r.title,category:r.kind,planned:r.minutes,minutes:c.done?c.minutes:0,weight:c.done?c.weight:0,done:c.done,href:data.me.role==="coach"?"/?athlete="+r.athlete+"&dag="+day+"#weekly":"/athlete?dag="+day+"&vis=plan"});
 }}
 return [...rows.values()].sort((a,b)=>b.day.localeCompare(a.day)||a.id.localeCompare(b.id));
}
