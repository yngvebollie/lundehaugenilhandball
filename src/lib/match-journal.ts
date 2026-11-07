import {db,demo,type Snapshot} from "./beta";
import {matches,createMatch,type Match} from "./matches";
import type {Registration} from "./nif";
import type {Report} from "./report-text";
import {hundvag,publishedFixtures} from "./hundvag-profile";
export type Fixture=Match&{registration?:string;nif_id?:number;home?:string;away?:string;start_time?:string;competition?:string;age_class?:string;venue?:string;score?:string;status?:string;completed?:boolean};
export const metrics={shots_hit:"Mål",shots_missed:"Bomskudd",technical_errors:"Tekniske feil",goalkeeper_saves:"Redninger"} as const;
export type Stats=Record<keyof typeof metrics,number>&{rating:number|null;notes:string;is_best_player:boolean};
export const blank:Stats={shots_hit:0,shots_missed:0,technical_errors:0,goalkeeper_saves:0,rating:null,notes:"",is_best_player:false};
export type Player={player_id:string;name:string;shirt_number?:string;position?:string;local_played:boolean|null;nif_played:boolean|null;report_listed?:boolean;report_played?:boolean|null;report_goals?:number|null;report_warnings?:number|null;nif_best_player?:boolean;discrepancy?:boolean;stats:Stats|null};
export type PlayerForm={games:number;goals:number;prior_games:number;prior_goals:number|null};
export type Details={rows:Player[];catalog:{id:string;name:string}[]};
const key="nhf-kamper:";
function read<T>(k:string,initial:T):T{return JSON.parse(localStorage.getItem(key+k)||"null")??initial;}
const put=(k:string,v:unknown)=>localStorage.setItem(key+k,JSON.stringify(v));
export const confirmed=(p:Player)=>p.local_played??p.report_played??p.nif_played??false;
function demoPlayers(m:Fixture){
  const rows=read<Player[]>("rows:"+m.id,[]).map(x=>({...x,report_listed:false,report_played:null as boolean|null,report_goals:null as number|null,report_warnings:null as number|null}));
  const doc:Report|undefined=JSON.parse(sessionStorage.getItem("kamper-private-report:"+m.team+":"+m.id)||"null")?.reviewed;
  const side=m.away===m.opponent?"A":m.home===m.opponent?"B":null;
  for(const p of doc?.players.filter(x=>x.side===side)||[]){
    const id="report:"+m.registration+":"+p.name.toLowerCase().trim()+":"+p.shirt;
    const row=rows.find(x=>x.player_id===id)||(rows[rows.length]={player_id:id,name:p.name,shirt_number:p.shirt,local_played:null,nif_played:null,stats:null,report_listed:false,report_played:null,report_goals:null,report_warnings:null});
    Object.assign(row,{report_listed:true,report_played:p.played,report_goals:p.total,report_warnings:p.warning==null?null:Number(p.warning)});
  }return rows;
}
export async function playerForm(g:Fixture):Promise<Record<string,PlayerForm>>{
  if(!demo)return (await db!.rpc("beta_player_form",{t:g.team,m:g.id}).throwOnError()).data;
  const totals:Record<string,PlayerForm>={};
  for(const m of await matches(g.team) as Fixture[]){
    if(!m.completed||m.day>g.day||m.day.slice(0,4)!==g.day.slice(0,4)||m.registration!==g.registration||m.day===g.day&&m.id!==g.id&&(!m.start_time||!g.start_time||m.start_time>=g.start_time))continue;
    for(const p of demoPlayers(m)){const goals=p.report_goals??p.stats?.shots_hit;if(!confirmed(p)||goals==null)continue;
      const a=totals[p.player_id]??={games:0,goals:0,prior_games:0,prior_goals:0};a.games++;a.goals+=goals;if(m.id!==g.id){a.prior_games++;a.prior_goals=(a.prior_goals||0)+goals;}}
  }return totals;
}
export function shooting(s:Stats){const total=s.shots_hit+s.shots_missed;return {total,percent:total?Math.round(100*s.shots_hit/total):null};}
export async function registrations(team:string):Promise<Registration[]>{
  if(demo&&team==="demo"&&!localStorage.getItem(key+"reg:"+team)){
    const registration="demo-hundvag";
    put("reg:"+team,[{...hundvag,team,id:registration,active:true,sync_result:"Publisert NHF-oversikt 07.11.2026 · ikke en direkte API-synk."}]);
    for(const f of publishedFixtures)await createMatch({...f,...{id:"nhf-"+f.nif_id,team,registration,status:f.completed?"Ferdig":"Planlagt",lineup:[]}});
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
  if(action==="counts")return Object.fromEntries(all.map(x=>[x.id,demoPlayers(x).filter(p=>p.stats||p.report_listed).length]));
  if(action==="new"){const id=crypto.randomUUID();await createMatch({id,team:t,day:String(v.day),opponent:String(v.opponent),lineup:[]});return id;}
  if(!current)throw Error("Ukjent kamp.");
  const rows:Player[]=demoPlayers(current),catalog=read<Details["catalog"]>("catalog:"+t,[]);
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
