import {fixtureEventDocument} from "./fixture-events";
import type {LiveMatch, MatchEvent, MatchSide} from "./live-match";
import type {Fixture} from "./match-journal";

type PublicRow={period?:unknown;time?:unknown;text?:unknown;score?:unknown;eventCssClass?:unknown};
type PublicPeriods={home?:{goalsByPeriod?:number[]};away?:{goalsByPeriod?:number[]}};
const entities:Record<string,string>={quot:'"',apos:"'",amp:"&",lt:"<",gt:">",nbsp:" "};
const decode=(value:string)=>value.replace(/&(#x[\da-f]+|#\d+|quot|apos|amp|lt|gt|nbsp);/gi,(_,entity:string)=>{
  if(!entity.startsWith("#"))return entities[entity.toLowerCase()];
  const code=entity[1].toLowerCase()==="x"?parseInt(entity.slice(2),16):Number(entity.slice(1));
  return code<=0x10ffff?String.fromCodePoint(code):"";
});
const plain=(value:unknown)=>typeof value==="string"?decode(value.replace(/<[^>]*>/g,"")).trim():"";

export function parsePublicMatchEvents(html:string, game:Fixture):LiveMatch|null{
  if(html.length>2_000_000||!game.nif_id||!game.completed)return null;
  const block=html.match(/<match-info\b[^>]*>/i)?.[0];
  if(!block)return null;
  const id=block.match(/:match-id=['"](\d+)['"]/)?.[1];
  const encoded=block.match(/:match-events='([^']*)'/)?.[1];
  if(id!==String(game.nif_id)||!encoded)return null;
  const rows:PublicRow[]=JSON.parse(decode(encoded));
  if(!Array.isArray(rows)||rows.length>500)return null;
  const full=game.score?.trim().match(/^(\d+)\s*[-–:]\s*(\d+)$/);
  if(!full)return null;
  const encodedPeriods=html.match(/<period-results\b[^>]*:model='([^']*)'/)?.[1];
  const periods:PublicPeriods=encodedPeriods?JSON.parse(decode(encodedPeriods)):{};
  const goals={home:0,away:0},first={home:0,away:0},last={1:0,2:0};
  const events:MatchEvent[]=[];
  let previousHalf=1;
  for(const [index,row] of rows.entries()){
    if(!row||typeof row!=="object")return null;
    const half=Number(row.period);
    const clock=String(row.time??"").match(/^(\d{1,3}):([0-5]\d)$/);
    const side:MatchSide|undefined=row.eventCssClass==="hometeam-event"?"home":row.eventCssClass==="awayteam-event"?"away":undefined;
    const title=plain(row.text).toLocaleLowerCase("nb-NO");
    const reported=plain(row.score).match(/^(\d+)\s*[-–:]\s*(\d+)$/);
    const deltaHome=reported?Number(reported[1])-goals.home:0;
    const deltaAway=reported?Number(reported[2])-goals.away:0;
    const scoreSide=deltaHome===1&&deltaAway===0?"home":deltaAway===1&&deltaHome===0?"away":undefined;
    if(reported&&(deltaHome||deltaAway)&&!scoreSide)return null;
    const type=scoreSide?(title.includes("7m")||title.includes("7 m")?"penalty":"goal"):
      /timeout|time.out/.test(title)?"timeout":/advarsel|gult kort/.test(title)?"warning":/utvisning|2\s*min/.test(title)?"suspension":undefined;
    if(!type)continue;
    if((half!==1&&half!==2)||!clock||half<previousHalf)return null;
    const seconds=Number(clock[1])*60+Number(clock[2]);
    if(seconds<last[half]||(scoreSide&&side&&scoreSide!==side))return null;
    previousHalf=half;last[half]=seconds;
    if(scoreSide){goals[scoreSide]++;if(half===1)first[scoreSide]++;}
    events.push({id:"nhf-public:"+index,recordedAt:index,half,seconds,side:scoreSide??side,type,outcome:type==="penalty"?"goal":undefined});
  }
  if(!events.some(e=>e.half===2)||goals.home!==Number(full[1])||goals.away!==Number(full[2]))return null;
  if(periods.home?.goalsByPeriod?.[0]!=null&&periods.home.goalsByPeriod[0]!==first.home)return null;
  if(periods.away?.goalsByPeriod?.[0]!=null&&periods.away.goalsByPeriod[0]!==first.away)return null;
  const age=game.age_class||game.competition||"";
  const nominal=/\b(?:jenter|gutter|[jg])\s*(?:13|14)\b/i.test(age)?20:undefined;
  const periodMinutes=nominal&&Math.max(last[1],last[2])<=nominal*60?nominal:undefined;
  return {...fixtureEventDocument(game),eventOrigin:"api",events,periodMinutes,
    clock:{half:2,status:"finished",since:null,seconds:periodMinutes?periodMinutes*60:last[2]}};
}
