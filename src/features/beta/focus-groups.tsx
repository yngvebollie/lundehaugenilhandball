import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import { Target } from "lucide-react";
import { toggleFocus, type Snapshot } from "@/lib/beta";
import { focuses } from "@/lib/focus";
import type { Run } from "./program-builder";
import type { QuickProgram } from "./quick-coach";

export function FocusGroups({data,date,busy,run,onDraft}:{data:Snapshot;date:string;busy:boolean;run:Run;onDraft:(d:QuickProgram)=>void}){
  const [selected,setSelected]=useState(0);
  const focus=focuses[selected],members=data.focusMembers.filter(r=>r.focus===focus.id);
  const players=data.roster.filter(m=>m.role==="athlete");
  return <details className="library-tools focus-groups"><summary><Target size={16}/> Development groups · coaches only</summary><FeatureInfo topic="groups"/>
    <div className="grid"><label>Training focus<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{focuses.map((f,i)=><option key={f.id} value={i}>{f.name}</option>)}</select></label>
    <p className="muted">Athletes see assigned sessions, not group membership or focus labels.</p>
    <fieldset><legend>Athletes · {members.length} selected</legend>{players.map(p=>{const checked=members.some(r=>r.athlete===p.id);
      return <label key={p.id}><input type="checkbox" checked={checked} disabled={busy} onChange={e=>{const add=e.target.checked;void run(()=>toggleFocus({squad:data.me.squad,athlete:p.id,focus:focus.id},add));}}/>{p.name}</label>;
    })}{!players.length&&<a href="/team">Invite athletes</a>}</fieldset>
    <ul>{focus.lines.map(l=><li key={l}>{l}</li>)}</ul>
    <button className="btn" onClick={()=>onDraft({name:focus.session,start:date,target:"focus:"+focus.id,sessions:[{title:focus.session,offset:0,exercises:[...focus.lines]}]})}>Draft exercises for this group</button></div>
  </details>;
}
