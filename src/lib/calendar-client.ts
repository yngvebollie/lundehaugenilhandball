import {db,demo,today,type Assignment,type Snapshot} from "./beta";
import {calendarFields,regularFields,canEditCalendar,type CalendarFields} from "./calendar-plan";
import {plusDay,type Rule} from "./regular";
const read=<T>(k:string,f:T):T=>JSON.parse(localStorage.getItem(k)||"null")??f;
function log(data:Snapshot,p:string,subject:string,action:string,detail:string){const id=Date.now()+Math.random();localStorage.setItem("nhf-beta-v1:playerlog:"+data.me.squad+":"+p+":"+id,JSON.stringify({id,actor:data.me.id,at_time:new Date().toISOString(),action,detail,subject}));}
export async function editCalendar(data:Snapshot,rows:Assignment[],v:CalendarFields,remove=false){
 if(!demo){await db!.rpc("beta_calendar_change",{t:data.me.squad,action:remove?"remove":"save",items:rows.map(a=>({id:a.id,prior:calendarFields(a)})),v}).throwOnError();return;}
 const all=Object.keys(localStorage).filter(k=>k.startsWith("nhf-beta-v1:plan:")).map(k=>({k,rows:read<Assignment[]>(k,[])}));
 if(!rows.length||rows.length>200||new Set(rows.map(a=>a.id)).size!==rows.length)throw Error("Velg aktiviteter.");
 for(const a of rows){const current=all.flatMap(x=>x.rows).find(r=>r.id===a.id);if(!current||!canEditCalendar(data,current,today())||JSON.stringify(calendarFields(a))!==JSON.stringify(calendarFields(current)))throw Error("Planen er endret eller aktiviteten er beskyttet.");
  if(read<{event:string}[]>("event-load-v1:"+data.me.squad,[]).some(r=>r.event===a.id))throw Error("Registrert aktivitet er beskyttet.");}
 if(!remove&&(v.day<today()||!v.title.trim()||v.title.length>100||!v.exercises.length||v.exercises.length>40||v.exercises.some(x=>!x.trim()||x.length>250)||v.minutes!==null&&(!Number.isInteger(v.minutes)||v.minutes<5||v.minutes>600||v.minutes%5)))throw Error("Kontroller dato, navn, minutter og øvelser.");
 const ids=new Set(rows.map(a=>a.id));for(const x of all)localStorage.setItem(x.k,JSON.stringify(x.rows.flatMap(a=>!ids.has(a.id)?[a]:remove?[]:[{...a,...v}])));
 for(const a of rows)log(data,a.athlete,a.id,remove?"Aktivitet fjernet":"Kalender endret",JSON.stringify({before:calendarFields(a),after:remove?null:v}));
}
export async function editRegularCalendar(data:Snapshot,r:Rule,effective:string,v:ReturnType<typeof regularFields>,stop=false){
 if(!demo){await db!.rpc("beta_calendar_regular",{t:data.me.squad,k:r.id,effective,prior:regularFields(r),v,stop}).throwOnError();return;}
 const key="regular-plan-v1:"+data.me.squad,rows=read<Rule[]>(key,[]),current=rows.find(x=>x.id===r.id);
 if(data.me.role!=="coach"||r.team!==data.me.squad||!current||JSON.stringify(regularFields(current))!==JSON.stringify(regularFields(r)))throw Error("Planen er endret eller du mangler tilgang.");
 if(effective<today()||effective<r.starts||r.ends&&effective>r.ends||Object.keys(current.checks||{}).some(d=>d>=effective))throw Error("Velg en kommende dato uten registreringer.");
 if(!stop&&(!v.days.length||v.days.some(d=>d<1||d>7)||!Number.isInteger(v.minutes)||v.minutes<5||v.minutes>600||v.minutes%5||v.weight<1||v.weight>5||!v.title.trim()||v.ends&&v.ends<effective))throw Error("Kontroller den faste planen.");
 const next=rows.flatMap(a=>a.id!==r.id?[a]:a.starts<effective?[{...a,ends:plusDay(effective,-1)}]:[]);
 if(!stop)next.push({...r,...v,id:crypto.randomUUID(),starts:effective,checks:{}});
 localStorage.setItem(key,JSON.stringify(next));log(data,r.athlete,r.id,stop?"Fast aktivitet avsluttet":"Fast plan endret",JSON.stringify({effective,before:regularFields(r),after:stop?null:v}));
}
