import {useEffect,useMemo,useRef,useState} from "react";
import {db,demo} from "@/lib/beta";
import {ownMatchSide,seasonMatchStatistics,type SeasonLog,type StreakGroup} from "@/lib/season-match-statistics";
import {formatMatchTime} from "@/lib/live-match";
import type {Fixture,ReportStatus} from "@/lib/match-journal";
import type {Wld} from "@/lib/match-result";

type Props={team:string;games:Fixture[];reports:Record<string,ReportStatus>;teams:{id:string;name:string}[];history:number};
type Analytics=ReturnType<typeof seasonMatchStatistics>;
const resultLabels={W:"Seier",D:"Uavgjort",L:"Tap"};
const breakLabels={W:"Ledet",D:"Sto likt",L:"Lå under"};
const results=["W","D","L"] as const;
const streaks=["0–2","3","4","5+"] as const;
const percent=(n:number,d:number)=>d?(n/d).toLocaleString("nb-NO",{style:"percent",maximumFractionDigits:0}):"–";
const average=(n:number,d:number)=>(n/d).toLocaleString("nb-NO",{minimumFractionDigits:1,maximumFractionDigits:1});
const count=(r:Record<Wld,number>)=>r.W+r.D+r.L;
const score=(r:number[]|null)=>r?.join("–")??"–";

export function SeasonMatchStatistics({team,games,reports,teams,history}:Props){
  const [teamFilter,setTeamFilter]=useState("");
  const [league,setLeague]=useState("");
  const [venue,setVenue]=useState("");
  const [details,setDetails]=useState<{kind:"pause";value:Wld}|{kind:"streak";value:StreakGroup}|null>(null);
  const detailHeading=useRef<HTMLHeadingElement>(null);
  const [logs,setLogs]=useState<Record<string,SeasonLog>>({});
  const [fetchState,setFetchState]=useState<"loading"|"ready"|"error">("loading");
  const leagues=[...new Set(games.filter(g=>!teamFilter||g.registration===teamFilter).flatMap(g=>g.competition?[g.competition]:[]))].sort((a,b)=>a.localeCompare(b,"nb"));
  useEffect(()=>{
    let active=true;
    setFetchState("loading");
    setLogs({});
    const read=async()=>{
      const ids=games.filter(g=>g.completed).map(g=>g.id);
      const next:Record<string,SeasonLog>={};
      if(!demo)for(let index=0;index<ids.length;index+=80){
        const {data}=await db!.from("beta_live_match_logs").select("id,document").eq("team",team)
          .in("id",ids.slice(index,index+80)).throwOnError();
        for(const row of data)next[row.id]=row.document as SeasonLog;
      }
      if(active){setLogs(next);setFetchState("ready");}
    };
    void read().catch(()=>{if(active)setFetchState("error");});
    return()=>{active=false;};
  },[games,team]);
  const stats=useMemo(()=>seasonMatchStatistics(games.filter(g=>(!teamFilter||g.registration===teamFilter)&&
    (!league||g.competition===league)&&(!venue||ownMatchSide(g)===venue)),reports,logs),[games,reports,logs,teamFilter,league,venue]);
  const activeRows=details?stats.rows.filter(row=>details.kind==="pause"?row.atBreak===details.value:row.streak===details.value):stats.rows;
  const confirmed=stats.rows.length;
  const totals=stats.rows.reduce((n,row)=>({...n,[row.final]:n[row.final]+1}),{W:0,D:0,L:0});
  const goalTotals=stats.rows.reduce(([a,b],row)=>[a+row.full[0],b+row.full[1]],[0,0]);
  const affect=stats.rows.filter(row=>row.episodes>0);
  const inspect=(next:NonNullable<typeof details>)=>{
    setDetails(current=>current?.kind===next.kind&&current.value===next.value?null:next);
    detailHeading.current?.scrollIntoView({block:"nearest"});
    detailHeading.current?.focus({preventScroll:true});
  };
  return <section className="event-dashboard season-match-data">
    <header className="event-dashboard-title"><div><h2>Statistikk kamper</h2><p>{stats.total} spilte oppgjør · {confirmed} med kjent sluttresultat</p></div></header>
    <div className="event-panel season-filters">
      <label>Lag<select aria-label="Lag" value={teamFilter} onChange={e=>{setTeamFilter(e.target.value);setLeague("");setDetails(null);}}>
        <option value="">Alle lag</option>{teams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Liga<select aria-label="Liga" value={league} onChange={e=>{setLeague(e.target.value);setDetails(null);}}>
        <option value="">Alle ligaer</option>{leagues.map(name=><option key={name}>{name}</option>)}</select></label>
      <label>Bane<select aria-label="Bane" value={venue} onChange={e=>{setVenue(e.target.value);setDetails(null);}}>
        <option value="">Hjemme og borte</option><option value="home">Hjemme</option><option value="away">Borte</option></select></label>
    </div>
    <div className="season-key-stats">
      <div><small>Seier · uavgjort · tap</small><strong>{totals.W} · {totals.D} · {totals.L}</strong></div>
      <div><small>Mål for · mål imot</small><strong>{goalTotals[0]} · {goalTotals[1]}</strong></div>
      <div><small>Seier etter pauseledelse</small><strong>{percent(stats.pause.W.W,count(stats.pause.W))}</strong><small>{stats.pause.W.W} av {count(stats.pause.W)} kamper</small></div>
    </div>
    {fetchState==="ready"&&confirmed>0&&<CoachingInsights stats={stats}/>}
    {stats.rows.length>0&&<ResultProgress rows={stats.rows} history={history}/>}
    <section className="event-panel">
      <header className="event-section-heading"><div><h3>Fra pause til fulltid</h3>
        <p>{stats.pauseCoverage} av {stats.total} kamper med gyldig pause- og sluttresultat</p></div></header>
      <div className="match-data-legend">{results.map(key=><span data-result={key} key={key}>{resultLabels[key]}</span>)}</div>
      {results.map(key=><OutcomeBar key={key} title={breakLabels[key]+" til pause"} counts={stats.pause[key]}
        active={details?.kind==="pause"&&details.value===key} onSelect={()=>inspect({kind:"pause",value:key})}/>)}
    </section>
    <section className="event-panel">
      <header className="event-section-heading"><div><h3>Mål per fem minutter</h3>
        <p>{stats.timed} av {stats.total} kamper med kontrollert hendelseslogg og kjent omgangslengde. Gjennomsnitt per kamp.</p></div></header>
      {fetchState==="loading"?<p role="status">Henter hendelseslogger …</p>:fetchState==="error"?<p role="alert">Hendelsesloggene kunne ikke hentes.</p>:<IntervalChart stats={stats}/>}
      {stats.timed>0&&<div className="season-key-stats">
        <div><small>Vår lengste måltørke</small><strong>{formatMatchTime(stats.timeStats.longestOwn)}</strong></div>
        <div><small>Motstanderens lengste måltørke</small><strong>{formatMatchTime(stats.timeStats.longestOpp)}</strong></div>
        <div><small>Snittid i ledelse / likt / bak</small><strong>{(["ahead","tied","behind"] as const)
          .map(key=>formatMatchTime(Math.round(stats.timeStats[key]/stats.timed))).join(" / ")}</strong></div>
      </div>}
    </section>
    <section className="event-panel">
      <header className="event-section-heading"><div><h3>Når motstanderen scorer på rad</h3>
        <p>{stats.streakCoverage} av {stats.total} kamper med kontrollert hendelseslogg. Hver kamp telles én gang, etter motstanderens lengste rekke.</p></div></header>
      <p>Minst tre på rad i <strong>{stats.affected} kamper</strong>. Vi tapte <strong>{affect.filter(row=>row.final==="L").length} av {stats.affected}</strong> av dem ({percent(affect.filter(row=>row.final==="L").length,stats.affected)}).</p>
      {stats.recoveryKnown>0&&<p>Etter første tremålsrekke scoret vi innen to spilleminutter i <strong>{stats.withinTwo} av {stats.recoveryKnown}</strong> kamper med målt tid til vårt neste mål.</p>}
      {stats.noResponse>0&&<p>I <strong>{stats.noResponse} av {stats.affected}</strong> kamper scoret vi ikke igjen etter motstanderens tredje mål på rad første gang dette skjedde.</p>}
      {streaks.map(key=><OutcomeBar key={key} title={key+" mål på rad"} counts={stats.streaks[key]}
        active={details?.kind==="streak"&&details.value===key} onSelect={()=>inspect({kind:"streak",value:key})}/>)}
    </section>
    <section className="event-panel" aria-label="Kampgrunnlag">
      <header className="event-section-heading"><h3 ref={detailHeading} tabIndex={-1}>{details?details.kind==="pause"?breakLabels[details.value]+" til pause":details.value+" mål på rad":"Kampgrunnlag"}</h3>
        {details&&<button type="button" className="btn" onClick={()=>setDetails(null)}>Vis alle kamper</button>}</header>
      {details&&<p>{activeRows.length} kamper i valgt gruppe.</p>}
      {activeRows.length?<div className="player-list-scroll" role="region" aria-label="Kampoversikt med pauseresultat" tabIndex={0}>
        <table className="table season-match-list"><thead><tr><th scope="col">Oppgjør</th><th scope="col">Pause</th><th scope="col">2. omg.</th><th scope="col">Slutt</th><th scope="col">Motstander på rad</th><th scope="col">Vårt neste mål</th></tr></thead>
          <tbody>{activeRows.map(row=><tr key={row.key}>
            <th scope="row"><a href={"/match?"+new URLSearchParams({game:row.game.id,section:"events",...(history?{history:String(history)}:{})})}>{row.game.home||"Hjemmelag"} – {row.game.away||"Bortelag"}</a>
              <small>{row.game.day} · {teams.find(t=>t.id===row.game.registration)?.name||row.game.competition}</small></th>
            <td>{score(row.half)}</td><td>{row.half?score(row.full.map((goals,i)=>goals-row.half![i])):"–"}</td><td><strong>{score(row.full)}</strong></td>
            <td>{row.streak?row.max:"–"}{row.third&&row.firstRunScore&&<small>3. mål: {row.third.half}. omg. {formatMatchTime(row.third.seconds)} · {row.firstRunScore[row.side]}–{row.firstRunScore[row.side==="home"?"away":"home"]}</small>}</td>
            <td>{row.noResponse?"Ingen flere mål":row.recovery===null?"–":formatMatchTime(row.recovery)}</td>
          </tr>)}</tbody>
        </table>
      </div>:<p>Ingen kamper i dette utvalget.</p>}
      <small>Stillinger i tabellen vises fra eget lags perspektiv. Kamper med motstridende data utelates fra berørte beregninger. Pause regnes utenom spilletiden. Importerte tider kan ha minuttpresisjon.</small>
    </section>
  </section>;
}

function CoachingInsights({stats}:{stats:Analytics}){
  const {timeStats,openings}=stats;
  const led=count(stats.pause.W);
  const withoutRun=stats.streaks["0–2"];
  const withRunLosses=stats.streaks["3"].L+stats.streaks["4"].L+stats.streaks["5+"].L;
  const openingDifference=(openings.second-openings.first)/openings.games;
  return <section className="event-panel event-reading">
    <header className="event-section-heading"><div><h3>Trenerinnsikt</h3><p>Observasjoner og forslag basert på kampene i valgt filter.</p></div></header>
    <dl className="event-insights">
      {timeStats.seconds>0&&<div><dt>Måltempo</dt><dd>{average(timeStats.goals,timeStats.seconds/600)} mål for og {average(timeStats.against,timeStats.seconds/600)} mål imot per ti spilleminutter i {stats.timed} kamper. Se på periodene med flest baklengsmål og sjekk returløp, balltap og hvor motstanderen avslutter.</dd></div>}
      {openings.games>0&&<div><dt>Starten på omgangene</dt><dd>Målforskjellen de første fem minuttene var i snitt {(openings.first/openings.games).toLocaleString("nb-NO",{maximumFractionDigits:1})} i første omgang og {(openings.second/openings.games).toLocaleString("nb-NO",{maximumFractionDigits:1})} i andre omgang, målt i de samme {openings.games} kampene. {openingDifference<0?"Avtal første angrep og hvem som sikrer returløpet før dere går ut etter pause.":"Se hvilke valg og oppstillinger som fungerer etter pause, og prøv dem ved kampstart."}</dd></div>}
      {led>0&&<div><dt>Forsvare en pauseledelse</dt><dd>Vi beholdt seieren i {stats.pause.W.W} av {led} kamper med pauseledelse. {stats.pause.W.W<led?"Gå gjennom når ledelsen forsvant, og avtal hva laget skal gjøre ved to raske baklengsmål.":"Se gjennom de jevneste kampene for å finne hvilke valg som bidro til at ledelsen holdt."}</dd></div>}
      {stats.affected>0&&<div><dt>Respons på målrekker</dt><dd>Vi tapte {withRunLosses} av {stats.affected} kamper med minst tre baklengsmål på rad{count(withoutRun)>0&&", mot "+withoutRun.L+" av "+count(withoutRun)+" med høyst to"}. Avtal et enkelt angrep og tydelig retursikring etter to baklengsmål. Bruk kampgrunnlaget til å finne klippene og vurdere om timeout eller et bytte er aktuelt.</dd></div>}
    </dl>
    <p className="event-analysis-note">Måltempo måler hvor ofte det scores. For å vurdere angrepstempo og effektivitet trengs også antall angrep, balltap og skudd. Resultatforskjeller viser mønstre i utvalget. Bruk video eller trenernotater for å vurdere årsaker, særlig når få kamper inngår.</p>
  </section>;
}

function OutcomeBar({title,counts,active,onSelect}:{title:string;counts:Record<Wld,number>;active:boolean;onSelect:()=>void}){
  const total=count(counts);
  return <div className="season-outcome">
    <div className="season-outcome-title"><button className="btn" type="button" disabled={!total} aria-pressed={active} onClick={onSelect}>{title} · {total}</button>
      {total>0&&<span>{percent(counts.W,total)} seier · {percent(counts.L,total)} tap</span>}</div>
    <div className="match-data-stack" role="img" aria-label={title+": "+results.map(key=>resultLabels[key]+" "+counts[key]).join(", ")}>
      {results.filter(key=>counts[key]>0).map(key=><span key={key} data-result={key} style={{width:counts[key]/total*100+"%"}}>{counts[key]}</span>)}
    </div>
  </div>;
}

function ResultProgress({rows,history}:{rows:Analytics["rows"];history:number}){
  const totals={W:0,D:0,L:0};
  const steps=[...rows].sort((a,b)=>a.game.day.localeCompare(b.game.day)||(a.game.start_time||"").localeCompare(b.game.start_time||"")||a.key.localeCompare(b.key))
    .map(row=>{totals[row.final]++;return {row,totals:{...totals}};});
  const max=Math.max(1,...Object.values(totals));
  return <section className="event-panel">
    <header className="event-section-heading"><div><h3>Resultatutvikling</h3><p>Akkumulerte seire, uavgjorte og tap fra første til siste kamp.</p></div></header>
    <div className="match-data-legend">{results.map(key=><span data-result={key} key={key}>{resultLabels[key]} {totals[key]}</span>)}</div>
    <div className="player-list-scroll" role="region" aria-label="Resultatutvikling kamp for kamp" tabIndex={0}>
      <ol className="match-data-trend">{steps.map(({row,totals},index)=><li key={row.key}>
        <a href={"/match?"+new URLSearchParams({game:row.game.id,section:"events",...(history?{history:String(history)}:{})})}
          aria-label={row.game.day+" mot "+row.game.opponent+" · "+resultLabels[row.final]+" · "+results.map(key=>resultLabels[key]+" "+totals[key]).join(", ")}>
          <span className="match-data-bars" aria-hidden="true">{results.map(key=><span key={key} data-result={key} style={{height:totals[key]/max*100+"%"}}/>)}</span>
          <small>{index+1}</small>
        </a>
      </li>)}</ol>
    </div>
  </section>;
}

function IntervalChart({stats}:{stats:Analytics}){
  const intervals=stats.intervals;
  if(!intervals.length)return <p>Ingen sammenlignbare femminuttersintervaller i utvalget.</p>;
  const maximum=Math.max(1,...intervals.flatMap(bin=>[bin.goals/bin.games,bin.against/bin.games]));
  const balance=(bin:typeof intervals[number])=>(bin.goals-bin.against)/bin.games;
  const sorted=[...intervals].sort((a,b)=>balance(b)-balance(a));
  const best=sorted[0],weakest=sorted.at(-1)!;
  return <>
    <div className="event-team-key"><span data-team="own">Mål for</span><span data-team="other">Mål imot</span></div>
    <div className="season-interval-groups">{([1,2] as const).map(half=><div key={half} className="season-interval-half">
      <h4>{half}. omgang</h4>
      {intervals.filter(bin=>bin.half===half).map(bin=><div className="season-interval" key={bin.from}>
        <div><strong>{bin.from}–{bin.to} min</strong><small>{bin.games} kamper</small></div>
        {(["goals","against"] as const).map(field=><div key={field} data-team={field==="goals"?"own":"other"} className="season-interval-bar"
          aria-label={(field==="goals"?"Mål for":"Mål imot")+" "+average(bin[field],bin.games)+" per kamp"}>
          <div className="event-bar-track" aria-hidden="true"><span style={{width:bin[field]/bin.games/maximum*100+"%"}}/></div>
          <b title={bin[field]+" mål totalt"}>{average(bin[field],bin.games)}</b>
        </div>)}
      </div>)}
    </div>)}</div>
    {best!==weakest&&<p>Størst målforskjell i vår favør kommer i <b>{best.half}. omgang, {best.from}–{best.to} min</b> ({best.goals}–{best.against} på {best.games} kamper).
      Det svakeste intervallet er <b>{weakest.half}. omgang, {weakest.from}–{weakest.to} min</b> ({weakest.goals}–{weakest.against} på {weakest.games} kamper).</p>}
  </>;
}
