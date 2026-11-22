import {isMatchGoal, matchTimeline, type LiveMatch, type MatchEvent, type MatchSide} from "./live-match";

export function eventSecond(event:MatchEvent, period:number) {
  return (event.half-1)*period+event.seconds;
}

export function analyzeFixture(match:LiveMatch, own:MatchSide) {
  const rows=matchTimeline(match.events);
  const other:MatchSide=own==="home"?"away":"home";
  const goals=rows.filter(({event})=>isMatchGoal(event)&&event.side);
  const halftime=goals.filter(({event})=>event.half===1).at(-1);
  const full=goals.at(-1);
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
    hasSecond:rows.some(({event})=>event.half===2),
    totals:scores.map(score=>({...score,warnings:discipline(score.side,"warning"),suspensions:discipline(score.side,"suspension"),
      penalties:goals.filter(({event})=>event.side===score.side&&event.type==="penalty").length})),
  };
}
