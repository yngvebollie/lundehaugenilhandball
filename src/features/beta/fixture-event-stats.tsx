import {useState} from "react";
import {Activity, List, Timer} from "lucide-react";
import {analyzeFixture,eventSecond} from "@/lib/fixture-analysis";
import {fixtureScorers} from "@/lib/fixture-events";
import {eventNames,formatMatchTime,type LiveMatch,type MatchSide} from "@/lib/live-match";
import {useLiveMatchStorage} from "./live-match-storage";

type Analysis=ReturnType<typeof analyzeFixture>;
const percent=(n:number)=>n.toLocaleString("nb-NO",{style:"percent",maximumFractionDigits:0});

export function FixtureEventStats({match,ownSide,officialScore}:{match:LiveMatch;ownSide:MatchSide;officialScore?:string|null}){
  const analysis=analyzeFixture(match,ownSide);
  if(!analysis.rows.some(({event})=>event.type!=="clock"))return <section className="event-panel"><h2>Kampanalyse</h2>
    {officialScore&&<p>Registrert sluttresultat: {match.home.name} {officialScore} {match.away.name}.</p>}
    <p>Legg til kamphendelser for å se målutvikling, målrekker og uttelling på 7-meter.</p>
  </section>;
  const loggedScore=[ownSide==="home"?analysis.ours.total:analysis.theirs.total,ownSide==="home"?analysis.theirs.total:analysis.ours.total].join("-");
  const normalizedScore=officialScore?.replace(/\s+/g,"").replace(/[:–]/g,"-");
  return <div className="event-dashboard">
    <header className="event-dashboard-title"><div><h2>Kampen i tall</h2><p>{match[ownSide].name} · {analysis.rows.length} loggførte hendelser</p></div><Activity size={25} aria-hidden="true"/></header>
    {normalizedScore&&normalizedScore!==loggedScore&&<p className="event-panel" role="status">Kampresultatet er {officialScore}, mens hendelsesloggen gir {loggedScore}. Analysen under bygger på hendelsene som er registrert.</p>}
    {analysis.totals.some(row=>row.penaltyAttempts||row.redCards)&&<section className="event-panel">
      <h3>7-meter og røde kort</h3>
      <dl className="event-insights">{analysis.totals.map(row=><div key={row.side}><dt>{match[row.side].name}</dt>
        <dd>{row.penaltyAttempts?row.penalties+" av "+row.penaltyAttempts+" på 7-meter ("+percent(row.penalties/row.penaltyAttempts)+")":"Ingen 7-metere med registrert utfall"} · Røde kort: {row.redCards}</dd></div>)}</dl>
    </section>}
    <MatchMomentum match={match} analysis={analysis}/>
    <PeriodPanels match={match} analysis={analysis}/>
    <ScorerPanels match={match} analysis={analysis}/>
    <MatchReading match={match} analysis={analysis}/>
  </div>;
}

export function FixtureReportReading({game,team,user,ownSide}:{game:string;team:string;user:string;ownSide:MatchSide}){
  const storage=useLiveMatchStorage(team,user,game);
  const match=storage.rows.find(row=>row.id===game)?.document;
  if(!match?.events.length)return null;
  return <div className="event-dashboard"><MatchReading match={match} analysis={analyzeFixture(match,ownSide)}/></div>;
}

function MatchMomentum({match,analysis}:{match:LiveMatch;analysis:Analysis}){
  const {rows,goals,own,other}=analysis;
  const [selected,setSelected]=useState<number|null>(null);
  const period=Math.max((match.periodMinutes??20)*60,...rows.filter(row=>row.event.half===1).map(row=>row.event.seconds));
  const duration=Math.max(period*2,...rows.map(row=>eventSecond(row.event,period)));
  const peak=Math.max(5,Math.ceil(Math.max(0,...rows.flatMap(row=>[row.home,row.away]))/5)*5);
  const x=(seconds:number)=>38+seconds/duration*510;
  const y=(score:number)=>151-score/peak*115;
  const eventIndex=Math.min(selected??rows.length-1,rows.length-1);
  const active=rows[eventIndex];
  const activeTime=eventSecond(active.event,period);
  const ticks=[0,period/2,period,period*1.5,duration];
  const axis=[0,Math.round(peak/2),peak];
  const summaries=([own,other] as const).map(side=>{
    const steps=goals.map(row=>"H"+x(eventSecond(row.event,period))+"V"+y(row[side])).join("");
    return {side,path:"M"+x(0)+" "+y(0)+steps+"H"+x(duration)};
  });
  const label=(row:typeof active)=>row.event.type==="clock"?row.event.label||"Kampklokke":eventNames[row.event.type];
  return <section className="event-panel">
    <header className="event-section-heading"><div><h3>Målutvikling</h3><p>Akkumulert målscore, fra første hendelse til fulltid</p></div>
      <div className="event-team-key">{summaries.map(({side})=><span key={side} data-team={side===own?"own":"other"}>{match[side].name}</span>)}</div></header>
    <svg className="event-score-chart" viewBox="0 0 572 176" role="img" aria-label="Trappelinjer for lagenes målscore gjennom kampen">
      <rect x={x(period)} y={23} width={x(duration)-x(period)} height={128} className="event-half-shade"/>
      {axis.map(score=><g key={score}><line x1={38} y1={y(score)} x2={548} y2={y(score)} className="event-gridline"/>
        <text x={29} y={y(score)+4} textAnchor="end">{score}</text></g>)}
      <line x1={x(period)} y1={23} x2={x(period)} y2={151} className="event-pause-line"/>
      <text x={x(period)} y={17} textAnchor="middle">Pause</text>
      {summaries.map(({side,path})=><path key={side} className="event-score-line" data-team={side===own?"own":"other"} d={path}/>)}
      <line x1={x(activeTime)} y1={23} x2={x(activeTime)} y2={151} className="event-selection-line"/>
      {summaries.map(({side})=><circle key={side} cx={x(activeTime)} cy={y(active[side])} r={4} data-team={side===own?"own":"other"}/>)}
      {ticks.map((seconds,i)=><text key={i} x={x(seconds)} y={170} textAnchor="middle">{Math.floor(seconds/60)}′</text>)}
    </svg>
    <div className="event-moment" aria-live="polite">
      <div><small>{active.event.half}. omgang · {formatMatchTime(active.event.seconds)}</small>
        <strong>{label(active)}{active.event.playerName?" · "+active.event.playerName:active.event.side?" · "+match[active.event.side].name:""}</strong></div>
      <b aria-label={match.home.name+" "+active.home+" – "+active.away+" "+match.away.name}>{active.home}–{active.away}</b>
    </div>
    <label className="event-scrub">Velg hendelse<input aria-label="Velg hendelse på tidslinjen" type="range" min={0} max={rows.length-1} value={eventIndex} onChange={e=>setSelected(Number(e.target.value))}/></label>
    <h4>Hendelser langs tidslinjen</h4>
    <div className="event-horizontal-scroll" role="region" aria-label="Vannrett tidslinje" tabIndex={0}>
      <div className="event-rail" style={{minWidth:Math.max(1,rows.length)*38}}>
        {rows.map((row,index)=>{
          const side=row.event.side;
          const periodStart=index>0&&rows[index-1].event.half!==row.event.half;
          return <button key={row.event.id} type="button" className={periodStart?"event-start-half":""} data-team={side===own?"own":side===other?"other":"neutral"}
            aria-pressed={index===eventIndex} aria-label={row.event.half+". omgang, "+formatMatchTime(row.event.seconds)+", "+label(row)+", "+row.home+"–"+row.away}
            title={label(row)+" · "+row.home+"–"+row.away} onClick={()=>setSelected(index)}>
            {periodStart&&<span className="event-rail-pause">Pause</span>}
            <span className="event-dot">{row.event.type==="warning"?"▣":row.event.type==="suspension"?"2":row.event.type==="timeout"?"T":row.event.type==="clock"?"│":"●"}</span>
            <small>{Math.floor(eventSecond(row.event,period)/60)}′</small>
          </button>;
        })}
      </div>
    </div>
  </section>;
}

function PeriodPanels({match,analysis}:{match:LiveMatch;analysis:Analysis}){
  const {ours,theirs,own,other,totals}=analysis;
  const max=Math.max(1,ours.first,ours.second,theirs.first,theirs.second);
  return <section className="event-panel">
    <header className="event-section-heading"><div><h3>Omgang for omgang</h3><p>Samme målskala i begge omganger</p></div><Timer size={21} aria-hidden="true"/></header>
    <div className="event-period-grid">
      {(["first","second"] as const).map((period,i)=><div className="event-period" key={period}>
        <div><span>{i+1}. omgang</span><strong>{i===1&&!analysis.hasSecond?"–":ours[period]+"–"+theirs[period]}</strong></div>
        {i===1&&!analysis.hasSecond?<p>Ingen hendelser i andre omgang.</p>:totals.map(team=><div className="event-period-team" key={team.side} data-team={team.side===own?"own":"other"}>
          <span>{match[team.side].name}</span><b>{team[period]}</b>
          <span className="event-bar-track" aria-hidden="true"><span style={{width:(team[period]/max)*100+"%"}}/></span>
        </div>)}
      </div>)}
    </div>
    <table className="table event-discipline"><thead><tr><th scope="col">Kampstatistikk</th><th scope="col">{match[own].name}</th><th scope="col">{match[other].name}</th></tr></thead>
      <tbody>{([["7 m-mål","penalties"],["Gule kort","warnings"],["2 min","suspensions"]] as const).map(([label,key])=>
        <tr key={key}><th scope="row">{label}</th><td>{totals[0][key]}</td><td>{totals[1][key]}</td></tr>)}
        <tr><th scope="row">Lengste målrekke</th><td>{analysis.runs[own].length}</td><td>{analysis.runs[other].length}</td></tr>
        <tr><th scope="row">Lengste periode uten mål</th><td>{formatMatchTime(analysis.droughts[own].seconds)}</td><td>{formatMatchTime(analysis.droughts[other].seconds)}</td></tr>
      </tbody></table>
  </section>;
}

function ScorerPanels({match,analysis}:{match:LiveMatch;analysis:Analysis}){
  const {own,other}=analysis;
  const [side,setSide]=useState<MatchSide>(own);
  const players=fixtureScorers(match.events).filter(p=>p.side===side&&(p.playerId||p.number!==undefined||p.name!=="Ukjent målscorer"));
  const max=Math.max(1,...players.map(p=>p.first+p.second));
  return <section className="event-panel">
    <header className="event-section-heading"><h3>Mål per spiller</h3><List size={21} aria-hidden="true"/></header>
    <nav className="workspace-tabs" aria-label="Lagenes målscorere">
      {[own,other].map(team=><button key={team} className={side===team?"current":""} type="button" aria-pressed={side===team} onClick={()=>setSide(team)}>{match[team as MatchSide].name}</button>)}
    </nav>
    {!players.length?<p>Ingen mål med registrert spiller eller draktnummer for {match[side].name}.</p>:<div className="event-player-list">
      {players.map(p=><div className="event-player" key={p.playerId??[p.number,p.name].join(":")} data-team={side===own?"own":"other"}>
        <div><strong>{p.playerId?<a href={"/spillere?athlete="+encodeURIComponent(p.playerId)}>{p.number!==undefined?"#"+p.number+" ":""}{p.name}</a>:p.name==="Ukjent målscorer"?"#"+p.number:[p.number===undefined?"":"#"+p.number,p.name].filter(Boolean).join(" ")}</strong>
          <small>{p.first} i 1. omgang · {p.second} i 2. omgang</small></div>
        <span className="event-bar-track" aria-hidden="true"><span style={{width:(p.first+p.second)/max*100+"%"}}/></span>
        <b aria-label={p.first+p.second+" mål"}>{p.first+p.second}</b>
      </div>)}
    </div>}
  </section>;
}

function MatchReading({match,analysis}:{match:LiveMatch;analysis:Analysis}){
  const {goals,ours,theirs,own,other,runs,peak,peakDiff,leadMoments,hasSecond}=analysis;
  const ownName=match[own].name,otherName=match[other].name;
  const score=(row:{home:number;away:number})=>row[own]+"–"+row[other];
  const clock=(row:(typeof goals)[number])=>row.event.half+". omgang "+formatMatchTime(row.event.seconds);
  const run=runs[own],moment=run.at(-1);
  const opposingRun=runs[other],thirdConceded=opposingRun[2];
  const response=thirdConceded?goals.slice(goals.indexOf(thirdConceded)+1).find(row=>row.event.side===own):undefined;
  const after=analysis.halftime;
  const secondStart=goals.find(row=>row.event.half===2);
  const player=fixtureScorers(match.events).find(p=>p.side===own&&p.name!=="Ukjent målscorer");
  const halfDiff=ours.first-theirs.first,finalDiff=ours.total-theirs.total;
  const halfSummary=halfDiff===0?"sto likt":halfDiff>0?"ledet":"lå under";
  const secondSummary=finalDiff-halfDiff;
  return <section className="event-panel event-reading">
    <header className="event-section-heading"><div><h3>Trenerinnsikt for kampen</h3><p>Stillingen i teksten oppgis med {ownName} først.</p></div></header>
    {!goals.length?<p>Loggen inneholder ingen registrerte mål.</p>:<>
      <p>{ownName} {hasSecond||match.finalized?halfSummary+" "+ours.first+"–"+theirs.first+" til pause":"står på "+ours.total+"–"+theirs.total+" i den registrerte delen av første omgang"}.
        {hasSecond&&" I andre omgang scoret laget "+ours.second+" mot "+theirs.second+" for "+otherName+"."}
        {hasSecond&&(secondSummary===0?" Målforskjellen var uendret etter pausen.":secondSummary>0?" Målforskjellen bedret seg med "+secondSummary+" mål.":" Målforskjellen svekket seg med "+Math.abs(secondSummary)+" mål.")}
        {match.finalized&&" Sluttstillingen i loggen ble "+ours.total+"–"+theirs.total+"."}</p>
      <dl className="event-insights">
        {secondStart&&after&&<div><dt>Første mål etter pause</dt><dd>{match[secondStart.event.side!].name} scoret til {score(secondStart)} ({clock(secondStart)}).</dd></div>}
        {moment&&<div><dt>{ownName}s lengste målrekke</dt><dd>{run.length} på rad fra {clock(run[0])} til {clock(moment)}, med {score(moment)} etter siste mål.</dd></div>}
        {thirdConceded&&<div><dt>Respons på {otherName}s lengste målrekke</dt><dd>{otherName} scoret {opposingRun.length} på rad. Det tredje målet kom ved {clock(thirdConceded)}, til {score(thirdConceded)}. {response?ownName+" scoret neste gang ved "+clock(response)+", til "+score(response)+".":match.finalized?ownName+" scoret ikke igjen.":"Se resten av hendelsesloggen for videre utvikling."}</dd></div>}
        {peak&&<div><dt>Største målforskjell</dt><dd>{peakDiff} mål ved {score(peak)} ({clock(peak)}).</dd></div>}
        {analysis.openingSecond&&<div><dt>Første fem minutter etter pause</dt><dd>{ownName} scoret {analysis.openingSecond.own} mål og {otherName} scoret {analysis.openingSecond.other}.</dd></div>}
        {analysis.played>0&&<div><dt>Tid i ledelse</dt><dd>{ownName} ledet i {formatMatchTime(analysis.leadTime.ahead)}, lå under i {formatMatchTime(analysis.leadTime.behind)} og sto likt i {formatMatchTime(analysis.leadTime.tied)}.</dd></div>}
        {([own,other] as const).map(side=>{
          const drought=analysis.droughts[side];
          return drought.seconds>0&&<div key={side}><dt>Lengste måltørke for {match[side].name}</dt>
            <dd>{formatMatchTime(drought.seconds)} uten scoring, fra {formatMatchTime(drought.from)} til {formatMatchTime(drought.to)} samlet spilletid.</dd></div>;
        })}
        {leadMoments.length>0&&<div><dt>Ledelsen skiftet {leadMoments.length} {leadMoments.length===1?"gang":"ganger"}</dt><dd>Siste skifte kom ved {score(leadMoments.at(-1)!)} ({clock(leadMoments.at(-1)!)}).</dd></div>}
      </dl>
      {player&&<p>{player.name} scoret {player.first+player.second} av lagets {ours.total} mål ({percent((player.first+player.second)/ours.total)}).</p>}
    </>}
    <p className="event-analysis-note">Pausen regnes utenom spilletiden. Tidstall fra en logg med minuttpresisjon er omtrentlige. Uten kjent sluttid for omgangen brukes siste registrerte hendelse. Vurder årsakene sammen med video eller trenernotater.</p>
    <details><summary>Hva kan vi følge opp på trening?</summary><ul>
      {analysis.openingSecond&&analysis.openingSecond.own<analysis.openingSecond.other&&<li>Øv på de første angrepene etter pause og avtal hvem som sikrer returløpet ved balltap.</li>}
      {thirdConceded&&<li>Se videoklippene rundt målrekken. Sjekk om baklengsmålene kommer etter balltap, svakt returløp eller avslutninger fra samme område. Øv på et enkelt angrep som laget kan gå til under press.</li>}
      {analysis.totals[0].suspensions>0&&<li>Se på angrep og forsvar under utvisning. Marker start og slutt på undertallet i videoen før dere vurderer hvilke valg som fungerte.</li>}
      <li>Registrer angrep, skudd og balltap for å skille angrepstempo og sjanseskaping fra scoringsprosent. Marker gjerne kontringer og etablert spill separat.</li>
    </ul></details>
  </section>;
}
