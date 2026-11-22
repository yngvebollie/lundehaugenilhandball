import {periodScores} from "@/lib/halftime";
import type {Fixture, ReportStatus} from "@/lib/match-journal";

export function PeriodResults({game, report}: {game:Fixture;report?:ReportStatus}) {
  const {half, second, full} = periodScores(game, report);
  if (!game.completed) return null;
  const names=[game.home || "Hjemmelag",game.away || "Bortelag"];
  const ownIndex=game.opponent.trim().toLocaleLowerCase("nb-NO")===game.away?.trim().toLocaleLowerCase("nb-NO")?0:1;
  const maximum=Math.max(1,...(half??[]),...(second??[]));
  return <section className="event-dashboard">
    <div className="event-panel">
    <header className="event-section-heading"><div><h3>Omgangsresultat</h3><p>{names.join(" – ")}</p></div></header>
    {half&&second&&<div className="event-period-grid">
      {[half,second].map((values,index)=><div className="event-period" key={index}>
        <div><span>{index+1}. omgang</span><strong>{values.join("–")}</strong></div>
        {values.map((goals,side)=><div className="event-period-team" key={side} data-team={side===ownIndex?"own":"other"}>
          <span>{names[side]}</span><b>{goals}</b><span className="event-bar-track" aria-hidden="true"><span style={{width:goals/maximum*100+"%"}}/></span>
        </div>)}
      </div>)}
    </div>}
    <table className="table halftime-table">
      <thead><tr><th scope="col">Lag</th><th scope="col">Til pause</th><th scope="col">2. omgang</th><th scope="col">Fulltid</th></tr></thead>
      <tbody>{names.map((name,index)=><tr key={index}>
        <th scope="row">{name}</th><td>{half?.[index]??"–"}</td><td>{second?.[index]??"–"}</td><td><strong>{full?.[index]??"–"}</strong></td>
      </tr>)}</tbody>
    </table>
    <small>{half?"2. omgang viser målene som ble scoret etter pausen.":"Pauseresultat mangler. Det kan registreres under Kampinformasjon i Kamprapport."}</small>
    </div>
  </section>;
}

