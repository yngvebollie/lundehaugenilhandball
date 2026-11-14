import {useEffect,useState} from "react";
import {ChevronLeft,ChevronRight} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {court,courtEnabled} from "@/lib/court/client";
import {regular} from "@/lib/coach-feedback";
import {eventsFor,categories} from "@/lib/load-summary";
import {sessionLoad} from "@/lib/session-load";
import {onDate,plusDay} from "@/lib/regular";
import {monday,weekLabel} from "@/lib/workload";

type Row={key:string;day:string;name:string;source:string;planned:number|null;actual:number|null;status:string;lines?:{name:string;done:boolean}[]};
async function comparison(data:Snapshot,player:string,from:string){
 const until=plusDay(from,7),now=today(),[packet,rules,logs]=await Promise.all([courtEnabled?court(data):{sessions:[]},regular(data),sessionLoad(data,from,until)]);
 const own=logs.filter(l=>l.athlete===player),used=new Set<string>(),rows:Row[]=[];
 for(const e of eventsFor(data,packet.sessions,from,until,player)){
  const a=e.source==="assignment"?data.plans.find(a=>a.id===e.event):undefined;
  const checked=new Set(data.checks.filter(c=>c.assignment===a?.id).map(c=>c.step));
  const lines=a?.exercises.map((name,i)=>({name,done:checked.has(i)}));
  const quick=a?.personal&&a.exercises.length===1&&a.exercises[0]==="Gjennomført trening";
  const key=[e.source,e.event,e.day].join(":"),record=own.find(l=>[l.source,l.event,l.day].join(":")===key);
  used.add(key);
  const complete=!!lines?.length&&lines.every(x=>x.done),actual=record?.minutes??(quick&&complete?e.minutes:null);
  rows.push({key,day:e.day,name:e.title,source:quick?"Hurtigregistrering":categories[e.category],planned:quick?null:e.minutes,actual,lines,
   status:record?(record.minutes?"Gjennomført":"Ikke deltatt"):complete?"Gjennomført":checked.size?"Delvis gjennomført":e.day>now?"Kommende":"Ikke registrert"});
 }
 for(const l of own){const key=[l.source,l.event,l.day].join(":");if(!used.has(key))rows.push({key,day:l.day,name:"Registrert "+categories[l.category].toLocaleLowerCase("nb"),source:"Historisk registrering",planned:null,actual:l.minutes,status:l.minutes?"Gjennomført":"Ikke deltatt"});}
 for(let day=from;day<until;day=plusDay(day,1))for(const r of onDate(rules,day,player)){
  const c=r.checks?.[day];rows.push({key:r.id+day,day,name:r.title,source:categories[r.kind],planned:r.minutes,actual:c?(c.done?c.minutes:0):null,status:c?(c.done?"Gjennomført":"Ikke deltatt"):day>now?"Kommende":"Ikke registrert"});
 }
 return rows.sort((a,b)=>a.day.localeCompare(b.day)||a.name.localeCompare(b.name,"nb"));
}
export function ProfilePlan({data,player}:{data:Snapshot;player:string}){
 const [week,W]=useState(()=>{const q=new URLSearchParams(location.search).get("uke");return monday(q&&/^\d{4}-\d{2}-\d{2}$/.test(q)&&Number.isFinite(Date.parse(q+"T12:00Z"))?q:today());}),[rows,R]=useState<Row[]>(),[err,E]=useState(""),[retry,T]=useState(0);
 useEffect(()=>{let active=true;R(undefined);E("");comparison(data,player,week).then(r=>{if(active)R(r);}).catch(e=>{if(active)E(e.message||"Kunne ikke hente spillerplanen.");});return()=>{active=false;};},[data,player,week,retry]);
 return <section className="grid"><header className="feature-heading"><h3>Planlagt og gjennomført</h3><div className="day-strip"><button className="btn" aria-label="Forrige uke" onClick={()=>W(plusDay(week,-7))}><ChevronLeft size={16}/></button><button className="btn" onClick={()=>W(monday(today()))}>{weekLabel(week)}</button><button className="btn" aria-label="Neste uke" onClick={()=>W(plusDay(week,7))}><ChevronRight size={16}/></button></div></header>
 {err?<p role="alert">{err} <button className="btn" onClick={()=>T(retry+1)}>Prøv igjen</button></p>:!rows?<p role="status">Henter spillerens uke …</p>:!rows.length?<p>Ingen planlagte aktiviteter eller registreringer denne uken.</p>:<><div className="player-list-scroll"><table className="table stat-table"><thead><tr>{["Dato","Aktivitet","Planlagt","Faktisk","Status"].map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><td>{r.day.slice(8)}.{r.day.slice(5,7)}.</td><th scope="row">{r.lines?.length?<details><summary>{r.name}</summary>{r.lines.map((l,i)=><p key={i}>{l.done?"✓":"–"} {l.name}</p>)}</details>:r.name}<small>{r.source}</small></th><td>{r.planned===null?"–":r.planned+" min"}</td><td>{r.actual===null?"–":r.actual+" min"}</td><td>{r.status}</td></tr>)}</tbody></table></div><small>En strek betyr at varigheten ikke er registrert. Avkrysning bekrefter utførelse, ikke antall minutter.</small></>}
 </section>;
}
