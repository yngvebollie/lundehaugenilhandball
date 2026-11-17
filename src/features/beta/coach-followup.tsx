import {useEffect,useState} from "react";
import {Check,ChevronRight} from "lucide-react";
import {applications,today,type Snapshot} from "@/lib/beta";
import {courtEnabled,type Doc} from "@/lib/court/client";
import {reportOverview,type Fixture,type ReportStatus} from "@/lib/match-journal";
import {trainingDay} from "@/lib/programs";
import {coachFollowups} from "@/lib/coach-overview";

export function CoachFollowup({data,games,gamesReady,docs,docsError}:{data:Snapshot;games:Fixture[];gamesReady:boolean;docs:Doc[]|null;docsError:string}){
 const [reports,R]=useState<Record<string,ReportStatus>|null>(null),[pending,P]=useState<number|null>(null);
 const [errors,E]=useState<string[]>([]),[retry,T]=useState(0);
 useEffect(()=>{let live=true;R(null);P(null);E([]);
  const fail=(message:string)=>{if(live)E(e=>[...e,message]);};
  void applications(data.me.squad).then(a=>{if(live)P(a.filter(x=>x.status==="Pending").length);}).catch(()=>fail("Søknader kunne ikke lastes."));
  if(gamesReady)void reportOverview(data.me.squad,games.filter(g=>g.completed)).then(r=>{if(live)R(r);}).catch(()=>fail("Rapportstatus kunne ikke lastes."));
  return()=>{live=false;};
 },[data,games,gamesReady,retry]);
 const day=today(),tasks=coachFollowups(data,docs||[],games,reports||{},day,trainingDay(day,-6));
 const row=(label:string,count:number|null,url:string,detail:string)=><li key={label}><a href={url}><b>{count??"–"}</b><span><strong>{label}</strong><small>{count===null?"Status ikke tilgjengelig":detail}</small></span><ChevronRight size={16}/></a></li>;
 return <>
 <section className="coach-followup" aria-label="Til oppfølging"><h3>Til oppfølging</h3><ul className="followup-list">
 {row("Søknader",pending,"/team?vis=soknader",pending?"Venter på godkjenning":"Ingen ventende søknader")}
 {courtEnabled&&row("Utkast",docs?tasks.drafts.length:null,tasks.drafts.length===1?"/okter?edit="+tasks.drafts[0].id:"/okter",tasks.drafts.length?"Ikke publisert til utøverne":"Ingen upubliserte økter")}
 {row("Kamprapporter",reports?tasks.missing.length:null,tasks.missing.length===1?"/match?game="+tasks.missing[0].id:"/match",tasks.missing.length?"Spilte kamper uten lagret rapport":"Rapport lagret for alle spilte kamper")}
 {row("Tung trening",tasks.effortPlayers.length,tasks.effortPlayers.length===1?"/spillere?athlete="+encodeURIComponent(tasks.effortPlayers[0].id)+"#aktivitet":"/#monitor","Utøvere som meldte «Hard» siste sju dager")}
 </ul>{docsError&&<p role="alert">{docsError} <a href="/okter">Åpne øktplanlegger</a></p>}{errors.length>0&&<p role="alert">{errors.join(" ")} <button className="btn" onClick={()=>T(retry+1)}>Prøv igjen</button></p>}
 {(tasks.drafts.length>1||tasks.missing.length>1)&&<details><summary>Se økter og kamper til gjennomgang</summary><ul>
 {tasks.drafts.slice(0,5).map(d=><li key={d.id}><a href={"/okter?edit="+d.id}>{d.plan.title}</a> · Utkast</li>)}
 {tasks.missing.slice(0,5).map(g=><li key={g.id}><a href={"/match?game="+g.id}>{g.day} · {g.home||"Eget lag"} – {g.away||g.opponent}</a> · Rapport mangler</li>)}
 </ul></details>}
 </section>
 <details className="coach-start" open={tasks.players===0||undefined}><summary>Kom i gang som trener</summary><ol>
 <li><a href="/team?vis=inviter">{tasks.players>0&&<Check size={16}/>}Lag og spillere</a><p>{tasks.players} registrerte utøvere. Inviter med lenke eller e-post.</p></li>
 {courtEnabled&&<><li><a href="/okter">{!!docs?.some(d=>!d.archived&&d.plan.origin!=="template")&&<Check size={16}/>}Åpne øktplanlegger</a><p>Lag og forhåndsvis et utkast. Utøverne ser det først når du publiserer.</p></li>
 <li><a href="/#weekly">{(tasks.planned||docs?.some(d=>d.published&&!d.archived))&&<Check size={16}/>}Kontroller kalenderen</a><p>Velg dato, se øvelsene og kontroller hvem økten gjelder.</p></li></>}
 </ol></details>
 </>;
}
