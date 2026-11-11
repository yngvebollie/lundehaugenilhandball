import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { broadZones, strength, type Lift } from "@/lib/strength";
import { recordExerciseUse, type Snapshot } from "@/lib/beta";
import { BodyMap } from "./body-map";
import type { Run } from "./program-builder";

export function StrengthPicker({data,run,busy,append}:{data:Snapshot;run:Run;busy:boolean;append:(line:string)=>void}){
  const [query,setQuery]=useState(""),[focus,setFocus]=useState("All"),[id,setId]=useState("");
  const [notice,setNotice]=useState("");
  const usage=new Map(data.usage.map(x=>[x.exercise_key,x]));
  const items:Lift[]=[...strength,...data.library.map(e=>({...e,zones:broadZones[e.region]||[]}))];
  const visible=items.filter(e=>(focus==="All"||e.region===focus)&&[e.name,...e.zones].join(" ").toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a,b)=>(usage.get(b.id)?.uses||0)-(usage.get(a.id)?.uses||0)||(usage.get(b.id)?.last_used||"").localeCompare(usage.get(a.id)?.last_used||"")||a.name.localeCompare(b.name));
  const selected=visible.find(e=>e.id===id)||visible[0];
  async function add(item:Lift){
    if(await run(()=>recordExerciseUse(data.me.id,item.id))){
      append("["+item.region+"] "+item.name+" · "+item.dose);
      setId(item.id);setNotice(item.name+" added to session.");
    }
  }
  return <section className="strength-picker grid" id="strength-library"><header><FeatureInfo topic="library"><h3>Strength library</h3></FeatureInfo><small className="muted">{strength.length} handball lifts · {data.library.length} team exercises · Your most used first</small></header>
    <div className="field-pair"><label><span><Search size={13}/> Search exercises</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name or muscle"/></label><label>Body focus<select value={focus} onChange={e=>setFocus(e.target.value)}>{["All",...new Set(items.map(x=>x.region))].map(r=><option key={r}>{r}</option>)}</select></label></div>
    {selected?<><div className="lift-browser"><div className="lift-list" aria-label="Exercises ranked by your usage">{visible.map(e=><button key={e.id} aria-pressed={selected.id===e.id} onClick={()=>{setId(e.id);setNotice("");}}><span>{e.name}</span><small>{usage.get(e.id)?.uses?usage.get(e.id)?.uses+" uses":e.region}</small></button>)}</div><div className="anatomy"><BodyMap zones={selected.zones}/><span><i/> Target muscles</span></div></div>
    <div className="lift-summary"><div><strong>{selected.name}</strong><p>{selected.zones.join(" · ")||selected.region}</p><small>{selected.dose}</small></div><button className="btn primary" disabled={busy} onClick={()=>add(selected)}><Plus size={15}/>Add to session</button></div></>:<p>No exercises match this search.</p>}{notice&&<small role="status">{notice}</small>}</section>;
}
