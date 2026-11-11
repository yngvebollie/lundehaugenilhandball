import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { db,demo } from "@/lib/beta";
import { parseDraft } from "@/lib/coach-ai";
import { briefDraft } from "@/lib/suggest-week";
import { Help } from "./week-suggestion";

export type QuickProgram=ReturnType<typeof briefDraft>&{start?:string;target?:string};
export function QuickCoach({onApply}:{onApply:(program:QuickProgram)=>void}){
  const [brief,setBrief]=useState(""),[draft,setDraft]=useState<QuickProgram|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function suggest(){
    setBusy(true);setError("");setDraft(null);
    try{
      if(demo)setDraft(briefDraft(brief));
      else {
        const token=(await db?.auth.getSession())?.data.session?.access_token;
        const response=await fetch("/api/coach-ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({mode:"program",prompt:brief})});
        const result=await response.json();if(!response.ok)throw Error(result.error||"Could not generate this program.");
        const parsed=parseDraft("program",JSON.stringify(result));if(parsed.mode==="program")setDraft(parsed);
      }
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section id="ai-coach" className="quick-coach panel panel-pad grid"><div className="feature-heading"><FeatureInfo topic="ai"><h2><Sparkles/> Coach AI</h2></FeatureInfo><Help label="How to use Coach AI">Describe the body focus, difficulty and whether you want one workout or a week. Review the suggestion, open it in the builder, then edit, save or publish. For suggestions based on scheduled team load, choose Suggest week in Weekly planner.</Help></div>
    <form className="prompt-row" onSubmit={e=>{e.preventDefault();void suggest();}}><label>Describe your workout<input required maxLength={1800} value={brief} disabled={busy} onChange={e=>{setBrief(e.target.value);setDraft(null);}} placeholder="Lower body medium workout"/></label><button disabled={busy||!brief.trim()} className="btn primary">{busy?"Drafting…":"Suggest program"}</button></form>
    <small className="muted">{demo?"Local exercise-library suggestions":"OpenAI assisted"} · Coach review before publishing</small>
    {error&&<p role="alert">{error}</p>}{draft&&<div className="grid"><strong>{draft.name}</strong>{draft.sessions.map((s,i)=><div key={i}><b>Day {s.offset+1} · {s.title}</b><ul>{s.exercises.map((l,k)=><li key={k}>{l}</li>)}</ul></div>)}<button className="btn" onClick={()=>onApply(draft)}>Use in builder · replace current draft</button></div>}
  </section>;
}
