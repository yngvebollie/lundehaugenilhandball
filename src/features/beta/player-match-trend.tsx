import {useState} from "react";
import {uniqueGames,type ClubLine} from "@/lib/club-player-stats";
import {countOutcomes} from "@/lib/stat-metrics";

const outcomes={W:"Seier",L:"Tap",D:"Uavgjort"};
const dates=new Intl.DateTimeFormat("nb-NO",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
function dateLabel(day:string){const date=new Date(day+"T12:00:00Z");return Number.isNaN(date.getTime())?day:dates.format(date);}

export function PlayerMatchTrend({season,levels,rows,loading,error}:{season:string;levels:{id:string;label:string}[];rows:ClubLine[];loading:boolean;error:string}){
 const [level,setLevel]=useState(""),[match,setMatch]=useState("");
 const played=uniqueGames(rows.filter(r=>!level||r.reg===level)).rows.filter(r=>r.played)
   .sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||"")||a.fixtureKey.localeCompare(b.fixtureKey));
 const last=played.slice(-10),selected=last.find(r=>r.fixtureKey===match),totals=countOutcomes(played);
 const name=(r:ClubLine)=>levels.find(l=>l.id===r.reg)?.label||r.level;
 return <section className="player-match-trend" aria-label="Spillerens kamptrend"><h3>Kampform · {season||"…"}</h3>
 <label>Lag<select value={level} onChange={e=>{setLevel(e.target.value);setMatch("");}}><option value="">Alle lag</option>{levels.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
 {error?<p role="alert">{error}</p>:loading?<small>Henter kampresultater …</small>:!last.length?<p>Ingen koblede, spilte kamper i dette utvalget.</p>:<>
 <p>{totals.W} seire · {totals.L} tap · {totals.D} uavgjorte</p>
 <small>Siste {last.length} · nyeste til høyre</small>
 <div className="form-results">{last.map(r=><button key={r.fixtureKey} type="button" data-outcome={r.outcome||""} aria-pressed={match===r.fixtureKey} aria-label={(r.outcome?outcomes[r.outcome]:"Ukjent resultat")+" · "+dateLabel(r.day)+" · "+(r.opponent||"Ukjent motstander")} onClick={()=>setMatch(v=>v===r.fixtureKey?"":r.fixtureKey)}>{r.outcome||"–"}</button>)}</div>
 {selected&&<div role="region" aria-label="Valgt kamp" aria-live="polite"><strong>{selected.fixtureTitle||"Kamp mot "+(selected.opponent||"ukjent motstander")}</strong><dl>{[["Dato",dateLabel(selected.day)],["Motstander",selected.opponent||"Ikke registrert"],["Resultat",selected.score||"Ikke registrert"],["Lag",name(selected)]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>}
 </>}</section>;
}
