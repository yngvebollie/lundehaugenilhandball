import {useState} from "react";
import {dateText} from "./development-radar";
import {label} from "@/lib/development/model";
import type {Packet} from "@/lib/development/types";
import type {Write} from "./development-forms";
export function MeritReview({packet,write,busy}:{packet:Packet;write:Write;busy:boolean}){
 const [kind,K]=useState("mission_complete"),[ref,R]=useState(""),[reason,M]=useState("");
 const {plan}=packet,superseded=new Set(plan.observations.filter(o=>!o.draft).map(o=>o.replaces));
 const choices=kind==="mission_complete"?plan.practices.filter(p=>p.verified&&!p.revoked).map(p=>({id:p.id,title:dateText(p.at)+" · "+(packet.catalog.find(e=>e.id===p.exercise)?.title||"Tidligere øvelse")})):
 [...plan.goals.filter(g=>g.status==="completed").map(g=>({id:g.id,title:g.title})),...plan.observations.filter(o=>!o.revoked&&!o.draft&&!superseded.has(o.id)).map(o=>({id:o.id,title:dateText(o.observed)+" · "+label(o.skill)}))];
 const known=plan.merits.filter(m=>m.key===kind&&!m.revoked);
 return <details className="dev-merit-review"><summary>Bekreft milepæl eller oppdrag</summary>
 <label>Type<select value={kind} onChange={e=>{K(e.target.value);R("");}}><option value="mission_complete">Fullført treneroppdrag</option><option value="rising_star">Utviklingsmilepæl</option></select></label>
 <label>Verifisert grunnlag<select value={ref} onChange={e=>R(e.target.value)}><option value="">Velg observasjon</option>{choices.filter(x=>!known.some(m=>m.ref===x.id)).map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
 <label>Begrunnelse<input maxLength={400} value={reason} onChange={e=>M(e.target.value)}/></label>
 <button disabled={busy||!reason.trim()||!ref} onClick={async()=>{if(await write("endorse",{badge:kind,ref,why:reason})){R("");M("");}}}>Bekreft grunnlag</button>
 {known.map(m=><p key={m.ref}>{m.why} <button disabled={busy||!reason.trim()} onClick={()=>write("retract",{badge:kind,ref:m.ref,why:reason})}>Trekk tilbake med begrunnelse</button></p>)}
 <small>Registrerer grunnlaget. Det deles ikke ut merker fra denne modulen i piloten.</small></details>;
}
