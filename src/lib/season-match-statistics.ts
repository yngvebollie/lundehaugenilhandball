import {periodScores} from "./halftime";
import {fixtureOutcome,type Wld} from "./match-result";
import {isMatchGoal,matchTimeline,type LiveMatch,type MatchSide} from "./live-match";
import {analyzeFixture} from "./fixture-analysis";
import type {Fixture,ReportStatus} from "./match-journal";

export type SeasonLog=Pick<LiveMatch,"events"|"periodMinutes"|"finalized"|"clock"|"eventOrigin">;
export const wld=(a:number,b:number):Wld=>a>b?"W":a<b?"L":"D";
export const ownMatchSide=(g:Fixture):MatchSide|null=>{
  if(!fixtureOutcome(g))return null;
  return g.opponent.trim().toLocaleLowerCase("nb")===g.away?.trim().toLocaleLowerCase("nb")?"home":"away";
};
const groups=["0–2","3","4","5+"] as const;
export type StreakGroup=typeof groups[number];
const groupOf=(n:number):StreakGroup=>n>=5?"5+":n===4?"4":n===3?"3":"0–2";
type Count={W:number;D:number;L:number};
const counts=():Count=>({W:0,D:0,L:0});

export function seasonMatchStatistics(games:Fixture[], reports:Record<string,ReportStatus>, logs:Record<string,SeasonLog>) {
  const byFixture=new Map<string,Fixture[]>();
  for(const game of games){
    if(!game.completed)continue;
    const key=game.nif_id?"nif:"+game.nif_id:game.id;
    const options=byFixture.get(key)??[];
    options.push(game);byFixture.set(key,options);
  }
  const rows=[];
  const buckets=new Map<string,{half:1|2;from:number;to:number;goals:number;against:number;games:number}>();
  const pause={W:counts(),D:counts(),L:counts()};
  const streaks=Object.fromEntries(groups.map(key=>[key,counts()])) as Record<StreakGroup,Count>;
  let timed=0;
  const timeStats={longestOwn:0,longestOpp:0,ahead:0,tied:0,behind:0,seconds:0,goals:0,against:0};
  const openings={games:0,first:0,second:0};
  for(const [key,records] of byFixture){
    const candidates=records.flatMap(game=>{
      const side=ownMatchSide(game),final=fixtureOutcome(game),{half,full}=periodScores(game,reports[game.id]);
      if(!side||!final||!full)return [];
      const index=side==="home"?0:1;
      const log=logs[game.id],events=log?.finalized?matchTimeline(log.events).filter(({event})=>event.side&&isMatchGoal(event)):[];
      const last=events.at(-1);
      const verified=log?.finalized&&([1,2] as const).every(half=>log.events.some(event=>event.half===half)||!!log.periodMinutes)&&
        (last?.home??0)===full[0]&&(last?.away??0)===full[1];
      return [{game,side,final,full:[full[index],full[1-index]],half:half?[half[index],half[1-index]]:null,log:verified?log:undefined,events:verified?events:[]}];
    });
    if(!candidates.length||new Set(candidates.map(r=>r.side+":"+r.full.join("-"))).size>1)continue;
    candidates.sort((a,b)=>Number(b.log?.eventOrigin==="manual")-Number(a.log?.eventOrigin==="manual")||Number(!!b.log)-Number(!!a.log)||Number(!!b.half)-Number(!!a.half));
    const item=candidates[0];
    const {game,side,final,full,log,events}=item;
    const goals=events.map(row=>row.event);
    const first=events.filter(({event})=>event.half===1).at(-1);
    const half=log?[first?.[side]??0,first?.[side==="home"?"away":"home"]??0]:item.half;
    const atBreak=half?wld(half[0],half[1]):null;
    if(atBreak)pause[atBreak][final]++;
    const duration=log?([1,2] as const).map(h=>
      log.events.find(e=>e.half===h&&e.type==="clock"&&e.label==="Slutt "+h+". omgang")?.seconds??(log.periodMinutes?log.periodMinutes*60:0),
    ):null;
    const verifiedDuration=duration?.every((seconds,index)=>seconds>0&&seconds<=5400&&goals.every(e=>e.half!==index+1||e.seconds<=seconds))?duration:null;
    if(verifiedDuration){
      timed++;
      timeStats.seconds+=verifiedDuration[0]+verifiedDuration[1];
      timeStats.goals+=full[0];timeStats.against+=full[1];
      if(verifiedDuration.every(seconds=>seconds>=300)){
        openings.games++;
        for(const event of goals)if(event.seconds<=300){
          openings[event.half===1?"first":"second"]+=event.side===side?1:-1;
        }
      }
      const analysis=analyzeFixture(log!,side);
      timeStats.longestOwn=Math.max(timeStats.longestOwn,analysis.droughts[side].seconds);
      timeStats.longestOpp=Math.max(timeStats.longestOpp,analysis.droughts[side==="home"?"away":"home"].seconds);
      timeStats.ahead+=analysis.leadTime.ahead;timeStats.tied+=analysis.leadTime.tied;timeStats.behind+=analysis.leadTime.behind;
      for(const h of [1,2] as const){
        for(let from=0;from+300<=verifiedDuration[h-1];from+=300){
          const id=h+":"+from;
          const bin=buckets.get(id)??{half:h,from:from/60,to:(from+300)/60,goals:0,against:0,games:0};
          bin.games++;
          for(const e of goals.filter(e=>e.half===h&&e.seconds<=from+300&&(from===0||e.seconds>from))){
            if(e.side===side)bin.goals++;else bin.against++;
          }
          buckets.set(id,bin);
        }
      }
    }
    let length=0,max=0,episodes=0,firstRun=-1;
    goals.forEach((event,index)=>{
      length=event.side===side?0:length+1;max=Math.max(max,length);
      if(length===3){episodes++;if(firstRun<0)firstRun=index;}
    });
    const streak=log?groupOf(max):null;
    if(streak)streaks[streak][final]++;
    const next=firstRun<0?undefined:goals.slice(firstRun+1).find(e=>e.side===side);
    const third=goals[firstRun];
    const recovery=next&&(next.half===third.half||verifiedDuration)?next.seconds-third.seconds+(next.half!==third.half?verifiedDuration![0]:0):null;
    const firstRunScore=firstRun>=0?events[firstRun]:null;
    rows.push({key,game,final,full,half,atBreak,streak,max,episodes,recovery,
      noResponse:firstRun>=0&&!next,firstRunScore,side,third});
  }
  const affected=rows.filter(row=>row.episodes);
  return {total:byFixture.size,rows,pause,streaks,timed,timeStats,openings,
    intervals:[...buckets.values()].sort((a,b)=>a.half-b.half||a.from-b.from),
    pauseCoverage:rows.filter(row=>row.half).length,streakCoverage:rows.filter(row=>row.streak).length,
    affected:affected.length,recoveryKnown:affected.filter(row=>row.recovery!==null).length,
    noResponse:affected.filter(row=>row.noResponse).length,
    withinTwo:affected.filter(row=>row.recovery!==null&&row.recovery<=120).length,
  };
}
