import {useEffect,useState} from "react";
import {Check,ChevronRight} from "lucide-react";
import {applications,today,type Snapshot} from "@/lib/beta";
import {courtEnabled,type Doc} from "@/lib/court/client";
import {reportOverview,type Fixture,type ReportStatus} from "@/lib/match-journal";
import {trainingDay} from "@/lib/programs";
import {sessionLoad} from "@/lib/session-load";
import {eventsFor,type EventLoad} from "@/lib/load-summary";
import {intensity} from "@/lib/regular";
import {coachFollowups} from "@/lib/coach-overview";

export function CoachFollowup({data,games,gamesReady,docs,docsError}:{data:Snapshot;games:Fixture[];gamesReady:boolean;docs:Doc[]|null;docsError:string}){
 const [loads,L]=useState<EventLoad[]|null>(null),[shown,Show]=useState(10);
 const [reports,R]=useState<Record<string,ReportStatus>|null>(null),[pending,P]=useState<number|null>(null);
 const [errors,E]=useState<string[]>([]),[retry,T]=useState(0);
 useEffect(()=>{const refresh=()=>T(n=>n+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
 useEffect(()=>{let live=true;R(null);P(null);L(null);E([]);
  const fail=(message:string)=>{if(live)E(e=>[...e,message]);};
  void sessionLoad(data,trainingDay(today(),-6),trainingDay(today(),1)).then(rows=>{if(live)L(rows);}).catch(()=>fail("Gjennomførte økter kunne ikke lastes."));
  void applications(data.me.squad).then(a=>{if(live)P(a.filter(x=>x.status==="Pending").length);}).catch(()=>fail("Søknader kunne ikke lastes."));
  if(gamesReady)void reportOverview(data.me.squad,games.filter(g=>g.completed)).then(r=>{if(live)R(r);}).catch(()=>fail("Rapportstatus kunne ikke lastes."));
  return()=>{live=false;};
 },[data,games,gamesReady,retry]);
 const day=today(),tasks=coachFollowups(data,docs||[],games,reports||{},day,trainingDay(day,-6),loads||[]);
 const plans=eventsFor(data,docs||[],trainingDay(day,-6),trainingDay(day,1),"");
 const recent=(loads||[]).filter(e=>data.roster.some(p=>p.id===e.athlete&&p.role==="athlete"&&p.squad===data.me.squad)).slice().sort((a,b)=>b.day.localeCompare(a.day)||a.athlete.localeCompare(b.athlete));
 const row=(label:string,count:number|null,url:string,detail:string)=><li key={label}><a href={url}><b>{count??"–"}</b><span><strong>{label}</strong><small>{count===null?"Status ikke tilgjengelig":detail}</small></span><ChevronRight size={16}/></a></li>;
 return <>
 <section className="coach-followup" aria-label="Til oppfølging"><h3>Til oppfølging</h3><ul className="followup-list">
 {row("Søknader",pending,"/team?vis=soknader",pending?"Venter på godkjenning":"Ingen ventende søknader")}
 {courtEnabled&&row("Utkast",docs?tasks.drafts.length:null,tasks.drafts.length===1?"/okter?edit="+tasks.drafts[0].id:"/okter",tasks.drafts.length?"Ikke publisert til utøverne":"Ingen upubliserte økter")}
 {row("Kamprapporter",reports?tasks.missing.length:null,tasks.missing.length===1?"/match?game="+tasks.missing[0].id:"/match",tasks.missing.length?"Spilte kamper uten lagret rapport":"Rapport lagret for alle spilte kamper")}
 {row("Tung trening",loads?tasks.effortPlayers.length:null,tasks.effortPlayers.length===1?"/?athlete="+encodeURIComponent(tasks.effortPlayers[0].id)+"#monitor":"/#monitor","Utøvere som rapporterte hard eller svært hard trening siste sju dager")}
 </ul>{docsError&&<p role="alert">{docsError} <a href="/okter">Åpne øktplanlegger</a></p>}{errors.length>0&&<p role="alert">{errors.join(" ")} <button className="btn" onClick={()=>T(retry+1)}>Prøv igjen</button></p>}
 {(tasks.drafts.length>1||tasks.missing.length>1)&&<details><summary>Se økter og kamper til gjennomgang</summary><ul>
 {tasks.drafts.slice(0,5).map(d=><li key={d.id}><a href={"/okter?edit="+d.id}>{d.plan.title}</a> · Utkast</li>)}
 {tasks.missing.slice(0,5).map(g=><li key={g.id}><a href={"/match?game="+g.id}>{g.day} · {g.home||"Eget lag"} – {g.away||g.opponent}</a> · Rapport mangler</li>)}
 </ul></details>}
 <section className="session-followup"><h4>Registrerte økter siste sju dager</h4>{loads===null?<p role="status">Registreringer er ikke tilgjengelige ennå.</p>:!recent.length?<p>Ingen registrerte økter i perioden.</p>:<div className="monitor-table"><table className="table"><thead><tr>{["Dato","Spiller","Økt","Plan min","Faktisk min","Intensitet","Oppfølging"].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{recent.slice(0,shown).map(e=>{const plan=plans.find(p=>p.athlete===e.athlete&&p.source===e.source&&p.event===e.event&&p.day===e.day),player=data.roster.find(p=>p.id===e.athlete);return <tr key={[e.athlete,e.source,e.event].join(":")}><td>{e.day}</td><td><a href={"/spillere?athlete="+e.athlete}>{player?.name}</a></td><td>{plan?<a href={e.source==="court"?"/okter?session="+e.event:"/?dag="+e.day+"&athlete="+e.athlete+"#weekly"}>{plan.title}</a>:"Tidligere aktivitet"}</td><td>{plan?.minutes??"–"}</td><td>{e.minutes}</td><td>{e.minutes?intensity[e.weight]:"Ikke deltatt"}</td><td><a href={"/?dag="+e.day+"&athlete="+e.athlete+"#monitor"}>Se belastning</a></td></tr>;})}</tbody></table>{recent.length>shown&&<button className="btn" onClick={()=>Show(n=>n+10)}>Vis flere registreringer</button>}</div>}</section>
 </section>
 <details className="coach-start" open={tasks.players===0||undefined}><summary>Kom i gang som trener</summary><ol>
 <li><a href="/team?vis=inviter">{tasks.players>0&&<Check size={16}/>}Lag og spillere</a><p>{tasks.players} registrerte utøvere. Inviter med lenke eller e-post.</p></li>
 {courtEnabled&&<><li><a href="/okter">{!!docs?.some(d=>!d.archived&&d.plan.origin!=="template")&&<Check size={16}/>}Åpne øktplanlegger</a><p>Lag og forhåndsvis et utkast. Utøverne ser det først når du publiserer.</p></li>
 <li><a href="/#weekly">{(tasks.planned||docs?.some(d=>d.published&&!d.archived))&&<Check size={16}/>}Kontroller kalenderen</a><p>Velg dato, se øvelsene og kontroller hvem økten gjelder.</p></li></>}
 </ol></details>
 </>;
}
