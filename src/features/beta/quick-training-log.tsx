import {useEffect,useRef,useState} from "react";
import {strength} from "@/lib/strength";
import {court,courtEnabled} from "@/lib/court/client";
import type {Drill} from "@/lib/court/model";
import {baseDrills} from "@/lib/court/model";
import {referenceDrills} from "@/lib/court/films";
import type {LoggedExercise} from "@/lib/beta";
import {Check,Plus,Copy,Trash2} from "lucide-react";
import {quickTraining,type Snapshot} from "@/lib/beta";
import {wallTime,osloInstant} from "@/lib/court/model";
import type {Run} from "./program-builder";

export function QuickTrainingLog({data,run,busy}:{data:Snapshot;run:Run;busy:boolean}){
 const [open,setOpen]=useState(false),[title,T]=useState(""),[when,W]=useState(""),[minutes,M]=useState("30"),[message,S]=useState("");
 const [q,Q]=useState(""),[entries,E]=useState<LoggedExercise[]>([]);
 const [extra,X]=useState<Drill[]>([]);
 useEffect(()=>{if(!open||!courtEnabled)return;let ok=true;court(data).then(p=>{if(ok)X(p.catalog);}).catch(()=>{});return()=>{ok=false;};},[open,data]);
 const bank=[...strength.map(x=>({id:x.id,name:x.name,unit:(x.dose.includes("sec")?"sek":x.dose.includes(" m ")?"m":"rep") as LoggedExercise["unit"],source:"Styrke",alias:x.name==="Push-up"?"pushups pushup armheving armhevinger":x.name==="Back squat"?"knebøy":x.name==="Front plank"?"planke":""})),...[...baseDrills,...referenceDrills,...extra].map(x=>({id:x.id,name:x.title,unit:"min" as const,source:x.source,alias:x.theme})),...data.library.map(x=>({id:x.id,name:x.name,unit:"rep" as const,source:"Lagets øvelser",alias:""}))];
 const norm=(s:string)=>s.toLocaleLowerCase("nb").replace(/[\s-]/g,"");
 const hits=bank.filter((x,i)=>bank.findIndex(y=>y.id===x.id)===i).filter(x=>norm(x.name+" "+x.alias).includes(norm(q))).slice(0,8);
 const sessionName=title.trim()||entries[0]?.name||"";
 const request=useRef({key:"",id:""}),lock=useRef(false);
 return <section className="panel panel-pad grid">
 {open?<form className="grid" onSubmit={async e=>{
   e.preventDefault();if(lock.current)return;lock.current=true;
   try{
    const key=JSON.stringify([data.me.id,sessionName,when,minutes,entries]);if(request.current.key!==key)request.current={key,id:crypto.randomUUID()};
    const instant=osloInstant(when);if(Date.parse(instant)>Date.now())throw Error("Velg et tidspunkt som allerede har vært.");
    const ok=await run(()=>quickTraining(data.me,request.current.id,sessionName,when,instant,Number(minutes),entries));
    if(ok){setOpen(false);S(sessionName+" er lagt til i treningsloggen.");}else S("Kunne ikke bekrefte lagringen. Prøv igjen.");
   }catch(err){S((err as Error).message);}finally{lock.current=false;}
 }}>
 <h2>Registrer utført trening</h2>
 <label>Øktnavn<input maxLength={100} placeholder={entries[0]?.name||"F.eks. styrketrening"} value={title} onChange={e=>T(e.target.value)}/></label>
 <label>Finn øvelse<input autoFocus type="search" placeholder="Søk f.eks. pushups eller kast" value={q} onChange={e=>Q(e.target.value)}/></label>
 {q.trim()&&<div className="grid" aria-label="Øvelsesforslag">{hits.map(x=><button type="button" className="btn" key={x.id} onClick={()=>{E(prev=>[...prev,{id:x.id,name:x.name,unit:x.unit,sets:[0]}]);Q("");}} disabled={entries.length>=30||entries.some(e=>e.id===x.id)}><Plus size={15}/>{x.name} · {x.source}</button>)}{!hits.length&&<small>Ingen treff i øvelsesbanken.</small>}</div>}
 {entries.map((x,i)=><fieldset className="grid" key={x.id}><legend>{x.name}</legend>{x.sets.map((n,j)=><div key={j} className="dev-actions"><label>Sett {j+1} · {x.unit}<input type="number" inputMode="numeric" min="1" max="9999" required step="1" value={n||""} onChange={e=>{const v=Number(e.target.value);E(prev=>prev.map((row,k)=>k===i?{...row,sets:row.sets.map((v0,z)=>z===j?v:v0)}:row));}}/></label><button className="btn" type="button" aria-label={"Fjern sett "+(j+1)+" fra "+x.name} onClick={()=>E(prev=>prev.map((row,k)=>k===i?{...row,sets:row.sets.filter((_,z)=>j!==z)}:row).filter(row=>row.sets.length))}><Trash2 size={16}/></button></div>)}<button className="btn" type="button" disabled={!x.sets.at(-1)||x.sets.length>=30} onClick={()=>E(prev=>prev.map((row,k)=>k===i?{...row,sets:[...row.sets,row.sets.at(-1)!]}:row))}><Copy size={16}/>Kopier siste sett</button></fieldset>)}
 <div className="field-pair"><label>Dato og klokkeslett<input required type="datetime-local" value={when} max={wallTime(new Date().toISOString())} onChange={e=>W(e.target.value)}/></label>
 <label>Varighet (minutter)<input required type="number" min={1} max={600} step={1} value={minutes} onChange={e=>M(e.target.value)}/></label></div>
 <div className="dev-actions"><button disabled={busy||!sessionName} className="btn primary"><Check size={16}/>Lagre i treningsloggen</button><button disabled={busy} className="btn" type="button" onClick={()=>{setOpen(false);S("");}}>Avbryt</button></div>
 </form>:<button className="btn primary" onClick={()=>{T("");E([]);Q("");W(wallTime(new Date().toISOString()));M("30");S("");request.current={key:"",id:""};setOpen(true);}}><Plus size={18}/>Registrer utført trening</button>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
