import {db,demo,type Snapshot,type PlayerLog} from "./beta";
import type {Suggestion} from "./coach-suggestions";
export {followedUp} from "./coach-suggestions";

export type FollowupLog=PlayerLog&{athlete:string;followup:{key:string;signals:string[];title:string;note:string;kind:Suggestion["kind"]}};
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
 const v={key:s.id,signals:[...new Set(s.signals)].sort(),title:s.title,kind:s.kind,note,evidence:s.evidence};
 if(!demo)return (await db!.rpc("beta_complete_followup",{t:data.me.squad,p:s.athlete,v}).throwOnError()).data;
 const key="nhf-beta-v1:playerlog:"+data.me.squad+":"+s.athlete+":followup:"+JSON.stringify([s.id,v.signals]),prior=localStorage.getItem(key);
 if(prior)return JSON.parse(prior);
 const row:FollowupLog={id:crypto.randomUUID(),athlete:s.athlete,actor:data.me.id,at_time:new Date().toISOString(),action:"Oppfølging gjennomført",detail:s.title+"\nGrunnlag: "+s.evidence+"\nNotat: "+note,followup:{key:s.id,signals:v.signals,title:s.title,kind:s.kind,note}};
 localStorage.setItem(key,JSON.stringify(row));return row;
}
