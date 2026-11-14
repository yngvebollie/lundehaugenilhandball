import {useEffect,useState} from "react";
import {Link2} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {reportQueue,suggestions,type QueuePacket,type QueueRow} from "@/lib/report-roster";

export function ReportRoster({data}:{data:Snapshot}){
 const [packet,setPacket]=useState<QueuePacket>(),[choice,setChoice]=useState<Record<string,string>>({}),[busy,B]=useState(false),[note,N]=useState(""),[error,E]=useState(""),[retry,R]=useState(0),[search,S]=useState("");
 const t=data.me.squad;
 useEffect(()=>{let live=true;E("");reportQueue(data).then(p=>{if(live)setPacket(p);}).catch(e=>{if(live)E(e.message);});return()=>{live=false;};},[t,retry]);
 const people=data.roster.filter(p=>p.role==="athlete"&&p.squad===t).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 async function confirm(row:QueueRow,id:string){B(true);N("");E("");try{setPacket(await reportQueue(data,{reg:row.reg,player:row.player,athlete:id}));N(row.name+" er koblet til "+people.find(p=>p.id===id)?.name+" · "+row.squad+".");}
 catch(e){E((e as Error).message);}finally{B(false);}}
 const rows=(packet?.rows||[]).filter(r=>[r.name,r.squad,...r.shirts].join(" ").toLocaleLowerCase("nb").includes(search.trim().toLocaleLowerCase("nb")));
 return <section className="grid report-queue"><header><h2>Ukoblede rapportspillere{packet&&" ("+packet.rows.length+")"}</h2><small>Eget lag · aktiv sesong</small></header>
 {note&&<p role="status">{note}</p>}{error&&<p role="alert">{error} <button className="btn" disabled={busy} onClick={()=>R(retry+1)}>Oppdater listen</button></p>}
 {!packet?!error&&<p>Henter rapportspillere …</p>:!packet.rows.length?<p>Ingen ukoblede spillere i lagets kamprapporter.</p>:<><label>Søk i rapportspillere<input type="search" placeholder="Navn, draktnummer eller spillelag" value={search} onChange={e=>S(e.target.value)}/></label>
 {rows.map(row=>{const key=row.reg+":"+row.player,eligible=people.filter(p=>!packet.links.some(l=>l.reg===row.reg&&l.athlete===p.id)),matches=suggestions(row,eligible);
 const id=choice[key]??(matches.length===1?matches[0].id:""),selected=eligible.some(p=>p.id===id);
 return <article className="report-row" key={key}><div><strong>{row.shirts.length?"#"+row.shirts.join(" / #")+" ":""}{row.name}</strong><small>{row.squad} · {row.games} {row.games===1?"rapport":"rapporter"}</small></div>
 <label>{matches.length===1?"Forslag: fornavn og draktnummer stemmer":matches.length?"Flere mulige treff":"Ingen treff på fornavn og draktnummer"}<select aria-label={"Registrert spiller for "+row.name+" · "+row.squad} disabled={busy||!eligible.length} value={selected?id:""} onChange={e=>setChoice({...choice,[key]:e.target.value})}><option value="">{eligible.length?"Velg registrert spiller":"Ingen tilgjengelige spillere"}</option>
 {[...matches,...eligible.filter(p=>!matches.includes(p))].map(p=><option key={p.id} value={p.id}>{p.name}{p.shirt_number?" · #"+p.shirt_number:""}{matches.includes(p)?" · forslag":""}</option>)}</select></label>
 <button className="btn" disabled={busy||!selected} onClick={()=>confirm(row,id)}><Link2 size={16}/>Bekreft kobling</button></article>;})}{!rows.length&&<p>Ingen treff i søket.</p>}</>}</section>;
}
