import {db,demo} from "./beta";
export type Match={id:string;team:string;opponent:string;day:string;lineup:string[]};
export const outcomes=["Goal","Saved","Missed","Blocked"] as const;
export type Outcome=typeof outcomes[number];
export type Shot={id:string;match_id:string;shooter:string;assist:string|null;outcome:Outcome;x:number;y:number;gx:number|null;gy:number|null;created_at?:string};
const prefix="nhf-match-v1:";
function local<T>(key:string):T[]{return Object.keys(localStorage).filter(k=>k.startsWith(prefix+key)).map(k=>JSON.parse(localStorage.getItem(k)!));}
export async function matches(team:string):Promise<Match[]>{
  if(demo)return local<Match>("match:").filter(m=>m.team===team).sort((a,b)=>b.day.localeCompare(a.day));
  return (await db!.from("beta_matches").select("*").eq("team",team).order("day",{ascending:false}).throwOnError()).data as Match[];
}
export async function createMatch(m:Match){
  if(demo)localStorage.setItem(prefix+"match:"+m.id,JSON.stringify(m));
  else await db!.from("beta_matches").insert(m).throwOnError();
}
export async function shots(match:string):Promise<Shot[]>{
  if(demo)return local<Shot>("shot:").filter(s=>s.match_id===match).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));
  return (await db!.from("beta_shots").select("*").eq("match_id",match).order("created_at").order("id").throwOnError()).data as Shot[];
}
export async function saveShot(s:Shot){
  if(demo)localStorage.setItem(prefix+"shot:"+s.id,JSON.stringify({...s,created_at:new Date().toISOString()}));
  else {const r=await db!.from("beta_shots").insert(s);if(r.error&&r.error.code!=="23505")throw r.error;}
}
export async function undoShot(id:string){
  if(demo)localStorage.removeItem(prefix+"shot:"+id);
  else await db!.from("beta_shots").delete().eq("id",id).throwOnError();
}
