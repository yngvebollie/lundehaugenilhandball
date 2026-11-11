import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {categories,eventsFor,loadSummary,type PlannedEvent,type EventLoad} from "@/lib/load-summary";
import {intensity,monthBounds,plusDay,type Rule} from "@/lib/regular";
import {sessionLoad} from "@/lib/session-load";
import type {Doc} from "@/lib/court/client";
import {monday} from "@/lib/workload";

function useEntries(data:Snapshot,from:string,until:string){
 const [rows,set]=useState<EventLoad[]|null>(null),[error,E]=useState(""),[refresh,R]=useState(0);
 useEffect(()=>{let active=true;set(null);E("");sessionLoad(data,from,until).then(r=>{if(active)set(r);}).catch(e=>{if(active)E(e.message||"Kunne ikke hente belastning.");});return()=>{active=false;};},[data,from,until,refresh]);
 return {rows,set,error,retry:()=>R(x=>x+1)};
}
type Props={data:Snapshot;docs:Doc[];date:string};
export function ActivityLoad({data,docs,rules,date,target:athlete,onTarget:T}:{rules:Rule[];target:string;onTarget:(id:string)=>void}&Props){
 const [period,P]=useState<"Uke"|"Måned">("Uke"),[anchor,A]=useState(date);
 const week=monday(anchor),[from,until]=period==="Uke"?[week,plusDay(week,7)]:monthBounds(anchor);
 const res=useEntries(data,from,until);
 const events=eventsFor(data,docs,from,until,athlete);
 const stats=loadSummary(rules,events,res.rows||[],from,until,today(),athlete);
 const names=data.roster.filter(a=>a.role==="athlete"&&a.squad===data.me.squad);
 const line=(label:string,r:typeof stats.sum)=><tr key={label}><th scope="row">{label}</th><td>{r.planMin}</td><td>{r.planPoints}</td><td>{r.confirmed?r.actualMin:"–"}</td><td>{r.confirmed?r.actualPoints:"–"}</td><td>{r.pending}</td><td>{r.future}</td></tr>;
 return <section className="grid"><header className="page-head"><FeatureInfo topic="load"><h3>Samlet belastning</h3></FeatureInfo><div className="day-strip" aria-label="Belastningsperiode">{(["Uke","Måned"] as const).map(x=><button key={x} className={"btn "+(period===x?"selected":"")} aria-pressed={period===x} onClick={()=>P(x)}>{x}</button>)}</div></header>
 <div className="field-pair"><label>Spiller i oversikten<select value={athlete} onChange={e=>T(e.target.value)}><option value="">Hele laget</option>{names.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label><div className="day-strip"><button className="btn" aria-label="Forrige periode" onClick={()=>A(period==="Uke"?plusDay(from,-7):plusDay(from,-1))}><ChevronLeft size={16}/></button><strong>{from} – {plusDay(until,-1)}</strong><button className="btn" aria-label="Neste periode" onClick={()=>A(until)}><ChevronRight size={16}/></button></div></div>
 {res.error?<p role="alert">{res.error} <button className="btn" onClick={res.retry}>Prøv igjen</button></p>:!res.rows?<p role="status">Henter registreringer …</p>:<><div className="monitor-table"><table className="table"><caption>{names.find(a=>a.id===athlete)?.name||"Hele laget"} · {period}</caption><thead><tr>{["Aktivitet","Plan min","Plan poeng","Faktisk min","Faktisk poeng","Ubekreftet","Kommende"].map(col=><th scope="col" key={col}>{col}</th>)}</tr></thead><tbody>{(Object.keys(categories) as (keyof typeof categories)[]).map(k=>line(categories[k],stats.rows[k]))}</tbody><tfoot>{line("Totalt",stats.sum)}</tfoot></table></div>
 <small>Poeng = minutter × intensitet (1–5). En strek betyr at ingen faktisk belastning er registrert. Kamper gjelder spillerens planlagte kamper, ikke hele lagets terminliste.</small>{stats.sum.noDuration>0&&<small>{stats.sum.noDuration} planlagte aktiviteter mangler varighet og inngår ikke i planlagte poeng.</small>}</>}
 </section>;
}
export function DaySessionLoad({data,docs,date}:Props){
 const until=plusDay(date,1),events=eventsFor(data,docs,date,until,data.me.id),res=useEntries(data,date,until);
 if(!events.length||date>today())return null;
 return <section className="library-tools grid"><FeatureInfo topic="actual"><h3>Min trenings- og kampbelastning · {date}</h3></FeatureInfo>
 {res.error?<p role="alert">{res.error} <button className="btn" onClick={res.retry}>Prøv igjen</button></p>:res.rows?events.map(e=><EventEditor key={e.source+e.event+date} event={e} record={res.rows!.find(r=>r.source===e.source&&r.event===e.event)} save={async(n,w,clear)=>res.set(await sessionLoad(data,date,until,{event:e,minutes:n,weight:w,clear}))}/>):<p role="status">Henter registreringer …</p>}</section>;
}
function EventEditor({event:e,record,save}:{event:PlannedEvent;record?:EventLoad;save:(n:number,w:number,clear?:boolean)=>Promise<void>}){
 const [editing,E]=useState(false),[busy,B]=useState(false),[error,Err]=useState("");
 async function commit(n:number,w:number,clear=false){B(true);Err("");try{await save(n,w,clear);E(false);}catch(x){Err((x as Error).message);}finally{B(false);}}
 return <div className="grid"><strong>{e.title}</strong><small>{categories[e.category]} · {e.minutes??"–"} planlagte minutter</small><span role="status">{record?(record.minutes?`Registrert: ${record.minutes} min · ${intensity[record.weight]}`:"Ikke deltatt"):"Ubekreftet"}</span>
 <div className="day-strip">{!record&&!!e.minutes&&<button className="btn" disabled={busy} onClick={()=>commit(e.minutes!,e.weight)}>Gjennomført som planlagt</button>}<button className="btn" aria-expanded={editing} disabled={busy} onClick={()=>E(!editing)}>Registrer faktisk belastning</button>{(!record||record.minutes>0)&&<button className="btn" disabled={busy} onClick={()=>commit(0,0)}>Ikke deltatt</button>}{record&&<button className="btn" disabled={busy} onClick={()=>commit(0,0,true)}>Angre</button>}</div>
 {editing&&<form className="grid" onSubmit={ev=>{ev.preventDefault();const f=new FormData(ev.currentTarget);void commit(Number(f.get("minutes")),Number(f.get("weight")));}}><div className="field-pair"><label>Faktiske minutter<input name="minutes" type="number" required min="1" max="600" defaultValue={record?.minutes||e.minutes||""}/></label><label>Faktisk intensitet<select name="weight" defaultValue={record?.weight||e.weight}>{intensity.slice(1).map((v,i)=><option key={v} value={i+1}>{v}</option>)}</select></label></div><button className="btn primary" disabled={busy}>Lagre belastning</button></form>}
 {error&&<p role="alert">{error}</p>}</div>;
}
