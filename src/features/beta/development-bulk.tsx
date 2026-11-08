import {useEffect,useState} from "react";
import {plannerBridge} from "@/lib/development/flags";
import type {Snapshot} from "@/lib/beta";
import {development} from "@/lib/development/client";
import {busyGoal,type Goal} from "@/lib/development/model";
type Row={id:string;name:string;goals:Goal[]};
export function BulkPractice({data,rows}:{data:Snapshot;rows:Row[]}){
 const ids=[...new Set(rows.flatMap(r=>r.goals.filter(busyGoal).flatMap(g=>g.assignments.map(a=>a.exercise))))];
 const [exercise,E]=useState(""),[selected,S]=useState<string[]>([]),[catalog,C]=useState<Map<string,string>>(new Map()),[busy,B]=useState(false),[notice,N]=useState(""),[results,R]=useState<Record<string,string>>({}),[keys,K]=useState<Record<string,string>>({});
 useEffect(()=>{let live=true;if(rows[0])development(data,rows[0].id).then(p=>{if(live)C(new Map(p.catalog.map(e=>[e.id,e.title])))}).catch(()=>{if(live)N("Kunne ikke hente øvelsesbiblioteket.");});return()=>{live=false}},[data,rows]);
 const relevant=rows.filter(r=>r.goals.some(g=>busyGoal(g)&&g.assignments.some(a=>a.exercise===exercise))),reset=()=>{S([]);R({});K({});N("");};
 async function confirm(){if(busy||!selected.length)return;B(true);const next={...results},pending={...keys};
  for(const row of relevant.filter(r=>selected.includes(r.id)&&next[r.id]!=="Registrert")){
   pending[row.id]??=crypto.randomUUID();try{
    const packet=await development(data,row.id),goals=row.goals.filter(g=>busyGoal(g)&&g.assignments.some(a=>a.exercise===exercise)).map(g=>g.id);
    await development(data,row.id,packet.rev,{action:"practice",key:pending[row.id],v:{goals,exercise,context:"Bekreftet av trener i fellesøvelse"}});next[row.id]="Registrert";
   }catch(e){next[row.id]=(e as Error).message||"Ikke lagret";}R({...next});K({...pending});
  }B(false);N("Se resultat ved hver spiller.");}
 return <details className="dev-bulk"><summary>Bekreft faktisk øving for flere spillere</summary>
 <label>Felles øvelse<select value={exercise} onChange={e=>{E(e.target.value);reset();}} disabled={busy}><option value="">Velg tildelt øvelse</option>{ids.filter(i=>catalog.has(i)).map(id=><option key={id} value={id}>{catalog.get(id)}</option>)}</select></label>
 {exercise&&<><p>Velg bare spillere du observerte i denne øvelsen.</p>{relevant.map(p=><label className="dev-check" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} disabled={busy||results[p.id]==="Registrert"} onChange={e=>S(e.target.checked?[...selected,p.id]:selected.filter(x=>x!==p.id))}/>{p.name} {results[p.id]&&<strong>{results[p.id]}</strong>}</label>)}
 <button className="dev-primary" disabled={busy||!selected.length||selected.every(id=>results[id]==="Registrert")} onClick={confirm}>Bekreft øving for {selected.length} spillere</button>
 {plannerBridge&&data.me.squad!=="development-preview"&&<a className="dev-secondary" href={"/?devExercise="+encodeURIComponent(exercise)+"#builder"}>Legg øvelse til i øktutkast</a>}</>}{notice&&<p role="status">{notice}</p>}</details>;
}
