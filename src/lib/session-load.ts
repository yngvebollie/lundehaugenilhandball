import {db,demo,today,type Snapshot} from "./beta";
import type {EventLoad,PlannedEvent} from "./load-summary";
export async function sessionLoad(data:Snapshot,from:string,until:string,write?:{event:PlannedEvent;minutes:number;weight:number;clear?:boolean}):Promise<EventLoad[]>{
 const v=write?{source:write.event.source,event:write.event.event,action:write.clear?"clear":"save",minutes:write.minutes,weight:write.weight}:null;
 if(!demo)return (await db!.rpc("beta_session_load",{t:data.me.squad,lo:from,hi:until,v}).throwOnError()).data;
 const key="event-load-v1:"+data.me.squad;let rows:EventLoad[]=JSON.parse(localStorage.getItem(key)||"[]");
 if(write){
  const e=write.event;
  if(data.me.role!=="athlete"||data.me.id!==e.athlete||e.day>today()||e.day<from||e.day>=until)throw Error("Kun egne gjennomførte aktivitetsdager");
  rows=rows.filter(x=>x.athlete!==e.athlete||x.source!==e.source||x.event!==e.event);
  if(!write.clear)rows.push({...e,minutes:write.minutes,weight:write.weight});
  localStorage.setItem(key,JSON.stringify(rows));
 }
 return rows.filter(x=>x.day>=from&&x.day<until&&(data.me.role==="coach"||x.athlete===data.me.id));
}
