import {db,demo,type Snapshot} from "./beta";
import {matches,createMatch,type Match} from "./matches";
import type {Registration} from "./nif";
import type {Report} from "./report-text";
import {hundvag,publishedFixtures} from "./hundvag-profile";
export type Fixture=Match&{registration?:string;nif_id?:number;home?:string;away?:string;start_time?:string;competition?:string;age_class?:string;venue?:string;score?:string;status?:string;completed?:boolean};
export const metrics={shots_hit:"Mål",shots_missed:"Bomskudd",technical_errors:"Tekniske feil",goalkeeper_saves:"Redninger"} as const;
export type Stats=Record<keyof typeof metrics,number>&{rating:number|null;notes:string;is_best_player:boolean};
export const blank:Stats={shots_hit:0,shots_missed:0,technical_errors:0,goalkeeper_saves:0,rating:null,notes:"",is_best_player:false};
export type Player={player_id:string;name:string;shirt_number?:string;position?:string;local_played:boolean|null;nif_played:boolean|null;report_listed?:boolean;report_played?:boolean|null;report_goals?:number|null;report_warnings?:number|null;report_suspensions?:number|null;nif_best_player?:boolean;discrepancy?:boolean;stats:Stats|null};
export type PlayerForm={games:number;scored_games:number;goals:number|null;prior_games:number;prior_goals:number|null;game_suspensions:number|null;season_suspensions:number|null;season_warnings:number|null};
export type Details={rows:Player[];catalog:{id:string;name:string}[]};
const key="nhf-kamper:";
function read<T>(k:string,initial:T):T{return JSON.parse(localStorage.getItem(key+k)||"null")??initial;}
const put=(k:string,v:unknown)=>localStorage.setItem(key+k,JSON.stringify(v));
export type SeasonSettings={active:number|null;options:{id:number;label:string}[]};
export async function seasonSettings(team:string):Promise<SeasonSettings>{
  if(!demo)return (await db!.rpc("beta_season_settings",{action:"read",t:team}).throwOnError()).data;
  return read("season:"+team,team==="demo"?{active:201068,options:[{id:201068,label:"2026/27"}]}:{active:null,options:[]});
}
export async function saveSeason(team:string,id:number,label:string){
  if(!Number.isSafeInteger(id)||id<1||!label.trim()||label.trim().length>40)throw Error("Oppgi NIF-sesong-ID og sesongnavn.");
  if(!demo){await db!.rpc("beta_season_settings",{action:"save",t:team,sid:id,title:label.trim()}).throwOnError();return;}
  const {options}=await seasonSettings(team);put("season:"+team,{active:id,options:[...options.filter(x=>x.id!==id),{id,label:label.trim()}]});
}
export const confirmed=(p:Player)=>p.local_played??p.report_played??p.nif_played??false;
function demoPlayers(m:Fixture){
  const rows=read<Player[]>("rows:"+m.id,[]).map(x=>({...x,report_listed:false,report_played:null as boolean|null,report_goals:null as number|null,report_warnings:null as number|null}));
  const doc:Report|undefined=JSON.parse(sessionStorage.getItem("kamper-private-report:"+m.team+":"+m.id)||"null")?.reviewed;
  const side=m.away===m.opponent?"A":m.home===m.opponent?"B":null;
  for(const p of doc?.players.filter(x=>x.side===side)||[]){
    const id="report:"+m.registration+":"+p.name.toLowerCase().trim()+":"+p.shirt;
    const row=rows.find(x=>x.player_id===id)||(rows[rows.length]={player_id:id,name:p.name,shirt_number:p.shirt,local_played:null,nif_played:null,stats:null,report_listed:false,report_played:null,report_goals:null,report_warnings:null});
    Object.assign(row,{report_listed:true,report_played:p.played,report_goals:p.total,report_warnings:p.warning==null?null:Number(p.warning),report_suspensions:p.suspensions});
  }return rows;
}
export type ReportStatus={revision:number|null;rows:number};
export async function reportOverview(team:string,fixtures:Fixture[]):Promise<Record<string,ReportStatus>>{
  if(demo)return Object.fromEntries(fixtures.map(g=>[g.id,{revision:JSON.parse(sessionStorage.getItem("kamper-private-report:"+team+":"+g.id)||"null")?.revision??null,
    rows:demoPlayers(g).filter(p=>p.report_listed||p.stats).length}]));
  const result:Record<string,ReportStatus>={};
  for(let i=0;i<fixtures.length;i+=500)Object.assign(result,(await db!.rpc("beta_report_overview",{t:team,ids:fixtures.slice(i,i+500).map(g=>g.id)}).throwOnError()).data);
  return result;
}
export async function playerForm(g:Fixture):Promise<Record<string,PlayerForm>>{
  if(!demo)return (await db!.rpc("beta_player_form",{t:g.team,m:g.id}).throwOnError()).data;
  const totals:Record<string,PlayerForm>={};
  const season=(await matches(g.team) as Fixture[]).filter(m=>m.registration===g.registration);
  const norm=(p:Player)=>p.name.trim().toLowerCase().replace(/\s+/g," ");
  const ambiguous=new Set<string>();
  for(const m of season){const seen=new Set<string>();for(const p of demoPlayers(m)){const name=norm(p);if(seen.has(name)||!p.player_id.startsWith("report:"))ambiguous.add(name);seen.add(name);}}
  const key=(p:Player)=>p.player_id.startsWith("report:")&&!ambiguous.has(norm(p))?"name:"+norm(p):p.player_id;
  for(const m of season){
    if(!m.completed||m.day>g.day||m.registration!==g.registration||m.day===g.day&&m.id!==g.id&&(!m.start_time||!g.start_time||m.start_time>=g.start_time))continue;
    for(const p of demoPlayers(m)){const goals=p.report_goals??p.stats?.shots_hit;const a=totals[key(p)]??={games:0,scored_games:0,goals:null,prior_games:0,prior_goals:null,game_suspensions:null,season_suspensions:null,season_warnings:null};
      if(p.report_listed&&p.report_warnings!=null)a.season_warnings=(a.season_warnings??0)+p.report_warnings;
      if(p.report_listed&&p.report_suspensions!=null){a.season_suspensions=(a.season_suspensions??0)+p.report_suspensions;if(m.id===g.id)a.game_suspensions=p.report_suspensions;}
      if(!confirmed(p))continue;a.games++;if(goals!=null){a.scored_games++;a.goals=(a.goals??0)+goals;if(m.id!==g.id){a.prior_games++;a.prior_goals=(a.prior_goals??0)+goals;}}}
  }return Object.fromEntries(demoPlayers(g).filter(p=>totals[key(p)]).map(p=>[p.player_id,totals[key(p)]]));
}
export type StatLine={match_id:string;day:string;home:boolean|null;player:string;name:string;shirt:string|null;played:boolean;
  goals:number|null;field_goals:number|null;penalty:number|null;warnings:number|null;suspensions:number|null;disqualifications:number|null;missed:number|null;errors:number|null;saves:number|null;rating:number|null;awards:number|null};
export async function squadStatLines(reg:string,fixtures:Fixture[]):Promise<StatLine[]>{
  if(!demo)return (await db!.rpc("beta_squad_stat_lines",{reg}).throwOnError()).data;
  const season=fixtures.filter(g=>g.registration===reg&&g.completed);
  const ambiguous=new Set<string>(),norm=(p:Player)=>p.name.trim().toLowerCase().replace(/\s+/g," ");
  for(const g of season){const seen=new Set<string>();for(const p of demoPlayers(g)){if(seen.has(norm(p))||!p.player_id.startsWith("report:"))ambiguous.add(norm(p));seen.add(norm(p));}}
  return season.flatMap(g=>{
    const doc:Report|undefined=JSON.parse(sessionStorage.getItem("kamper-private-report:"+g.team+":"+g.id)||"null")?.reviewed;
    const home=g.opponent===g.away,side=home?"A":"B";
    return demoPlayers(g).map(p=>{const r=doc?.players.find(x=>x.side===side&&x.shirt===p.shirt_number&&x.name===p.name);
      return {match_id:g.id,day:g.day,home,player:ambiguous.has(norm(p))?p.player_id:norm(p),name:p.name,shirt:p.shirt_number??null,played:confirmed(p),
        goals:p.report_goals??p.stats?.shots_hit??null,field_goals:r?.goals??null,penalty:r?.penalty??null,warnings:p.report_warnings??null,suspensions:r?.suspensions??null,
        disqualifications:r?.disqualification==null?null:Number(r.disqualification),missed:p.stats?.shots_missed??null,errors:p.stats?.technical_errors??null,saves:p.stats?.goalkeeper_saves??null,
        rating:p.stats?.rating??null,awards:p.stats==null?null:Number(p.stats.is_best_player)};
    });
  });
}
export function shooting(s:Stats){const total=s.shots_hit+s.shots_missed;return {total,percent:total?Math.round(100*s.shots_hit/total):null};}
export async function registrations(team:string,settings?:SeasonSettings):Promise<Registration[]>{
  if(demo&&team==="demo"&&!localStorage.getItem(key+"reg:"+team)){
    const registration="demo-hundvag";
    put("reg:"+team,[{...hundvag,team,id:registration,display_name:"Hundvåg J13",active:true,sync_result:"Publisert terminliste for sesongen 2026/27."}]);
  }
  if(demo&&team==="demo"&&!localStorage.getItem(key+"fixtures:2026-27:v2")){
    const registration="demo-hundvag";
    for(const f of publishedFixtures)await createMatch({...f,...{id:"nhf-"+f.nif_id,team,registration,status:f.completed?"Ferdig":"Planlagt",lineup:[]}});
    localStorage.setItem(key+"fixtures:2026-27:v2","1");
  }
  const sid=(settings||await seasonSettings(team)).active;if(!sid)return [];
  return demo?read<Registration[]>("reg:"+team,[]).filter(r=>r.season===sid):(await db!.from("beta_team_seasons").select("*").eq("team",team).eq("season",sid).order("org_id").throwOnError()).data;
}
export async function seasonMatches(team:string,regs:Registration[]):Promise<Fixture[]>{
  const ids=regs.map(x=>x.id);if(!ids.length)return [];
  if(!demo)return (await db!.from("beta_matches").select("*").eq("team",team).in("registration",ids).order("day",{ascending:false}).throwOnError()).data;
  return (await matches(team) as Fixture[]).filter(m=>ids.includes(m.registration||"")&&(m.registration!=="demo-hundvag"||publishedFixtures.some(f=>f.nif_id===m.nif_id)));
}
export async function register(team:string,org_id:number,season:number,leagues:number[],display_name=""){
  if(!Number.isSafeInteger(org_id)||org_id<1||leagues.some(x=>!Number.isSafeInteger(x)||x<1))throw Error("Ugyldig NIF-ID.");
  if((await seasonSettings(team)).active!==season||!season)throw Error("Lagre sesong først.");
  const rows=await registrations(team);const existing=rows.find(x=>x.org_id===org_id);if(existing)throw Error("NIF "+org_id+" er allerede registrert som "+(existing.display_name||"Lag "+org_id)+".");
  const row={team,org_id,season,display_name:display_name.trim().slice(0,100),tournament:leagues[0]||null,leagues};
  if(!demo)return (await db!.from("beta_team_seasons").insert(row).select("*").single().throwOnError()).data as Registration;
  const next={...row,active:true,id:crypto.randomUUID()};put("reg:"+team,[...read<Registration[]>("reg:"+team,[]),next]);return next;
}
export async function editProfile(r:Registration,leagues:number[],profile_note:string){
  if(leagues.some(x=>!Number.isSafeInteger(x)||x<=0))throw Error("Ugyldig liga-ID.");
  const patch={leagues,tournament:leagues[0]||null,profile_note};
  if(demo)put("reg:"+r.team,read<Registration[]>("reg:"+r.team,[]).map(x=>x.id===r.id?{...x,...patch}:x));
  else await db!.from("beta_team_seasons").update(patch).eq("id",r.id).eq("team",r.team).select("id").single().throwOnError();
}
export async function toggleRegistration(r:Registration){
  if(demo)put("reg:"+r.team,read<Registration[]>("reg:"+r.team,[]).map(x=>x.id===r.id?{...x,active:!r.active}:x));
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
