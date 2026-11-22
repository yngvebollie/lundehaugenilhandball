import {useState} from "react";
import {halftimeSummary, periodScores, resultTrend} from "@/lib/halftime";
import type {Fixture, ReportStatus} from "@/lib/match-journal";

export function PeriodResults({game, report}: {game:Fixture;report?:ReportStatus}) {
  const {half, second, full} = periodScores(game, report);
  if (!game.completed) return null;
  return <section className="grid">
    <h3>Omgangsresultat</h3>
    <table className="table halftime-table">
      <thead><tr><th scope="col">Lag</th><th scope="col">Til pause</th><th scope="col">2. omgang</th><th scope="col">Fulltid</th></tr></thead>
      <tbody>{[game.home || "Hjemmelag", game.away || "Bortelag"].map((name,index)=><tr key={index}>
        <th scope="row">{name}</th><td>{half?.[index]??"–"}</td><td>{second?.[index]??"–"}</td><td><strong>{full?.[index]??"–"}</strong></td>
      </tr>)}</tbody>
    </table>
    <small>{half?"2. omgang viser målene som ble scoret etter pausen.":"Pauseresultat mangler. Det kan registreres under Kampinformasjon i Kamprapport."}</small>
  </section>;
}

export function HalftimeStatistics({games, reports}: {games:Fixture[];reports:Record<string,ReportStatus>}) {
  const [competition,setCompetition] = useState("");
  const [metrics,setMetrics] = useState({W:true,D:true,L:true});
  const [sections,setSections] = useState({trend:true,half:true});
  const leagues = [...new Set(games.flatMap(game=>game.competition?[game.competition]:[]))].sort((a,b)=>a.localeCompare(b,"nb"));
  const filtered=games.filter(game=>!competition||game.competition===competition);
  const {rows,included,total} = halftimeSummary(filtered,reports);
  const trend=resultTrend(filtered);
  const labels={W:"Seier",D:"Uavgjort",L:"Tap"};
  const outcomes=(["W","D","L"] as const).filter(key=>metrics[key]);
  const max=Math.max(1,...outcomes.map(key=>trend.totals[key]));
  return <section className="grid">
    <header className="competition-heading"><h2>Kampdata</h2>
      <label>Liga<select value={competition} onChange={event=>setCompetition(event.target.value)}>
        <option value="">Alle ligaer</option>{leagues.map(league=><option key={league}>{league}</option>)}
      </select></label>
    </header>
    <fieldset className="match-data-options"><legend>Vis i kampdata</legend>
      <label><input type="checkbox" checked={sections.trend} onChange={e=>setSections({...sections,trend:e.target.checked})}/> Resultatutvikling</label>
      <label><input type="checkbox" checked={sections.half} onChange={e=>setSections({...sections,half:e.target.checked})}/> Fra pause til fulltid</label>
    </fieldset>
    <fieldset className="match-data-options"><legend>Resultater i grafene</legend>
      {(["W","D","L"] as const).map(key=><label key={key}><input type="checkbox" checked={metrics[key]} onChange={e=>setMetrics({...metrics,[key]:e.target.checked})}/> {labels[key]}</label>)}
    </fieldset>
    {sections.trend&&<section className="grid">
      <div><h3>Resultatutvikling</h3><small>{trend.series.length} av {trend.total} kamper med kjent resultat. Akkumulert fra første til siste kamp.</small></div>
      {!trend.series.length?<p>Ingen kamper med kjent resultat i dette utvalget.</p>:!outcomes.length?<p>Velg minst ett resultat for å vise grafen.</p>:<>
        <div className="match-data-legend">{outcomes.map(key=><span key={key} data-result={key}>{labels[key]} <b>{trend.totals[key]}</b></span>)}</div>
        <div className="player-list-scroll" role="region" aria-label="Akkumulerte resultater per kamp" tabIndex={0}><ol className="match-data-trend">
          {trend.series.map(({key,game,totals,outcome},index)=><li key={key}>
            <a href={"/match?game="+encodeURIComponent(game.id)} aria-label={"Kamp "+(index+1)+" · "+game.day+" · "+game.opponent+" · "+labels[outcome]+" · "+outcomes.map(k=>labels[k]+" "+totals[k]).join(", ")}>
              <span className="match-data-bars" aria-hidden="true">{outcomes.map(k=><span key={k} data-result={k} style={{height:(totals[k]/max)*100+"%"}}/>)}</span>
              <small>{index+1}</small>
            </a>
          </li>)}
        </ol></div>
      </>}
    </section>}
    {sections.half&&<section className="grid">
    <div><h3>Fra pause til fulltid</h3><small>{included} av {total} spilte kamper med gyldig pause- og sluttresultat</small></div>
    {!included?<p>Ingen kamper med gyldig pauseresultat i dette utvalget.</p>:<>
    {outcomes.length>0&&<div className="match-data-half">{([["W","Ledet"],["D","Uavgjort"],["L","Lå under"]] as const).map(([key,label])=>{
      const row=rows[key], count=row.W+row.D+row.L;
      return <div key={key}><strong>{label}</strong><div className="match-data-stack" aria-hidden="true">{outcomes.filter(k=>row[k]>0).map(k=><span key={k} data-result={k} style={{width:row[k]/count*100+"%"}}>{row[k]}</span>)}</div></div>;
    })}</div>}
    <table className="table halftime-table">
      <thead><tr><th scope="col">Ved pause</th><th scope="col">Seier</th><th scope="col">Uavgjort</th><th scope="col">Tap</th><th scope="col">Seier %</th></tr></thead>
      <tbody>{([["W","Ledet"],["D","Uavgjort"],["L","Lå under"]] as const).map(([key,label])=>{
        const row=rows[key], count=row.W+row.D+row.L;
        return <tr key={key}><th scope="row">{label}</th><td>{row.W}</td><td>{row.D}</td><td>{row.L}</td>
          <td>{count?(row.W/count).toLocaleString("nb-NO",{style:"percent",maximumFractionDigits:1}):"–"}</td></tr>;
      })}</tbody>
    </table></>}
    </section>}
    <small>Resultatene vises fra eget lags perspektiv. Ved valg av alle ligaer telles hvert oppgjør én gang.</small>
  </section>;
}
