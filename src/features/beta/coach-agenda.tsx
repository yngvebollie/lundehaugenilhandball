import {useEffect,useState} from "react";
import {CalendarDays,ChevronRight} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";

import {registrations,seasonMatches,type Fixture} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";
import {monday,weekLabel,weekPlans} from "@/lib/workload";
import {trainingDay} from "@/lib/programs";

const dateLabel=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(date+"T12:00Z").toLocaleDateString("nb-NO",{timeZone:"UTC",...options});
export function CoachAgenda({data}:{data:Snapshot}){
  const [regs,setRegs]=useState<Registration[]>([]),[games,setGames]=useState<Fixture[]>([]),[chosen,setChosen]=useState(""),[error,setError]=useState("");
  const key="kamper-profile:"+data.me.id+":"+data.me.squad;
  useEffect(()=>{let live=true;async function load(){const r=await registrations(data.me.squad);const g=await seasonMatches(data.me.squad,r);if(live){setRegs(r);setGames(g);setChosen(sessionStorage.getItem(key)||r[0]?.id||"");setError("");}}
    load().catch(()=>{if(live)setError("Kampoversikten kunne ikke lastes.");});return()=>{live=false;};},[key,data.me.squad]);
  const active=regs.find(r=>r.id===chosen)||regs[0],day=today(),week=monday(day),tomorrow=trainingDay(day,1),end=trainingDay(week,6);
  const weekRows=weekPlans(data.plans,week,""),ids=new Set(weekRows.map(p=>p.id));
  const feedback=data.feedback.filter(f=>ids.has(f.assignment));
  const hard=new Set(weekRows.filter(p=>feedback.some(f=>f.assignment===p.id&&f.effort==="Hard")).map(p=>p.athlete)).size;
  return <section className="coach-agenda"><div className="agenda-context"><small>{data.teams.find(t=>t.id===data.me.squad)?.name} · Treningsgruppe</small>
    {active&&<label><select aria-label="Spillelag i oversikten" value={active.id} onChange={e=>{setChosen(e.target.value);sessionStorage.setItem(key,e.target.value);}}>{regs.map(r=><option key={r.id} value={r.id}>{r.display_name||"Spillelag "+r.org_id}</option>)}</select><span className="id-tag">NIF {active.org_id}</span></label>}</div>
    <h2>{dateLabel(day,{weekday:"long",day:"numeric",month:"long"})}</h2>
    <p>Uke {weekLabel(day).split(" ")[1]} · {dateLabel(week,{day:"numeric",month:"short"})} – {dateLabel(end,{day:"numeric",month:"short"})}</p>
    {[day,tomorrow].map((d,i)=>{const sessions=[...new Map(data.plans.filter(p=>p.day===d&&!p.personal).map(p=>[p.title+":"+p.start_time,p])).values()];
      const fixtures=games.filter(g=>g.day===d&&g.registration===active?.id);
      return <div className="agenda-day" key={d}><h3>{i?"I morgen":"I dag"}</h3>{sessions.map(p=><a key={p.id} href="/#weekly"><time>{p.start_time?.slice(0,5)||"–"}</time><span><strong>{p.title}</strong><small>Treningsgruppens plan</small></span><ChevronRight size={16}/></a>)}
      {fixtures.map(g=><a className="game-event" href={"/match?game="+g.id} key={g.id}><time>{g.start_time?.slice(0,5)||"–"}</time><span><strong>{g.home} – {g.away}</strong><small>{g.competition}</small></span><ChevronRight size={16}/></a>)}
      {!sessions.length&&!fixtures.length&&<small>Ingen planlagte aktiviteter.</small>}</div>;})}
    {error&&<small role="status">{error}</small>}
    <h3>Til oppfølging</h3><a className="follow-row" href="/#monitor">Ukebelastning <span>{hard} har meldt høy belastning</span><ChevronRight size={15}/></a>
    <details className="feedback-list"><summary>Spillerfeedback <span>{feedback.length} svar denne uken</span></summary>{feedback.map(f=><p key={f.assignment}>{data.roster.find(a=>a.id===weekRows.find(p=>p.id===f.assignment)?.athlete)?.name} · {weekRows.find(p=>p.id===f.assignment)?.title} · {f.effort}</p>)}</details>
    <a className="btn primary" href="/#weekly"><CalendarDays size={18}/>Åpne ukeplan</a></section>;
}
