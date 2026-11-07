import {db,demo,type Snapshot} from "./beta";
export type FeedEvent={id:string;athlete:string;name:string;kind:string;title:string;detail:string;day:string;at_time:string|null};
export type ProfileInfo={verified:boolean;candidates:{reg:string;team:string;name:string;shirt:string;safe:boolean;linked:boolean}[];games:{id:string;day:string;home:string;away:string;score:string;goals:number|null;played:boolean;shirt:string;squad:string}[]};
export async function activity(data:Snapshot,person?:string,limit=40):Promise<FeedEvent[]>{
  if(data.me.role!=="coach")throw Error("Trenertilgang kreves");
  if(!demo)return (await db!.rpc("beta_coach_activity",{t:data.me.squad,person:person||null,n:limit}).throwOnError()).data;
  return data.plans.filter(p=>!person||p.athlete===person).flatMap(p=>data.checks.filter(c=>c.assignment===p.id).map(c=>({id:p.id+":"+c.step,athlete:p.athlete,name:data.roster.find(a=>a.id===p.athlete)?.name||"Utøver",day:p.day,kind:"exercise",title:p.exercises[c.step],detail:p.title,at_time:null}))).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,limit);
}
export async function profileInfo(data:Snapshot,id:string,action="read"):Promise<ProfileInfo>{
 if(data.me.role!=="coach"||!data.roster.some(p=>p.id===id&&p.role==="athlete"))throw Error("Utøver ikke på laget");
 if(!demo)return (await db!.rpc("beta_athlete_profile",{t:data.me.squad,person:id,action}).throwOnError()).data;
 const key="demo-verified-jersey:"+data.me.squad+":"+id;if(action==="verify")localStorage.setItem(key,"1");
 return {verified:localStorage.getItem(key)==="1",candidates:[],games:[]};
}
