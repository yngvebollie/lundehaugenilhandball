import {db,demo,type Snapshot} from "./beta";
import {matches,createMatch,type Match} from "./matches";
import type {Registration} from "./nif";
import {hundvag,publishedFixtures} from "./hundvag-profile";
export type Fixture=Match&{registration?:string;nif_id?:number;home?:string;away?:string;start_time?:string;competition?:string;age_class?:string;venue?:string;score?:string;status?:string;completed?:boolean};
export const metrics={shots_hit:"Mål",shots_missed:"Bomskudd",technical_errors:"Tekniske feil",goalkeeper_saves:"Redninger"} as const;
export type Stats=Record<keyof typeof metrics,number>&{rating:number|null;notes:string;is_best_player:boolean};
export const blank:Stats={shots_hit:0,shots_missed:0,technical_errors:0,goalkeeper_saves:0,rating:null,notes:"",is_best_player:false};
export type Player={player_id:string;name:string;shirt_number?:string;position?:string;local_played:boolean|null;nif_played:boolean|null;nif_best_player?:boolean;discrepancy?:boolean;stats:Stats|null};
export type Details={rows:Player[];catalog:{id:string;name:string}[]};
const key="nhf-kamper:";
function read<T>(k:string,initial:T):T{return JSON.parse(localStorage.getItem(key+k)||"null")??initial;}
const put=(k:string,v:unknown)=>localStorage.setItem(key+k,JSON.stringify(v));
export const confirmed=(p:Player)=>p.local_played??p.nif_played??false;
export function shooting(s:Stats){const total=s.shots_hit+s.shots_missed;return {total,percent:total?Math.round(100*s.shots_hit/total):null};}
export async function registrations(team:string):Promise<Registration[]>{
  if(demo&&team==="demo"&&!localStorage.getItem(key+"reg:"+team)){
    const registration="demo-hundvag";
    put("reg:"+team,[{...hundvag,team,id:registration,active:true,sync_result:"Publisert NHF-oversikt 07.11.2026 · ikke en direkte API-synk."}]);
    for(const f of publishedFixtures)await createMatch({...f,...{id:"nhf-"+f.nif_id,team,registration,home:"Hundvåg",opponent:f.away,venue:"Hundvåghallen A",competition:"Jenter 13, A-serie 04",status:f.completed?"Ferdig":"Planlagt",lineup:[]}});
  }
  return demo?read("reg:"+team,[]):(await db!.from("beta_team_seasons").select("*").eq("team",team).order("org_id").throwOnError()).data;
}
export async function register(team:string,org_id:number,season:number,leagues:number[]){
  if(!Number.isSafeInteger(org_id)||org_id<1||leagues.some(x=>!Number.isSafeInteger(x)||x<1))throw Error("Ugyldig NIF-ID.");
  const rows=await registrations(team);if(rows.some(x=>x.org_id===org_id))throw Error("Lagprofilen finnes allerede. Velg den i listen.");
  const row={team,org_id,season,tournament:leagues[0]||null,leagues,active:true};
  if(!demo)return (await db!.from("beta_team_seasons").insert(row).select("*").single().throwOnError()).data as Registration;
  const next={...row,id:crypto.randomUUID()};put("reg:"+team,[...rows,next]);return next;
}
export async function editProfile(r:Registration,leagues:number[],profile_note:string){
  if(leagues.some(x=>!Number.isSafeInteger(x)||x<=0))throw Error("Ugyldig liga-ID.");
  const patch={leagues,tournament:leagues[0]||null,profile_note};
  if(demo)put("reg:"+r.team,(await registrations(r.team)).map(x=>x.id===r.id?{...x,...patch}:x));
  else await db!.from("beta_team_seasons").update(patch).eq("id",r.id).eq("team",r.team).select("id").single().throwOnError();
}
export async function toggleRegistration(r:Registration){
  if(demo)put("reg:"+r.team,(await registrations(r.team)).map(x=>x.id===r.id?{...x,active:!r.active}:x));
  else await db!.from("beta_team_seasons").update({active:!r.active}).eq("id",r.id).select("id").single().throwOnError();
}
export async function refreshSeason(r:Registration){
  if(demo)throw Error("NIF er ikke tilkoblet i lokal demo.");
  const {data}=await db!.auth.getSession();
  const res=await fetch("/api/matches/sync",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+data.session?.access_token},body:JSON.stringify({id:r.id})});
  const msg=(await res.json()).message||"Synkronisering mislyktes.";if(!res.ok)throw Error(msg);return msg as string;
}
export async function matchAction(data:Snapshot,action:string,m:string|null=null,p:string|null=null,v:Record<string,unknown>={}){
  const t=data.me.squad;if(!demo)return (await db!.rpc("beta_match_action",{action,t,m,p,v}).throwOnError()).data;
  const all=await matches(t),current=all.find(x=>x.id===m);
  if(action==="counts")return Object.fromEntries(all.map(x=>[x.id,read<Player[]>("rows:"+x.id,[]).filter(p=>p.stats).length]));
  if(action==="new"){const id=crypto.randomUUID();await createMatch({id,team:t,day:String(v.day),opponent:String(v.opponent),lineup:[]});return id;}
  if(!current)throw Error("Ukjent kamp.");
  const rows=read<Player[]>("rows:"+m,[]),catalog=read<Details["catalog"]>("catalog:"+t,[]);
  if(action==="details")return {rows,catalog};
  if(action==="finished"){await createMatch({...current,...{completed:true,score:v.score,status:"Ferdig"}});return;}
  if(action==="participant"){
    const id=p||crypto.randomUUID(),prev=rows.find(x=>x.player_id===id);
    const name=prev?.name||catalog.find(x=>x.id===id)?.name||data.roster.find(x=>x.id===id)?.name||String(v.name||"").trim();
    if(!name)throw Error("Navn mangler.");
    const row:Player={shirt_number:String(v.number||""),stats:null,nif_played:null,...prev,player_id:id,name,local_played:v.played===true,discrepancy:false};
    put("rows:"+m,[...rows.filter(x=>x.player_id!==id),row]);put("catalog:"+t,[...catalog.filter(x=>x.id!==id),{id,name}]);return;
  }
  const row=rows.find(x=>x.player_id===p);if(!row)throw Error("Velg spiller.");
  if(action==="erase")row.stats=null;
  else if(action==="stats"&&confirmed(row)){const s=v as Stats;
    if(Object.keys(metrics).some(k=>!Number.isInteger(s[k as keyof typeof metrics])||s[k as keyof typeof metrics]<0)||s.notes.length>500||
      s.rating!==null&&(!Number.isInteger(s.rating)||s.rating<1||s.rating>5))throw Error("Ugyldig statistikk.");
    if(s.is_best_player)for(const x of rows)if(x.stats)x.stats.is_best_player=false;
    row.stats=s;
  }else throw Error("Bekreft deltakelsen først.");
  put("rows:"+m,rows);
}
