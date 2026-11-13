import {useRef,useState} from "react";
import {Check,Plus} from "lucide-react";
import {quickTraining,type Snapshot} from "@/lib/beta";
import {wallTime,osloInstant} from "@/lib/court/model";
import type {Run} from "./program-builder";

export function QuickTrainingLog({data,run,busy}:{data:Snapshot;run:Run;busy:boolean}){
 const [open,setOpen]=useState(false),[title,T]=useState(""),[when,W]=useState(""),[minutes,M]=useState("30"),[message,S]=useState("");
 const request=useRef({key:"",id:""}),lock=useRef(false);
 return <section className="panel panel-pad grid">
 {open?<form className="grid" onSubmit={async e=>{
   e.preventDefault();if(lock.current)return;lock.current=true;
   try{
    const key=JSON.stringify([data.me.id,title.trim(),when,minutes]);if(request.current.key!==key)request.current={key,id:crypto.randomUUID()};
    const instant=osloInstant(when);if(Date.parse(instant)>Date.now())throw Error("Velg et tidspunkt som allerede har vært.");
    const ok=await run(()=>quickTraining(data.me,request.current.id,title,when,instant,Number(minutes)));
    if(ok){setOpen(false);S(title.trim()+" er lagt til i treningsloggen.");}else S("Kunne ikke bekrefte lagringen. Prøv igjen.");
   }catch(err){S((err as Error).message);}finally{lock.current=false;}
 }}>
 <h2>Registrer utført trening</h2>
 <label>Hva trente du?<input autoFocus required maxLength={100} placeholder="F.eks. styrketrening" value={title} onChange={e=>T(e.target.value)}/></label>
 <div className="field-pair"><label>Dato og klokkeslett<input required type="datetime-local" value={when} max={wallTime(new Date().toISOString())} onChange={e=>W(e.target.value)}/></label>
 <label>Varighet (minutter)<input required type="number" min={1} max={600} step={1} value={minutes} onChange={e=>M(e.target.value)}/></label></div>
 <div className="dev-actions"><button disabled={busy||!title.trim()} className="btn primary"><Check size={16}/>Lagre i treningsloggen</button><button disabled={busy} className="btn" type="button" onClick={()=>{setOpen(false);S("");}}>Avbryt</button></div>
 </form>:<button className="btn primary" onClick={()=>{T("");W(wallTime(new Date().toISOString()));M("30");S("");request.current={key:"",id:""};setOpen(true);}}><Plus size={18}/>Registrer utført trening</button>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
