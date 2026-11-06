import { useState } from "react";
import { SessionLibrary } from "./session-library";
import { CoachAI } from "./coach-ai";
import type { QuickProgram } from "./quick-coach";
import type { ExerciseDraft } from "@/lib/coach-ai";
import { BookOpen, ClipboardList, Plus, Save, Send, Trash2 } from "lucide-react";
import { publish, saveProgram, today, type Snapshot } from "@/lib/beta";
import { adjustedDraft, suggestions, trainingDay, type SessionDraft } from "@/lib/programs";

export type Run = (action:()=>Promise<void>)=>Promise<boolean>;
type Draft = { title:string; offset:number; text:string; manual:boolean };
const blank = (offset=0):Draft=>({title:"",offset,text:"",manual:false});
const draftFrom = (session:SessionDraft):Draft=>({...session,text:session.exercises.join("\n"),manual:true});

export function ProgramBuilder({data,busy,run,initial}:{data:Snapshot;busy:boolean;run:Run;initial?:QuickProgram}) {
  const [sessions,setSessions]=useState<Draft[]>(()=>initial?initial.sessions.map(draftFrom):[blank()]);
  const [active,setActive]=useState(0);
  const [name,setName]=useState(initial?.name||"");
  const [loaded,setLoaded]=useState("");
  const [start,setStart]=useState(today);
  const [target,setTarget]=useState("team");
  const [notice,setNotice]=useState("");
  const [generated,setGenerated]=useState<{id:string;value:ExerciseDraft}|null>(null);
  const current=sessions[active];
  const players=data.roster.filter(m=>m.role==="athlete");
  const suggested=suggestions(current.title);
  function edit(change:Partial<Draft>){
    setNotice("");
    setSessions(sessions.map((s,i)=>i===active?{...s,...change}:s));
  }
  function openProgram(id:string){
    const p=data.programs.find(item=>item.id===id);
    setLoaded(id);setName(p?.name||"");setSessions(p?p.sessions.map(draftFrom):[blank()]);setActive(0);setNotice("");
  }
  async function commit(save:boolean){
    const days=sessions.map(s=>({title:s.title.trim(),offset:s.offset,exercises:s.text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}));
    const invalid=days.findIndex(s=>!s.title || !Number.isInteger(s.offset) || s.offset<0 || s.offset>364 || !s.exercises.length || s.exercises.length>40);
    if(invalid>=0){setActive(invalid);setNotice("Give each session a title, a day from 1 to 365 and 1 to 40 exercises.");return;}
    if(save){
      const id=loaded||crypto.randomUUID();
      const programName=name.trim()||days[0].title;
      if(await run(()=>saveProgram({id,squad:data.me.squad,name:programName,sessions:days},Boolean(loaded)))){
        setLoaded(id);setName(programName);setNotice("Program saved to your library.");
      }
    } else {
      const recipients=players.filter(p=>target==="team"||p.id===target);
      if(!start||!recipients.length){setNotice("Choose a start date and an athlete or squad.");return;}
      const rows=days.flatMap(s=>recipients.map(p=>({id:crypto.randomUUID(),squad:data.me.squad,athlete:p.id,title:s.title,day:trainingDay(start,s.offset),exercises:s.exercises,program_name:name.trim()||(days.length>1?days[0].title:null)})));
      if(await run(()=>publish(rows)))setNotice(days.length===1?"Workout published.":days.length+" sessions published for "+recipients.length+" athlete(s).");
    }
  }
  return <div className="grid" id="builder"><section className="panel panel-pad grid">
    <div className="feature-heading"><h2><ClipboardList/> Program builder</h2><a className="btn" href="#ai-coach">Ask Coach AI</a></div>
    <CoachAI key={active+"-"+loaded} source={current.text} apply={d=>{
      if(d.mode==="rewrite")edit({text:d.text,manual:true});
      else if(d.mode==="exercise")setGenerated({id:crypto.randomUUID(),value:d});
      else {setName(d.name);setSessions(d.sessions.map(draftFrom));setActive(0);setLoaded("");setNotice("Program draft ready for review.");}
    }}/>
    <div className="field-pair"><label>Program library<select value={loaded} onChange={e=>openProgram(e.target.value)}><option value="">New program</option>{data.programs.filter(p=>p.kind!=="session").map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Program name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Preseason strength block"/></label></div>
    <div className="day-strip" aria-label="Program sessions">{sessions.map((s,i)=><button key={i} className={"btn "+(i===active?"selected":"")} aria-pressed={i===active} onClick={()=>setActive(i)}>Session {i+1}</button>)}<button className="btn" disabled={sessions.length>=56} onClick={()=>{setSessions([...sessions,blank(Math.min(364,Math.max(...sessions.map(s=>s.offset||0))+1))]);setActive(sessions.length);setNotice("");}}><Plus size={16}/>Add session</button></div>
    <div className="field-pair"><label>Session title<input maxLength={100} value={current.title} placeholder="Squat, speed, recovery..." onChange={e=>{const title=e.target.value;edit({title,...(!current.manual?{text:suggestions(title).join("\n")}:{})});}}/></label><label>Day of program<input type="number" min="1" max="365" value={Number.isFinite(current.offset)?current.offset+1:""} onChange={e=>edit({offset:e.target.valueAsNumber-1})}/></label></div>
    <label>Exercises, one per line<textarea rows={5} value={current.text} maxLength={6000} onChange={e=>edit({text:e.target.value,manual:true})} placeholder="Exercise, sets and reps"/></label>
    <SessionLibrary key={generated?.id} initial={generated?.value} data={data} run={run} busy={busy} title={current.title} text={current.text} append={line=>edit({text:[current.text.trimEnd(),line].filter(Boolean).join("\n"),manual:true})} load={s=>edit({title:s.title,text:s.exercises.join("\n"),manual:true})}/>
    <div className="day-strip">{suggested.length>0 && (current.manual?<button className="btn" onClick={()=>edit({text:suggested.join("\n"),manual:false})}>Use suggested exercises</button>:<span className="badge green">Suggested from exercise library</span>)}{sessions.length>1&&<button className="btn" onClick={()=>{setSessions(sessions.filter((_,i)=>i!==active));setActive(Math.max(0,active-1));}}><Trash2 size={14}/>Remove session</button>}</div>
    <div className="field-pair"><label>Start date<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Assign to<select value={target} onChange={e=>setTarget(e.target.value)}><option value="team">Entire squad</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
    {sessions.length>1 && start && <ol className="program-preview">{sessions.map((s,i)=><li key={i}><strong>{s.title||"Untitled session"}</strong><span>{Number.isFinite(s.offset)?trainingDay(start,s.offset):"Choose day"}</span></li>)}</ol>}
    <div className="day-strip"><button disabled={busy} className="btn" onClick={()=>commit(true)}><Save size={16}/>{loaded?"Update saved program":"Save program"}</button><button disabled={busy} className="btn primary" onClick={()=>commit(false)}><Send size={16}/>{sessions.length===1?"Publish workout":"Publish program"}</button></div>
    {notice&&<p role="status">{notice}</p>}</section>
    <section className="panel panel-pad grid"><h2><BookOpen/> Athlete feedback</h2>{!data.feedback.length&&<p className="muted">Session ratings will appear here after an athlete checks in.</p>}
    {data.feedback.map(f=>{const p=data.plans.find(p=>p.id===f.assignment);if(!p)return null;return <div className="result" key={p.id}><div><strong>{players.find(a=>a.id===p.athlete)?.name} · {f.effort}</strong><p className="muted">{p.title} · {p.day}</p></div><button className="btn" onClick={()=>{
      const lines=adjustedDraft(p.exercises,f.effort);setSessions([draftFrom({title:p.title,offset:0,exercises:lines})]);setActive(0);setLoaded("");setName("");setTarget(p.athlete);setStart(trainingDay(p.day>today()?p.day:today(),1));
      setNotice(lines.some((v,i)=>v!==p.exercises[i])?"Follow-up draft: one working set "+(f.effort==="Easy"?"added.":"removed.")+" Review before publishing.":"Follow-up draft ready. Review exercises before publishing.");
      document.getElementById("builder")?.scrollIntoView();
    }}>Draft follow-up</button></div>;})}</section></div>;
}
