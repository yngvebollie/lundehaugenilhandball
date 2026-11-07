type Row=Record<string,unknown>;
export type Registration={id:string;team:string;org_id:number;season:number;tournament:number|null;leagues?:number[];profile_note?:string;active:boolean;synced_at?:string;sync_result?:string};
export type NifGet=(path:string)=>Promise<unknown>;
function array(value:unknown):Row[]{
  if(!Array.isArray(value))throw Error("Uventet svarformat fra NIF.");
  return value.filter((r):r is Row=>!!r&&typeof r==="object");
}
const str=(v:unknown)=>typeof v==="string"||typeof v==="number"?String(v):null;
const positive=(v:unknown)=>Number.isSafeInteger(Number(v))&&Number(v)>0;
export function fixture(row:Row,r:Registration){
  const homeSide=Number(row.hometeamId)===r.org_id;
  if(!homeSide&&Number(row.awayteamId)!==r.org_id||r.season>0&&Number(row.seasonId)!==r.season)return null;
  const id=Number(row.matchId??row.id),day=String(row.matchDate??"").slice(0,10);
  if(!positive(id)||!/^\d{4}-\d\d-\d\d$/.test(day))throw Error("Ufullstendig kamp fra NIF.");
  const hhmm=str(row.matchStartTime)?.padStart(4,"0");
  const result=row.matchResult as Row|null,score=result&&typeof result==="object"
    ?str(result.matchEndResult)??(result.homeGoals!=null&&result.awayGoals!=null?result.homeGoals+"-"+result.awayGoals:null):str(row.matchResult);
  const status=str(row.nonPlayReason)||str(row.statusType)||"Ukjent";
  return {id,day,time:hhmm&&/^([01]\d|2[0-3])[0-5]\d$/.test(hhmm)?hhmm.slice(0,2)+":"+hhmm.slice(2):null,
    home:str(row.hometeam),away:str(row.awayteam),opponent:str(homeSide?row.awayteam:row.hometeam)||"Ukjent",
    competition:str(row.tournamentName),age:str(row.ageClassName??row.ageClass),venue:str(row.activityAreaName??row.venueName),score,status,
    completed:!row.nonPlayReason&&(!!score&&/\d\s*[-:]\s*\d/.test(score)||/^(spilt|ferdig|avsluttet|played)$/i.test(status))};
}
export function players(rows:Row[],org:number,listed:boolean){
  return rows.filter(r=>r.memberType==="Player"&&(listed?Number(r.teamOrgId)===org:true)&&positive(r.personId)&&
    !r.reserved&&!r.isReserved&&[r.firstName,r.lastName].some(v=>typeof v==="string"&&v.trim()))
    .map(r=>({id:Number(r.personId),name:[r.firstName,r.lastName].filter(v=>typeof v==="string").join(" ").trim(),
      number:str(r.number),position:str(r.position),played:listed&&typeof r.played==="boolean"?r.played:null,
      best:listed&&typeof r.bestPlayer==="boolean"?r.bestPlayer:null,listed}));
}
async function optional(get:NifGet,path:string){
  try{return array(await get(path));}catch(e){if(e instanceof Error&&/^NIF (403|404|204)$/.test(e.message))return null;throw e;}
}
export async function discover(r:Registration,known:number[],get:NifGet,save:(f:NonNullable<ReturnType<typeof fixture>>,people:ReturnType<typeof players>,authoritative:boolean)=>Promise<void>,includePlayers=true){
  const scheduled=array(await get("ScheduledMatches/"+r.org_id));
  const tournaments=new Set<number>([...(r.leagues||[]),...(r.tournament?[r.tournament]:[])]);
  for(const row of scheduled)if(fixture(row,r)&&positive(row.tournamentId))tournaments.add(Number(row.tournamentId));
  const candidates=[...scheduled];
  for(const id of tournaments)candidates.push(...array(await get("TournamentMatches?tournamentId="+id)));
  const rows=new Map<number,NonNullable<ReturnType<typeof fixture>>>();
  for(const row of candidates){const f=fixture(row,r);if(f)rows.set(f.id,f);}
  for(const id of known.filter(n=>!rows.has(n))){
    const raw=await get("Match?matchid="+id);
    for(const row of array(Array.isArray(raw)?raw:[raw])){const f=fixture(row,r);if(f)rows.set(f.id,f);}
  }
  let fallback=0,roster:ReturnType<typeof players>|undefined;
  for(const f of rows.values()){
    if(!includePlayers){await save(f,[],false);continue;}
    const response=await optional(get,"MatchTeamMembers/"+f.id);
    const listed=response?players(response,r.org_id,true):[];
    if(!listed.length||listed.some(p=>p.played===null)){
      fallback++;if(!roster)roster=players(await optional(get,"TeamMembers/"+r.org_id)||[],r.org_id,false);
    }
    const extra=(!listed.length||listed.some(p=>p.played===null))?(roster||[]).filter(p=>!listed.some(x=>x.id===p.id)):[];
    await save(f,[...listed,...extra],response!==null);
  }
  return rows.size+" kamper oppdatert, "+[...rows.keys()].filter(id=>!known.includes(id)).length+" nye. "+(fallback?fallback+" med ufullstendig deltakerliste.":"");
}
