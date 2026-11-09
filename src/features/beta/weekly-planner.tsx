import {court,courtEnabled,type Doc} from "@/lib/court/client";
import {regular} from "@/lib/coach-feedback";
import {onDate,type Rule} from "@/lib/regular";
import {ActivityLoad,DaySessionLoad} from "./activity-load";
import {DailyChecks,RegularEditor,LoadTotals} from "./regular-plan";
import {wallTime} from "@/lib/court/model";
import { useEffect,useState, type FormEvent } from "react";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Columns3, List, ChartColumn } from "lucide-react";
import { publish, today, type Assignment, type Snapshot } from "@/lib/beta";
import { trainingDay } from "@/lib/programs";
import { monday, volume, weekLabel, weekPlans, type EventKind } from "@/lib/workload";
import type { Run } from "./program-builder";
import { WeekSuggestion } from "./week-suggestion";
import {PublishingTeam} from "./publishing-team";
import {FocusGroups} from "./focus-groups";
import {WeekCompare} from "./week-compare";
import type {QuickProgram} from "./quick-coach";
import "./planning.css";

function dayLabel(day:string){
  return new Intl.DateTimeFormat("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(day+"T12:00Z"));
}
export function WeeklyPlanner({data,busy,run,onDraft,renderBuilder}:{data:Snapshot;busy:boolean;run:Run;onDraft?:(draft:QuickProgram)=>void;renderBuilder?:(show:(day:string,recipient:string)=>void)=>React.ReactNode}){
  const coach=data.me.role==="coach";
  const [week,setWeek]=useState(()=>monday(today()));
  const [date,setDate]=useState(today);
  const [kind,setKind]=useState<EventKind>("Session");
  const [target,setTarget]=useState(coach?"":data.me.id);
  const [template,setTemplate]=useState("");
  const [title,setTitle]=useState("");
  const [lines,setLines]=useState("");
  const [time,setTime]=useState("17:00");
  const [minutes,setMinutes]=useState(60);
  const [weeks,setWeeks]=useState(1);
  const [note,setNote]=useState("");
  const [view,setView]=useState<"Week"|"Agenda"|"Compare">("Week");
  const players=data.roster.filter(m=>m.role==="athlete");
  const [courtDocs,CD]=useState<Doc[]>([]),[courtError,CE]=useState("");
  useEffect(()=>{let alive=true;if(courtEnabled)court(data).then(p=>{if(alive){CD(p.sessions.filter(d=>d.published&&!d.archived));CE("");}}).catch(()=>{if(alive){CD([]);CE("Publiserte håndballøkter kunne ikke hentes.");}});return()=>{alive=false};},[data]);
  const [rules,Rules]=useState<Rule[]>([]),[regularError,Err]=useState(""),[refresh,R]=useState(0);
  useEffect(()=>{let active=true;regular(data).then(r=>{if(active){Rules(r);Err("");}}).catch(e=>{if(active){Rules([]);Err(e.message||"Kunne ikke hente faste aktiviteter.");}});return()=>{active=false;};},[data,refresh]);
  const plans=weekPlans(data.plans,week,target);
  const sessions=data.programs.filter(p=>p.kind==="session");
  function navigate(day:string){setWeek(monday(day));setDate(day);setNote("");}
  async function add(e:FormEvent){
    e.preventDefault();setNote("");
    const saved=sessions.find(p=>p.id===template);
    const exercises=kind==="Session"?(saved?.sessions[0].exercises||lines.split(/\r?\n/).map(line=>line.trim()).filter(Boolean)):["Attended "+kind.toLowerCase()];
    const label=(kind==="Session"&&saved?saved.name:title).trim();
    const recipients=players.filter(m=>!target||target===m.id);
    if(!recipients.length||!label||!exercises.length||exercises.length>40){setNote("Choose a recipient and enter a title and 1 to 40 exercise lines for a session.");return;}
    const rows=Array.from({length:weeks},(_,i)=>trainingDay(date,i*7)).flatMap(day=>recipients.map(m=>({
      id:crypto.randomUUID(),athlete:m.id,squad:data.me.squad,title:label,exercises,day,kind,start_time:time||null,minutes,personal:!coach
    })));
    if(await run(()=>publish(rows))){setWeek(monday(date));setNote(label+" scheduled for "+weeks+" week"+(weeks===1?"":"s")+".");}
  }
  return <div className="grid" id="weekly"><section className="panel panel-pad grid">
    {coach&&<PublishingTeam data={data}/>}
    <header className="page-head"><h2><CalendarDays/> Weekly planner</h2><div className="day-strip"><button aria-label="Previous week" className="btn" onClick={()=>navigate(trainingDay(week,-7))}><ChevronLeft size={16}/></button><button className="btn" onClick={()=>navigate(today())}>This week</button><button aria-label="Next week" className="btn" onClick={()=>navigate(trainingDay(week,7))}><ChevronRight size={16}/></button></div></header>
    <div className="field-pair"><label>Week containing<input type="date" value={week} onChange={e=>{if(e.target.value)navigate(e.target.value);}}/></label>{coach&&<label>Planner athlete<select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Entire team</option>{players.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}</div>
    <h3 className="calendar-range">{weekLabel(week)}</h3>
    <div className="day-strip" aria-label="Calendar view">{([["Week",Columns3],["Agenda",List],...(coach?[["Compare",ChartColumn] as const]:[])] as const).map(([label,Icon])=><button className={"btn "+(view===label?"selected":"")} key={label} aria-pressed={view===label} onClick={()=>setView(label)}><Icon size={16}/>{label}</button>)}</div>
    {view==="Compare"?<WeekCompare data={data} week={week} target={target}/>:<div className={view==="Agenda"?"week-board agenda-board":"week-board"}>{Array.from({length:7},(_,i)=>{
      const day=trainingDay(week,i);
      const items=new Map<string,{p:Assignment;count:number}>();
      for(const p of plans.filter(p=>p.day===day).sort((a,b)=>(a.start_time||"").localeCompare(b.start_time||""))){
        const key=JSON.stringify([p.title,p.kind||"Session",p.start_time,p.minutes,p.exercises,p.personal]);
        const group=items.get(key);if(group)group.count++;else items.set(key,{p,count:1});
      }
      const sessionsToday=courtDocs.filter(d=>wallTime((d.sharedPlan||d.plan).start).slice(0,10)===day&&(!coach||!target||!d.audience||d.audience.includes(target)));
      const fixed=onDate(rules,day,target);
      return <div key={day} className={"week-day "+(day===date?"chosen":"")}><button type="button" aria-pressed={date===day} onClick={()=>setDate(day)}>{dayLabel(day)}</button>{fixed.map(r=><div className="week-item" key={r.id}><small>{r.clock.slice(0,5)} · {r.minutes} min</small><strong>{r.title}</strong>{coach&&<small>{players.find(p=>p.id===r.athlete)?.name}</small>}</div>)}{sessionsToday.map(d=><a key={d.id} className="week-item" href={"/okter?session="+encodeURIComponent(d.id)}><small>Håndballøkt · {wallTime((d.sharedPlan||d.plan).start).slice(11)}</small><strong>{(d.sharedPlan||d.plan).title}</strong></a>)}{!items.size&&!sessionsToday.length&&!fixed.length&&<small className="muted">Rest / open</small>}{[...items.entries()].map(([key,{p,count}])=><div className="week-item" data-kind={p.kind||"Session"} key={key}><small>{p.personal?"Personal · ":""}{p.kind||"Session"}</small><strong>{p.title}</strong><small>{p.start_time?.slice(0,5)} {p.minutes? p.minutes+" min":""}{count>1?" · "+count+" athletes":""}</small>{view==="Agenda"&&<details><summary>Session details</summary><ul>{p.exercises.map((x,i)=><li key={i}>{x}</li>)}</ul></details>}</div>)}</div>;
    })}</div>}
    {regularError&&<p role="alert">{regularError} <button className="btn" onClick={()=>R(refresh+1)}>Prøv igjen</button></p>}{!coach&&!regularError&&<><DailyChecks data={data} rules={rules} day={date} changed={Rules}/><DaySessionLoad key={data.me.id+date} data={data} docs={courtDocs} date={date}/><RegularEditor data={data} rules={rules} changed={Rules}/>{courtError?<p role="alert">{courtError}</p>:<LoadTotals data={data} week={week} date={date} target={target} rules={rules} docs={courtDocs}/>}</>}
    <details className="library-tools"><summary>{coach?"Schedule training or event":"Add to my schedule"}</summary><form className="grid" onSubmit={add}>
      <div className="field-pair"><label>Activity type<select value={kind} onChange={e=>setKind(e.target.value as EventKind)}>{["Session","Game","Practice"].map(k=><option key={k}>{k}</option>)}</select></label><label>Event date<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      {coach&&kind==="Session"&&<label>Session to schedule<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="">Custom session</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      {(kind!=="Session"||!template)&&<label>Activity title<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label>}
      {kind==="Session"&&!template&&<label>Session exercises<textarea required maxLength={6000} value={lines} onChange={e=>setLines(e.target.value)}/></label>}
      <div className="field-pair"><label>Start time (Oslo)<input type="time" required value={time} onChange={e=>setTime(e.target.value)}/></label><label>Planned minutes<input type="number" min="1" max="600" required value={minutes||""} onChange={e=>setMinutes(e.target.valueAsNumber)}/></label><label>Number of weekly occurrences<input type="number" required min="1" max="26" value={weeks||""} onChange={e=>setWeeks(e.target.valueAsNumber)}/></label></div>
      <button className="btn primary" disabled={busy}>Schedule {kind.toLowerCase()}{coach?" · "+(players.find(p=>p.id===target)?.name||"Entire team"):" · Personal"}</button>
      {note&&<p role="status">{note}</p>}</form></details>
  </section>{coach&&onDraft&&<section className="panel panel-pad grid" id="plan-drafts"><h2>Plan training</h2>
    <WeekSuggestion regularRules={rules} key={week+target} data={data} run={run} week={week} target={target} busy={busy} onDraft={onDraft} onNext={()=>navigate(week<monday(today())?today():trainingDay(week,7))}/>
    <FocusGroups data={data} date={date} busy={busy} run={run} onDraft={onDraft}/>
  </section>}{renderBuilder?.((day,recipient)=>{navigate(day);setView("Week");setTarget(players.some(p=>p.id===recipient)?recipient:"");document.getElementById("weekly")?.scrollIntoView();})}{coach&&<Monitor onTarget={setTarget} rules={rules} docs={courtDocs} date={date} loadError={regularError||courtError} data={data} week={week} target={target} plans={plans}/>}</div>;
}
function Monitor({onTarget,data,week,target,plans,rules,docs,date,loadError}:{onTarget:(id:string)=>void;rules:Rule[];docs:Doc[];date:string;loadError:string;data:Snapshot;week:string;target:string;plans:Assignment[]}){
  const current=volume(data,plans);
  const previous=volume(data,weekPlans(data.plans,trainingDay(week,-7),target));
  const ids=new Set(plans.map(p=>p.id));
  const rated=data.feedback.filter(r=>ids.has(r.assignment));
  const hard=rated.filter(r=>r.effort==="Hard").length;
  const easy=rated.filter(r=>r.effort==="Easy").length;
  const sets=current.body.reduce((sum,b)=>sum+b.sets,0);
  const priorSets=previous.body.reduce((sum,b)=>sum+b.sets,0);
  const games=plans.filter(p=>p.kind==="Game").length;
  const hasRegular=Array.from({length:7},(_,i)=>onDate(rules,trainingDay(week,i),target)).flat().length>0;
  const hasPublished=docs.some(d=>{const day=wallTime((d.sharedPlan||d.plan).start).slice(0,10);return day>=week&&day<trainingDay(week,7)&&(!target||!d.audience||d.audience.includes(target));});
  const advice=!target?"Select an athlete above for an individual workload review.":!plans.length&&!hasRegular&&!hasPublished?"No activities scheduled in this week.":hard?"Review a reduction: "+hard+" session(s) felt hard. Check the athlete’s feedback before the next session.":
    hasRegular?"Ta med faste aktiviteter i vurderingen før du øker treningsmengden.":easy>=2&&easy===rated.length&&!games&&sets<=priorSets?"Review a small increase: all "+easy+" rated sessions felt easy and planned sets have not risen.":
    !rated.length?"Await athlete feedback before adjusting volume.":games?"Review game demands before adding extra work.":"Maintain the plan and review at the next check-in.";
  return <section id="monitor" className="panel panel-pad grid"><h2><Activity/> Health monitor</h2><p><strong>{target?data.roster.find(p=>p.id===target)?.name:"Team totals"}</strong> · {weekLabel(week)}</p>
    {loadError?<p role="alert">Summen er utilgjengelig: {loadError}</p>:<ActivityLoad key={data.me.squad+date} data={data} date={date} target={target} onTarget={onTarget} rules={rules} docs={docs}/>}
    <div className="monitor-table"><table className="table"><thead><tr><th>Body focus</th><th>Exercises done / planned</th><th>Sets done / planned</th><th>Prior week planned sets</th></tr></thead><tbody>{current.body.map((b,i)=><tr key={b.region}><th>{b.region}</th><td>{b.done} / {b.planned}</td><td>{b.doneSets} / {b.sets}</td><td>{previous.body[i].sets}</td></tr>)}</tbody></table></div>
    <p className="muted">Sets count explicit prescriptions such as 3 x 8. A checked exercise counts its prescribed sets. Court minutes use the scheduled duration of games and practices.</p>
    <div className="result"><strong>Court minutes · attended / planned</strong><span>{current.attended} / {current.court}</span></div>
    <div className="result"><strong>Athlete ratings</strong><span>{easy} easy · {rated.length-easy-hard} just right · {hard} hard</span></div>
    <p className="workload-note">{advice}</p></section>;
}
