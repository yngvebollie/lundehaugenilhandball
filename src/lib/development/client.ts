import {db,demo,demoDevelopmentExercises,type Snapshot} from "../beta";
import {catalog} from "./catalog";
import {change,type Command} from "./commands";
import {empty,published,keeper,type Plan} from "./model";
import type {Packet} from "./types";
export async function development(data:Snapshot,person:string,rev=0,cmd?:Command):Promise<Packet>{
 const team=data.me.squad,preview=team==="development-preview";
 if(!demo&&!preview){const token=(await db!.auth.getSession()).data.session?.access_token;
  if(!token)throw Error("Logg inn på nytt.");const res=await fetch("/api/development",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},cache:"no-store",body:JSON.stringify({team,person,rev,cmd})}).catch(()=>{throw Error("Ingen forbindelse. Endringen er ikke bekreftet lagret. Prøv samme handling igjen.");});const body=await res.json();
  if(!res.ok)throw Object.assign(Error(body.error||"Ikke lagret."),{status:res.status});return body;}
 const coach=data.me.role==="coach";
 if(!coach&&person!==data.me.id||!data.roster.some(p=>p.id===person&&p.role==="athlete"&&p.squad===team))throw Error("Ingen tilgang.");
 const storage=preview?sessionStorage:localStorage,key="nhf-development-demo-v2:"+team+":"+person,source=storage.getItem(key);
 const {examplePlan}=await import("./demo");
 const record:{rev:number;plan:Plan;notes:Packet["notes"]}=source?JSON.parse(source):{rev:0,plan:person==="liv"?examplePlan():empty(),notes:[]};
 const allowed=new Set(published(record.plan,false).goals.flatMap(g=>g.assignments.map(x=>x.exercise)));
 const exercises=catalog((coach?data.library:demoDevelopmentExercises(team,allowed)).map(e=>({id:e.id,title:e.name,instructions:e.dose}))),sessions=data.plans.filter(p=>p.athlete===person&&p.squad===team).map(p=>({id:p.id,title:p.title,day:p.day}));
 if(cmd){if(!record.plan.receipts[cmd.key]&&rev!==record.rev)throw Error("Planen er endret. Hent siste versjon.");
 const changed=change(record.plan,cmd,{id:data.me.id,coach,now:new Date().toISOString(),limit:3,keeper:true,catalog:exercises,sessions:sessions.map(p=>p.id)});
 if(!record.plan.receipts[cmd.key]){record.rev++;record.plan=changed;if(cmd.action==="note")record.notes.unshift({at:new Date().toISOString(),text:String(cmd.v.text)});storage.setItem(key,JSON.stringify(record));}}
 const plan=published(record.plan,coach),used=new Set(plan.goals.flatMap(g=>g.assignments.map(x=>x.exercise)));
 return {rev:record.rev,plan,limit:3,coach,keeper:true,keeperAxes:Object.keys(keeper),catalog:exercises.filter(e=>coach||used.has(e.id)),sessions:coach?sessions:[],notes:coach?record.notes:[]};
}
