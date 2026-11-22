import {isMatchGoal, matchTimeline, type LiveMatch, type MatchEvent, type MatchSide} from "./live-match";

export function eventSecond(event:MatchEvent, period:number) {
  return (event.half-1)*period+event.seconds;
}

export function analyzeFixture(match:Pick<LiveMatch,"events"|"periodMinutes"|"finalized"|"clock">, own:MatchSide) {
  const rows=matchTimeline(match.events);
  const other:MatchSide=own==="home"?"away":"home";
  const goals=rows.filter(({event})=>isMatchGoal(event)&&event.side);
  const halftime=goals.filter(({event})=>event.half===1).at(-1);
  const full=goals.at(-1);
  const hasSecond=rows.some(({event})=>event.half===2);
  const lastTime=(half:1|2)=>Math.max(0,...rows.filter(({event})=>event.half===half).map(({event})=>event.seconds));
  const endTime=(half:1|2)=>rows.filter(({event})=>event.half===half&&event.type==="clock"&&event.label==="Slutt "+half+". omgang").at(-1)?.event.seconds;
  const nominal=(match.periodMinutes??20)*60;
  const firstEnd=Math.max(lastTime(1),endTime(1)??(hasSecond&&match.periodMinutes?nominal:match.clock.half===1?match.clock.seconds:0));
  const secondEnd=hasSecond?Math.max(lastTime(2),endTime(2)??(match.finalized&&match.periodMinutes?nominal:match.clock.half===2?match.clock.seconds:0)):0;
  const played=firstEnd+secondEnd;
  const drought=(side:MatchSide)=>{
    let best={from:0,to:0},last=0;
    for(const {event} of goals){
      if(event.side!==side)continue;
      const time=eventSecond(event,firstEnd);
      if(time-last>best.to-best.from)best={from:last,to:time};
      last=time;
    }
    if(played-last>best.to-best.from)best={from:last,to:played};
    return {...best,seconds:best.to-best.from};
  };
  const leadTime={ahead:0,tied:0,behind:0};
  let previousTime=0,previousDiff=0;
  for(const row of goals){
    const time=eventSecond(row.event,firstEnd);
    leadTime[previousDiff===0?"tied":previousDiff>0?"ahead":"behind"]+=time-previousTime;
    previousDiff=row[own]-row[other];previousTime=time;
  }
  leadTime[previousDiff===0?"tied":previousDiff>0?"ahead":"behind"]+=played-previousTime;
  const openingSecond=goals.filter(({event})=>event.half===2&&event.seconds<=300);
  const scores=([own,other] as const).map(side=>{
    const first=halftime?.[side]??0, total=full?.[side]??0;
    return {side,first,second:total-first,total};
  });
  const [ours,theirs]=scores;
  let lastSide:MatchSide|undefined;
  let current:typeof goals=[];
  const runs={home:[] as typeof goals,away:[] as typeof goals};
  for(const row of goals){
    const side=row.event.side!;
    current=lastSide===side?[...current,row]:[row];
    if(current.length>runs[side].length)runs[side]=current;
    lastSide=side;
  }
  let peak:typeof full;
  let peakDiff=0;
  for(const row of goals){
    const diff=Math.abs(row.home-row.away);
    if(diff>peakDiff){peak=row;peakDiff=diff;}
  }
  let leadChanges=0;
  let lastLeader=0;
  const leadMoments=goals.filter(row=>{
    const leader=Math.sign(row[own]-row[other]);
    const changed=leader!==0&&lastLeader!==0&&leader!==lastLeader;
    if(changed)leadChanges++;
    if(leader)lastLeader=leader;
    return changed;
  });
  const discipline=(side:MatchSide,type:MatchEvent["type"])=>rows.filter(({event})=>event.side===side&&event.type===type).length;
  return {rows, goals, ours, theirs, own, other, runs, peak, peakDiff, halftime, full, leadChanges, leadMoments,
    hasSecond, played, leadTime, droughts:{home:drought("home"),away:drought("away")},
    openingSecond:secondEnd>=300?{own:openingSecond.filter(({event})=>event.side===own).length,
      other:openingSecond.filter(({event})=>event.side===other).length}:null,
    totals:scores.map(score=>({...score,warnings:discipline(score.side,"warning"),suspensions:discipline(score.side,"suspension"),
      penalties:goals.filter(({event})=>event.side===score.side&&event.type==="penalty").length})),
  };
}
