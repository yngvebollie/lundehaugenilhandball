import {db,demo} from "./beta";
export const kinds={goal:"Mål",save:"Redning",wide:"Utenfor",block:"Blokkert",turnover:"Balltap",steal:"Ballvinning",warning:"Gult kort",two:"2 minutter",red:"Rødt kort"};
export type Kind=keyof typeof kinds;
export type Side="own"|"opp";
export const phases=["Etablert","Kontring","Retur","Overtall","Undertall","7 m"], origins=["Ukjent","Venstre kant","6 m","9 m","Høyre kant","7 m","Gjennombrudd"];
export type Entry={kind:Kind;side:Side;player:string;keeper:string;assist:string|null;phase:string;origin:string;x:number|null;y:number|null};
export type Logged=Entry&{ms:number;seq:number;period:number};
export type Session={version:number;status:"idle"|"running"|"paused"|"finished";elapsed:number;started:number|null;now:number;period:number;events:Logged[]};
export type Command="read"|"start"|"pause"|"resume"|"period"|"finish"|"undo"|"event";
export const emptySession=():Session=>({version:0,status:"idle",elapsed:0,started:null,now:Date.now(),period:1,events:[]});
export const elapsed=(s:Session,now:number)=>s.elapsed+(s.status==="running"&&s.started!=null?Math.max(0,now-s.started):0);
export const clock=(ms:number)=>[Math.floor(ms/60000),Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,"0")).join(":");
export const pct=(hits:number,attempts:number)=>attempts?Math.round(100*hits/attempts)+" %":"–";
export function totals(rows:Logged[]){
 const count=(k:Kind)=>rows.filter(e=>e.kind===k).length,goal=count("goal"),save=count("save"),attempts=goal+save+count("wide")+count("block");
 return {goal,save,attempts,on:goal+save,eff:pct(goal,attempts),rate:pct(save,goal+save),lost:count("turnover"),steals:count("steal"),two:count("two")};
}
export async function liveMatch(mid:string,cmd:Command="read",rev=0,v?:Entry):Promise<Session>{
 if(!demo)return (await db!.rpc("beta_live_match",{mid,cmd,rev,v:v||{}}).throwOnError()).data;
 const key="nhf-live-match:"+mid,s:Session=JSON.parse(localStorage.getItem(key)||"null")||emptySession(),now=Date.now();
 if(cmd==="read")return {...s,now};
 if(s.version!==rev)throw Error("Kampen er endret. Prøv igjen.");
 const ms=elapsed(s,now);
 if(cmd==="start"&&s.status==="idle"||cmd==="resume"&&s.status==="paused")s.status="running";
 else if(cmd==="period"&&s.status==="paused"&&s.period<6){s.period++;s.status="running";}
 else if(cmd==="pause"&&s.status==="running")s.status="paused";
 else if(cmd==="finish"&&["running","paused"].includes(s.status))s.status="finished";
 else if(cmd==="undo"&&s.events.length&&["paused","running"].includes(s.status))s.events.pop();
 else if(cmd==="event"&&s.status==="running"&&v)s.events.push({...v,ms,seq:rev+1,period:s.period});
 else throw Error("Ugyldig handling");
 Object.assign(s,{version:rev+1,elapsed:ms,now,started:s.status==="running"?now:null});localStorage.setItem(key,JSON.stringify(s));return s;
}
