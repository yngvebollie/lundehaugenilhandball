import { useState } from "react";
import { Library, Plus, Save } from "lucide-react";
import { saveExercise, saveProgram, recordExerciseUse, type Snapshot } from "@/lib/beta";
import {originals} from "@/lib/development/model";
import {plannerBridge} from "@/lib/development/flags";
import { StrengthPicker } from "./strength-picker";
import { exerciseLine, regions, type Region } from "@/lib/workload";
import type { SessionDraft } from "@/lib/programs";
import type { Run } from "./program-builder";
import type { ExerciseDraft } from "@/lib/coach-ai";

export function SessionLibrary({data,run,busy,title,text,append,load,initial}:{data:Snapshot;run:Run;busy:boolean;title:string;text:string;append:(line:string)=>void;load:(s:SessionDraft)=>void;initial?:ExerciseDraft}){
  const [name,setName]=useState(initial?.name||"");
  const [dose,setDose]=useState(initial?.dose||"");
  const [region,setRegion]=useState<Region>(initial?.region||"Upper body");
  const [note,setNote]=useState("");
  const [session,setSession]=useState("");
  const templates=data.programs.filter(p=>p.kind==="session");
  async function add(){
    if(!name.trim()||!dose.trim()){setNote("Enter an exercise name and prescription.");return;}
    const item={id:crypto.randomUUID(),squad:data.me.squad,name:name.trim(),dose:dose.trim(),region};
    if(await run(()=>saveExercise(item))){append(exerciseLine(item));setName("");setDose("");await run(()=>recordExerciseUse(data.me.id,item.id));setNote("Exercise saved and added to the current session.");}
  }
  async function save(){
    const exercises=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!title.trim()||!exercises.length||exercises.length>40){setNote("Enter a session title and 1 to 40 exercises.");return;}
    const id=crypto.randomUUID();
    if(await run(()=>saveProgram({id,squad:data.me.squad,kind:"session",name:title.trim(),sessions:[{title:title.trim(),offset:0,exercises}]},false))){
      setSession(id);setNote("Session saved. It is also available in the weekly planner.");
    }
  }
  return <details className="library-tools" open><summary><Library size={17}/> Exercise &amp; session library</summary><div className="grid">
    {plannerBridge&&<details><summary>Klubbens håndballøvelser</summary><div className="grid">{originals.map(x=><button type="button" className="btn" key={x.id} onClick={()=>append(x.title)}><Plus size={15}/>{x.title}</button>)}</div></details>}
    <StrengthPicker data={data} run={run} busy={busy} append={append}/>
    <div className="field-pair"><label>Exercise name<input maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="Pallof press"/></label><label>Sets, reps or time<input maxLength={100} value={dose} onChange={e=>setDose(e.target.value)} placeholder="3 x 10 per side"/></label><label>Primary focus<select value={region} onChange={e=>setRegion(e.target.value as Region)}>{regions.map(r=><option key={r}>{r}</option>)}</select></label></div>
    <button className="btn" disabled={busy} onClick={add}><Plus size={15}/>Save and add exercise</button>
    <div className="field-pair"><label>Saved session<select value={session} onChange={e=>setSession(e.target.value)}><option value="">Choose session</option>{templates.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><button className="btn" disabled={!session||busy} onClick={()=>{const s=templates.find(x=>x.id===session);if(s)load(s.sessions[0]);}}>Load into current session</button></div>
    <button className="btn" disabled={busy} onClick={save}><Save size={15}/>Save current session</button>{note&&<p role="status">{note}</p>}
  </div></details>;
}
