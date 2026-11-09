import { useState } from "react";
import type {Rule} from "@/lib/regular";
import { Info,Sparkles } from "lucide-react";
import { publish,today,type Snapshot } from "@/lib/beta";
import { styles,suggestWeek,type Style } from "@/lib/suggest-week";
import type { Run } from "./program-builder";
import type { QuickProgram } from "./quick-coach";

export function Help({label,children}:{label:string;children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  return <div><button type="button" className="info-toggle" title={label} aria-label={label} aria-expanded={open} onClick={()=>setOpen(!open)}><Info size={17}/></button>{open&&<p className="help-note">{children}</p>}</div>;
}
export function WeekSuggestion({data,week,target,run,busy,onDraft,onNext,regularRules=[]}:{regularRules?:Rule[];data:Snapshot;week:string;target:string;run:Run;busy:boolean;onDraft:(draft:QuickProgram)=>void;onNext:()=>void}){
  const [style,setStyle]=useState<Style>("Medium"),[preview,setPreview]=useState(false),[message,setMessage]=useState("");
  const players=data.roster.filter(m=>m.role==="athlete"&&(!target||target===m.id));
  const unassigned=!players.length;
  const results=preview?(unassigned?[{id:"",name:"Unassigned draft"}]:players).map(p=>({p,...suggestWeek(data,week,p.id||"unassigned",style,today(),regularRules)})):[];
  const size=results.reduce((n,r)=>n+r.drafts.length,0);
  async function accept(){
    const rows=results.flatMap(r=>r.drafts.map(d=>({id:crypto.randomUUID(),athlete:r.p.id,squad:data.me.squad,title:d.title,day:d.day,exercises:d.exercises,program_name:style+" week"})));
    if(rows.length&&await run(()=>publish(rows))){setPreview(false);setMessage(rows.length+" suggested sessions added to the planner.");}
  }
  return <section className="week-suggest grid"><div className="feature-heading"><h3><Sparkles size={17}/> Suggest weekly program</h3><Help label="How weekly suggestions work">Choose a style and preview each athlete’s additions. Existing sets, previous logged sets, hard ratings and court time limit the draft. Games and occupied training days are protected. Add to planner when ready.</Help></div>
    <div className="day-strip">{styles.map(s=><button key={s} className={"btn "+(style===s?"selected":"")} aria-pressed={s===style} onClick={()=>{setStyle(s);setPreview(false);setMessage("");}}>{s}</button>)}<button disabled={busy} className="btn primary" onClick={()=>{setPreview(true);setMessage("");}}>Suggest week</button></div>
    {preview&&<>{unassigned&&<p role="status">No athletes yet. Preview and save a template now; invite an athlete before publishing.</p>}
      {results.map(r=><div className="week-review" key={r.p.id}><strong>{r.p.name}</strong><p>{r.existing} sets scheduled · {r.court} court minutes · {r.fixed} min faste aktiviteter · {r.logged} sets logged last week{r.hard?" · Hard feedback":""}</p>
      {r.drafts.length?<>{r.drafts.map(d=><details key={d.day}><summary>{d.day} · {d.title} · +{d.sets} sets</summary><ul>{d.exercises.map(l=><li key={l}>{l}</li>)}</ul></details>)}<button className="btn" onClick={()=>onDraft({name:style+" training week",start:week,target:r.p.id||"team",sessions:r.drafts.map(d=>({title:d.title,offset:Math.round((Date.parse(d.day)-Date.parse(week))/86400000),exercises:d.exercises}))})}>Edit in program builder</button></>:<small>No additional sessions fit this week’s load and open days.</small>}</div>)}
      {!size&&<button className="btn" onClick={onNext}>Plan next available week</button>}
      {!unassigned&&size>0&&<button className="btn primary" disabled={busy} onClick={accept}>Add {size} suggested sessions to planner</button>}</>}{message&&<p role="status">{message}</p>}</section>;
}
