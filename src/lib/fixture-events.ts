import {isMatchGoal, type LiveMatch, type MatchEvent, type MatchSide} from "./live-match";
import type {Fixture} from "./match-journal";

const typeMap = {goal:"goal", yellow_card:"warning", two_minute_suspension:"suspension", timeout:"timeout", penalty_goal:"penalty"} as const;
type Profile = {id:string;name:string;given_name?:string|null;family_name?:string|null;shirt_number?:string|null};
type ReportPlayer = {side:"A"|"B";name:string;shirt:string};
type ImportEvent = {
  sequence:number;period:number;match_minute:number;minute_in_period?:number;team:string;type:keyof typeof typeMap;
  player?:string|null;number?:number;score_after?:{home:number;away:number};
};
const norm = (value:string) => value.trim().toLocaleLowerCase("nb-NO").replace(/\s+/g," ");
const first = (value:string) => norm(value).split(" ")[0];

export function fixtureEventDocument(game:Fixture):LiveMatch {
  return {
    home:{key:"home",name:game.home||"Hjemmelag"},away:{key:"away",name:game.away||"Bortelag"},
    date:game.day,players:[],events:[],finalized:game.completed===true,
    clock:{half:game.completed?2:1,status:game.completed?"finished":"ready",seconds:0,since:null},
  };
}

export function parseFixtureEvents(raw:string, game:Fixture, firstSide:MatchSide, roster:Profile[], reportPlayers:ReportPlayer[]) {
  if(raw.length>500_000) throw Error("Hendelsesfilen er for stor.");
  const data=JSON.parse(raw);
  if(!Array.isArray(data?.events)||!data.events.length||data.events.length>500) throw Error("Filen må inneholde 1–500 hendelser.");
  if(data.match?.id!=null&&String(data.match.id)!==String(game.nif_id)&&String(data.match.id)!==game.id) throw Error("Kamp-ID i filen stemmer ikke.");
  if(data.match?.date&&data.match.date!==game.day) throw Error("Kampdato i filen stemmer ikke.");
  const length=data.match?.period_length_minutes??20;
  if(!Number.isInteger(length)||length<1||length>90) throw Error("Ugyldig omgangslengde.");
  const secondSide=firstSide==="home"?"away":"home";
  const fixtureNames=fixtureEventDocument(game);
  for(const [fileName,side] of [[data.match?.home_team,firstSide],[data.match?.away_team,secondSide]] as const){
    if(typeof fileName==="string"&&norm(fileName)!=="eget lag"&&norm(fileName)!==norm(fixtureNames[side].name)) throw Error("Lagnavn i filen stemmer ikke med valgt side.");
  }
  const ownSide=norm(game.opponent)===norm(game.away||"")?"home":"away";
  const sequences=new Set<number>();
  let previous=0;
  const running={home:0,away:0};
  let atBreak=[0,0];
  const events=(data.events as ImportEvent[]).map(row=>{
    if(!row||!Number.isSafeInteger(row.sequence)||row.sequence<1||sequences.has(row.sequence))throw Error("Hver hendelse må ha et unikt sekvensnummer.");
    sequences.add(row.sequence);
    return row;
  }).sort((a,b)=>a.sequence-b.sequence).map((row):MatchEvent=>{
    const half=row.period;
    const minute=row.minute_in_period??row.match_minute-(half-1)*length;
    if((half!==1&&half!==2)||!Number.isInteger(minute)||minute<0||minute>length||row.match_minute!==minute+(half-1)*length||
      row.match_minute<previous||(row.team!=="home"&&row.team!=="away")||!Object.hasOwn(typeMap,row.type)) throw Error("Ugyldig hendelse ved sekvens "+row.sequence+".");
    previous=row.match_minute;
    const side=row.team==="home"?firstSide:secondSide;
    const type=typeMap[row.type];
    if(type==="goal"||type==="penalty")running[row.team]++;
    if(half===1)atBreak=[running.home,running.away];
    if(row.score_after&&(row.score_after.home!==running.home||row.score_after.away!==running.away))throw Error("Løpende stilling avviker ved sekvens "+row.sequence+".");
    if(row.player!=null&&typeof row.player!=="string")throw Error("Ugyldig spillernavn ved sekvens "+row.sequence+".");
    if(row.number!=null&&(!Number.isInteger(row.number)||row.number<0||row.number>99))throw Error("Ugyldig draktnummer ved sekvens "+row.sequence+".");
    const entered=row.player?.trim().slice(0,150);
    const report=entered?reportPlayers.filter(p=>p.side===(side==="home"?"A":"B")&&(norm(p.name)===norm(entered)||first(p.name)===norm(entered))):[];
    const line=report.length===1?report[0]:null;
    const number=row.number??(line&&/^\d{1,2}$/.test(line.shirt)?Number(line.shirt):undefined);
    const candidates=side===ownSide&&entered?roster.filter(p=>norm(p.name)===norm(entered)||
      (number!==undefined&&p.shirt_number!=null&&Number(p.shirt_number)===number&&first(p.given_name||p.name)===first(entered))):[];
    return {id:"json:"+row.sequence,recordedAt:row.sequence,half,seconds:minute*60,side,type,number,
      playerName:line?.name||entered,playerId:candidates.length===1?candidates[0].id:undefined,outcome:type==="penalty"?"goal":undefined};
  });
  if(data.match?.score&&(data.match.score.home!==running.home||data.match.score.away!==running.away))throw Error("Sluttresultatet i filen avviker fra hendelsene.");
  if(data.match?.halftime_score&&(data.match.halftime_score.home!==atBreak[0]||data.match.halftime_score.away!==atBreak[1]))throw Error("Pauseresultatet i filen avviker fra hendelsene.");
  const derived=[running[firstSide==="home"?"home":"away"],running[firstSide==="home"?"away":"home"]].join("-");
  const warning=game.score&&game.score.replace(/\s/g,"").replace(/[–:]/,"-")!==derived?"Sluttresultat i hendelsene er "+derived+" og avviker fra kampens "+game.score+".":"";
  return {events,warning,periodMinutes:length,digest:JSON.stringify(events.map(({id,half,seconds,side,type,number,playerName})=>[id,half,seconds,side,type,number,playerName]))};
}

export function fixtureScorers(events:MatchEvent[]) {
  const players=new Map<string,{side:MatchSide;name:string;number?:number;playerId?:string;first:number;second:number}>();
  for(const e of events){
    if(!isMatchGoal(e)||!e.side)continue;
    const id=[e.side,e.playerId??e.number??e.playerName??"unknown"].join(":");
    const row=players.get(id)??{side:e.side,name:e.playerName||"Ukjent målscorer",number:e.number,playerId:e.playerId,first:0,second:0};
    if(e.half===1)row.first++;else row.second++;
    players.set(id,row);
  }
  return [...players.values()].sort((a,b)=>b.first+b.second-a.first-a.second);
}

export function applyFixtureImport(match:LiveMatch, incoming:ReturnType<typeof parseFixtureEvents>, origin:"manual"|"api") {
  if(origin==="api"&&(match.eventOrigin==="manual"||(!match.eventOrigin&&match.events.length>0))) return match;
  if(match.importDigest===incoming.digest&&(origin==="api"||match.eventOrigin==="manual")) return match;
  return {...match,eventOrigin:origin,events:incoming.events,importDigest:incoming.digest,periodMinutes:incoming.periodMinutes};
}
