import {db,demo,today,type Snapshot} from "./beta";
import {onDate,plusDay,type CheckInput,type Rule} from "./regular";
export type RatingRow={athlete:string;exercise:string;label:string|null;origin:string;activity:string|null;item?:string|null;stars:number;updated:string};
const demoKey=(team:string)=>"regular-plan-v1:"+team;
export async function regular(data:Snapshot,action="read",v:Partial<Rule>={}):Promise<Rule[]>{
 if(!demo)return (await db!.rpc("beta_regular",{t:data.me.squad,action,v}).throwOnError()).data;
 let rows:Rule[]=JSON.parse(localStorage.getItem(demoKey(data.me.squad))||"[]");
 if(action!=="read"&&data.me.role!=="athlete")throw Error("Kun egne aktiviteter");
 if(action==="add"){
  const r={...v,id:crypto.randomUUID(),team:data.me.squad,athlete:data.me.id} as Rule;
  const min=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
  if(!r.days.length||!r.starts||r.ends&&r.ends<r.starts||min(r.clock)+r.minutes>=1440)throw Error("Kontroller dager, periode og klokkeslett.");
  if(r.kind==="gym"&&rows.some(x=>x.profile_gym&&x.athlete===r.athlete&&x.days.some(d=>r.days.includes(d))&&(!x.ends||r.starts<=x.ends)&&(!r.ends||x.starts<=r.ends)))throw Error("Skolegym er allerede planlagt på en av disse dagene");
  if(rows.some(x=>x.athlete===r.athlete&&x.days.some(d=>r.days.includes(d))&&(!x.ends||r.starts<=x.ends)&&(!r.ends||x.starts<=r.ends)&&min(r.clock)<min(x.clock)+x.minutes&&min(x.clock)<min(r.clock)+r.minutes))throw Error("Aktiviteten overlapper en annen fast aktivitet");
  rows.push(r);
 }else if(action==="stop"){rows=rows.flatMap(r=>r.id!==v.id||r.athlete!==data.me.id?[r]:r.checks?.[today()]?[{...r,ends:today()}]:r.starts>=today()?[]:[{...r,ends:r.ends&&r.ends<today()?r.ends:plusDay(today(),-1)}]);}
 if(action!=="read")localStorage.setItem(demoKey(data.me.squad),JSON.stringify(rows));
 return rows.filter(r=>data.me.role==="coach"||r.athlete===data.me.id);
}
export async function checkRegular(data:Snapshot,input:CheckInput):Promise<Rule[]>{
 if(!demo)return (await db!.rpc("beta_regular",{t:data.me.squad,action:"check",v:input}).throwOnError()).data;
 const key=demoKey(data.me.squad);
 const rows:Rule[]=JSON.parse(localStorage.getItem(key)||"[]");
 const rule=onDate(rows,input.day,data.me.id).find(r=>r.id===input.id);
 if(!rule||data.me.role!=="athlete"||input.day>today())throw Error("Du kan bare registrere egne aktiviteter til og med i dag.");
 const checks=rule.checks??={};
 if(input.state==="clear")delete checks[input.day];
 else if(input.state==="skipped")checks[input.day]={done:false,minutes:0,weight:0};
 else{
  const minutes=input.minutes??rule.minutes,weight=input.weight??rule.weight;
  if(!Number.isInteger(minutes)||minutes<1||minutes>600||!Number.isInteger(weight)||weight<1||weight>5)throw Error("Kontroller minutter og intensitet.");
  checks[input.day]={done:true,minutes,weight};
 }
 localStorage.setItem(key,JSON.stringify(rows));
 return rows.filter(r=>r.athlete===data.me.id);
}
export const demoRatingKey=(team:string,athlete:string,id:string)=>JSON.stringify(["coach-shared-rating",team,athlete,id]);
export async function teamRatings(data:Snapshot):Promise<RatingRow[]>{
 if(data.me.role!=="coach")throw Error("Trenertilgang kreves");
 if(!demo)return (await db!.rpc("beta_team_ratings",{t:data.me.squad}).throwOnError()).data;
 return Object.keys(localStorage).filter(k=>k.startsWith(JSON.stringify(["coach-shared-rating",data.me.squad]).slice(0,-1)+",")).map(k=>JSON.parse(localStorage.getItem(k)!)).sort((a,b)=>b.updated.localeCompare(a.updated));
}
