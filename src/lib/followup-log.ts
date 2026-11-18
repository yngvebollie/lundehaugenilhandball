import {db,demo,type Snapshot,type PlayerLog} from "./beta";
import {latestFollowups,type Suggestion} from "./coach-suggestions";
export {followedUp,latestFollowups} from "./coach-suggestions";

export type FollowupLog=PlayerLog&{athlete:string;followup:{key:string;signals:string[];title:string;note:string;kind:Suggestion["kind"];state?:"completed"|"reopened";cycle?:string;reopens?:string;evidence?:string}};
function requireCoach(data:Snapshot,person?:string){
 if(data.me.role!=="coach"||person&&!data.roster.some(p=>p.id===person&&p.squad===data.me.squad&&p.role==="athlete"))throw Error("Trenertilgang på spillerens lag kreves.");
}
export async function followupLog(data:Snapshot,person?:string):Promise<FollowupLog[]>{
 requireCoach(data,person);
 if(demo){const prefix="nhf-beta-v1:playerlog:"+data.me.squad+":";return Object.keys(localStorage).filter(k=>k.startsWith(prefix)).map(k=>JSON.parse(localStorage.getItem(k)!)).filter(r=>r.followup&&(!person||r.athlete===person)).sort((a,b)=>b.at_time.localeCompare(a.at_time));}
 const rows:FollowupLog[]=[];for(;;){let q=db!.from("beta_player_log").select("id,athlete,actor,at_time,action,detail,followup").eq("team",data.me.squad).not("followup","is",null).order("id",{ascending:false}).range(rows.length,rows.length+499);if(person)q=q.eq("athlete",person);
  const {data:batch}=await q.throwOnError();rows.push(...batch as FollowupLog[]);if(batch.length<500)return rows;
 }
}
export async function completeFollowup(data:Snapshot,s:Suggestion,note:string):Promise<FollowupLog>{
 requireCoach(data,s.athlete);note=note.trim();if(!note||note.length>1000)throw Error("Skriv et kort notat på 1–1000 tegn.");
 const v={key:s.id,signals:[...new Set(s.signals)].sort(),title:s.title,kind:s.kind,note,evidence:s.evidence,cycle:s.cycle};
 if(!demo)return (await db!.rpc("beta_complete_followup",{t:data.me.squad,p:s.athlete,v}).throwOnError()).data;
 const logs=await followupLog(data,s.athlete),last=latestFollowups(logs).find(r=>r.followup.key===s.id),cycle=last?.followup.state==="reopened"?String(last.id):last?.followup.cycle;
 if((cycle||"")!==(s.cycle||""))throw Error("Oppfølgingsstatus er endret. Oppdater oversikten.");
 const key="nhf-beta-v1:playerlog:"+data.me.squad+":"+s.athlete+":followup:"+JSON.stringify(cycle?[s.id,v.signals,cycle]:[s.id,v.signals]),prior=localStorage.getItem(key);
 if(prior)return JSON.parse(prior);
 const row:FollowupLog={id:crypto.randomUUID(),athlete:s.athlete,actor:data.me.id,at_time:nextLogTime(logs),action:"Oppfølging gjennomført",detail:s.title+"\nGrunnlag: "+s.evidence+"\nNotat: "+note,followup:{key:s.id,signals:v.signals,title:s.title,kind:s.kind,note,state:"completed",cycle,evidence:s.evidence}};
 localStorage.setItem(key,JSON.stringify(row));return row;
}
function nextLogTime(logs:FollowupLog[]){return new Date(Math.max(Date.now(),...logs.map(r=>Date.parse(r.at_time)+1))).toISOString();}
export async function reopenFollowup(data:Snapshot,row:FollowupLog):Promise<FollowupLog>{
 requireCoach(data,row.athlete);
 if(!demo)return (await db!.rpc("beta_reopen_followup",{t:data.me.squad,p:row.athlete,k:row.id}).throwOnError()).data;
 const logs=await followupLog(data,row.athlete),target=logs.find(r=>r.id===row.id&&r.followup.state!=="reopened"),latest=latestFollowups(logs).find(r=>r.followup.key===target?.followup.key);
 if(!target||!latest)throw Error("Oppfølgingen finnes ikke.");
 if(latest.followup.state==="reopened"&&latest.followup.reopens===String(target.id))return latest;
 if(latest.id!==target.id)throw Error("Oppfølgingsstatus er endret. Oppdater oversikten.");
 const event:FollowupLog={id:crypto.randomUUID(),athlete:target.athlete,actor:data.me.id,at_time:nextLogTime(logs),action:"Oppfølging gjenåpnet",detail:target.followup.title+"\nGjenåpnet oppfølging #"+target.id+". Det opprinnelige notatet er beholdt i trenerloggen.",followup:{...target.followup,state:"reopened",cycle:undefined,reopens:String(target.id),note:""}};
 localStorage.setItem("nhf-beta-v1:playerlog:"+data.me.squad+":"+target.athlete+":reopen:"+target.id,JSON.stringify(event));return event;
}
export function reopenSuggestions(suggestions:Suggestion[],logs:FollowupLog[]):Suggestion[]{
 const latest=latestFollowups(logs),rows=suggestions.map(s=>{const last=latest.find(r=>r.athlete===s.athlete&&r.followup.key===s.id);return {...s,cycle:last?.followup.state==="reopened"?String(last.id):last?.followup.cycle};});
 for(const r of latest){if(r.followup.state!=="reopened"||rows.some(s=>s.athlete===r.athlete&&s.id===r.followup.key))continue;
 rows.push({id:r.followup.key,athlete:r.athlete,kind:r.followup.kind,signals:r.followup.signals,cycle:String(r.id),priority:0,day:r.at_time.slice(0,10),title:r.followup.title,evidence:r.followup.evidence||"Gjenåpnet oppfølging. Se opprinnelig grunnlag og notat i trenerloggen.",href:"/spillere?athlete="+encodeURIComponent(r.athlete)+"#logg",action:"Se trenerlogg"});
 }return rows;
}

