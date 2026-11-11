import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { db, demo } from "@/lib/beta";
import { instructions, parseDraft, schemas, type Mode, type Suggestion } from "@/lib/coach-ai";

const labels={rewrite:"Polish text",program:"Suggest program",exercise:"Create exercise"};
export function CoachAI({source,apply}:{source:string;apply:(draft:Suggestion)=>void}){
  const [mode,setMode]=useState<Mode>("rewrite");
  const [brief,setBrief]=useState("");
  const [paste,setPaste]=useState("");
  const [draft,setDraft]=useState<Suggestion|null>(null);
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const prompt=mode==="rewrite"?'Coach request: '+(brief.trim()||"Improve clarity.")+"\nSession text:\n"+source:brief.trim();
  const ready=mode==="rewrite"?Boolean(source.trim()||brief.trim()):Boolean(brief.trim());
  const portable=instructions(mode)+"\nReturn only JSON matching this schema:\n"+JSON.stringify(schemas[mode])+"\n\n"+prompt;
  async function generate(){
    setBusy(true);setStatus("");setDraft(null);
    try{
      const session=await db?.auth.getSession();
      const token=session?.data.session?.access_token;
      const response=await fetch("/api/coach-ai",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify({mode,prompt})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||"Generation failed.");
      setDraft(parseDraft(mode,JSON.stringify(result)));
    }catch(error){setStatus((error as Error).message);}finally{setBusy(false);}
  }
  return <details className="library-tools"><summary><Sparkles size={17}/> AI coach assistant</summary><FeatureInfo topic="ai"/><div className="grid">
    <label>Draft task<select disabled={busy} value={mode} onChange={e=>{setMode(e.target.value as Mode);setDraft(null);setPaste("");setBrief("");setStatus("");}}>{Object.entries(labels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <label>{mode==="rewrite"?"Editing instructions":"Training brief"}<textarea maxLength={1800} rows={3} disabled={busy} value={brief} onChange={e=>{setBrief(e.target.value);setDraft(null);}} placeholder={mode==="rewrite"?"Make the current session instructions clearer.":mode==="program"?"Two weeks, two sessions per week, bands only, game on Saturday.":"A core stability drill for a handball warm-up using a band."}/></label>
    {mode==="rewrite"&&source&&<details><summary>Session text included</summary><pre className="ai-text">{source}</pre></details>}
    {!demo&&<button className="btn primary" disabled={busy||!ready} onClick={generate}><Sparkles size={15}/>{busy?"Generating…":"Generate with OpenAI"}</button>}
    <details className="library-tools" open={demo}><summary>Use my ChatGPT chat</summary><div className="grid">
      <label>Prepared request<textarea readOnly value={portable} rows={3} onFocus={e=>e.target.select()}/></label>
      <div className="day-strip"><button className="btn" disabled={!ready} onClick={async()=>{try{await navigator.clipboard.writeText(portable);setStatus("Request copied. Paste it into ChatGPT.");}catch{setStatus("Select the prepared request and copy it manually.");}}}>Copy request</button><a className="btn" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT</a></div>
      <label>ChatGPT JSON reply<textarea rows={3} maxLength={60000} value={paste} onChange={e=>{setPaste(e.target.value);setDraft(null);}}/></label><button className="btn" disabled={!paste.trim()||busy} onClick={()=>{try{setDraft(parseDraft(mode,paste));setStatus("");}catch(e){setDraft(null);setStatus((e as Error).message);}}}>Preview reply</button>
    </div></details>
    {draft&&<section className="grid"><h3>Review draft</h3>{draft.mode==="program"?<><strong>{draft.name}</strong>{draft.sessions.map((s,i)=><div key={i}><strong>Day {s.offset+1} · {s.title}</strong><ul>{s.exercises.map((line,k)=><li key={k}>{line}</li>)}</ul></div>)}</>:draft.mode==="exercise"?<p>{draft.name} · {draft.dose} · {draft.region}</p>:<pre className="ai-text">{draft.text}</pre>}
      <button className="btn primary" disabled={busy} onClick={()=>{apply(draft);setDraft(null);setStatus("Draft added to the editor for review.");}}>{draft.mode==="rewrite"?"Replace session text":draft.mode==="exercise"?"Fill exercise editor":"Replace program draft"}</button></section>}
    {status&&<p role="status">{status}</p>}
  </div></details>;
}
