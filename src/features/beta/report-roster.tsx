import {useEffect,useState} from "react";
import {Link2} from "lucide-react";
import type {Member,Snapshot} from "@/lib/beta";
import {reportQueue,suggestions,type QueuePacket,type QueueRow,type ReportLink} from "@/lib/report-roster";
import {reportGroups,reportKey} from "@/lib/report-groups";

type Group=ReturnType<typeof reportGroups>[number];
function PlayerGroup({group,people,packet,busy,confirm}:{group:Group;people:Member[];packet:QueuePacket;busy:boolean;confirm:(rows:QueueRow[],athlete:Member)=>void}){
 const [choice,C]=useState<string>(),[overrides,O]=useState<Record<string,boolean>>({});
 const available=(r:QueueRow,id:string)=>!packet.links.some(l=>l.reg===r.reg&&l.athlete===id);
 const candidates=(r:QueueRow)=>suggestions(r,people);
 const eligible=people.filter(p=>group.rows.some(r=>available(r,p.id)));
 const proposed=new Set(group.rows.flatMap(r=>candidates(r).filter(p=>available(r,p.id)).map(p=>p.id)));
 const id=choice??(proposed.size===1?[...proposed][0]:""),athlete=eligible.find(p=>p.id===id);
 const selected=(r:QueueRow)=>!!athlete&&available(r,id)&&(overrides[reportKey(r)]??(candidates(r).length===1&&candidates(r)[0].id===id));
 const chosen=group.rows.filter(selected);
 return <article className="report-row"><header><h3>{group.name}</h3><label>Registrert spiller<select aria-label={"Registrert spiller for "+group.name} disabled={busy||!eligible.length} value={athlete?id:""} onChange={e=>{C(e.target.value);O({});}}>
 <option value="">{eligible.length?proposed.size>1?"Flere mulige treff · velg spiller":"Velg spiller":"Ingen tilgjengelige spillere"}</option>
 {eligible.map(p=><option key={p.id} value={p.id}>{p.name}{p.shirt_number?" · #"+p.shirt_number:""}{proposed.has(p.id)?" · forslag":""}</option>)}</select></label></header>
 <fieldset><legend>Lag</legend>{group.rows.map(r=>{const key=reportKey(r),matches=candidates(r),blocked=!!athlete&&!available(r,id);
 return <label className="report-team" key={key}><input type="checkbox" aria-label={r.squad} checked={selected(r)} disabled={busy||!athlete||blocked} onChange={e=>O({...overrides,[key]:e.target.checked})}/><span><strong>{r.squad}</strong><small>{r.shirts.length?"#"+r.shirts.join(" / #")+" · ":""}{r.games} {r.games===1?"rapport":"rapporter"}</small></span><small>{blocked?"Kontoen er allerede koblet her":matches.length===1&&matches[0].id===id?"Fornavn og draktnr. stemmer":matches.length>1?"Flere mulige treff":"Kontroller manuelt"}</small></label>;})}</fieldset>
 <button className="btn" disabled={busy||!athlete||!chosen.length} onClick={()=>athlete&&confirm(chosen,athlete)}><Link2 size={16}/>Koble spiller{chosen.length>1?" · "+chosen.length+" lag":""}</button></article>;
}
export function ReportRoster({data}:{data:Snapshot}){
 const [packet,setPacket]=useState<QueuePacket>(),[busy,B]=useState(false),[note,N]=useState(""),[error,E]=useState(""),[retry,R]=useState(0),[search,S]=useState("");
 const [mode,M]=useState<"open"|"linked">("open"),[reg,F]=useState(""),[pending,P]=useState<ReportLink>();
 const t=data.me.squad;
 useEffect(()=>{let live=true;E("");reportQueue(data).then(p=>{if(live)setPacket(p);}).catch(e=>{if(live)E(e.message);});return()=>{live=false;};},[t,retry]);
 const people=data.roster.filter(p=>p.role==="athlete"&&p.squad===t).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 async function confirm(rows:QueueRow[],athlete:Member){B(true);N("");E("");try{setPacket(await reportQueue(data,{athlete:athlete.id,rows}));N("Koblet til "+athlete.name+": "+rows.map(r=>r.squad).join(", ")+".");}
 catch(e){E((e as Error).message);}finally{B(false);}}
 const teams=new Map([...(packet?.rows||[]),...(packet?.links||[])].map(r=>[r.reg,r.squad]));
 const groups=reportGroups((packet?.rows||[]).filter(r=>!reg||r.reg===reg)),needle=search.trim().toLocaleLowerCase("nb");
 const visible=groups.filter(g=>g.rows.some(r=>[r.name,r.squad,...r.shirts].join(" ").toLocaleLowerCase("nb").includes(needle)));
 const linked=people.map(m=>({m,rows:(packet?.links||[]).filter(l=>l.athlete===m.id&&(!reg||l.reg===reg))})).filter(g=>g.rows.length>0);
 async function undo(l:ReportLink){B(true);N("");E("");try{setPacket(await reportQueue(data,undefined,l));P(undefined);N("Koblingen til "+l.squad+" er fjernet. De andre lagene er uendret.");}catch(e){E((e as Error).message);}finally{B(false);}}
 const found=linked.filter(({m,rows})=>[m.name,m.shirt_number,...rows.flatMap(r=>[r.name,r.squad])].join(" ").toLocaleLowerCase("nb").includes(needle));
 return <section className="report-layout"><nav className="report-team-nav" aria-label="Filtrer på lag"><button className="btn" aria-pressed={!reg} onClick={()=>{F("");P(undefined);}}>ALLE LAG</button>{[...teams].sort((a,b)=>a[1].localeCompare(b[1],"nb")).map(([id,label])=><button key={id} className="btn" aria-pressed={reg===id} onClick={()=>{F(id);P(undefined);}}>{label}</button>)}</nav>
 <div className="grid report-queue"><nav aria-label="Koblingsstatus" className="workspace-tabs">{([["open","Ukoblede"],["linked","Koblede"]] as const).map(([k,label])=><button key={k} className={mode===k?"current":""} aria-pressed={mode===k} onClick={()=>{M(k);P(undefined);S("");N("");}}>{label}</button>)}</nav>
 <header><h2>{mode==="open"?"Ukoblede rapportspillere":"Koblede spillere"}{packet&&" ("+(mode==="open"?groups.length:linked.length)+")"}</h2><small>Eget lag · aktiv sesong</small></header>
 {note&&<p role="status">{note}</p>}{error&&<p role="alert">{error} <button className="btn" disabled={busy} onClick={()=>{setPacket(undefined);R(retry+1);}}>Oppdater listen</button></p>}
 {!packet?!error&&<p>Henter rapportspillere …</p>:mode==="linked"?<><label>Søk i koblede spillere<input type="search" value={search} onChange={e=>S(e.target.value)} placeholder="Navn, draktnummer eller lag"/></label>
 {found.map(({m,rows})=><article className="report-row" key={m.id}><h3><a href={"/spillere?athlete="+m.id}>{m.shirt_number?"#"+m.shirt_number+" ":""}{m.name}</a></h3>{rows.map(l=><div className="linked-entry" key={l.reg}><div><strong>{l.squad}</strong><small>{l.name} · {l.origin==="roster"?"Automatisk treff":"Trenerkobling"}</small></div>{pending===l?<div><button className="btn" disabled={busy} onClick={()=>P(undefined)}>Avbryt</button> <button className="btn" disabled={busy} onClick={()=>undo(l)}>Fjern kobling</button></div>:<button className="btn" aria-label={"Angre kobling til "+l.squad+" for "+m.name} onClick={()=>P(l)}>Angre kobling</button>}</div>)}</article>)}
 {!found.length&&<p>{linked.length?"Ingen treff i søket.":"Ingen koblede spillere i dette utvalget."}</p>}</>:!groups.length?<p>Ingen ukoblede spillere i lagets kamprapporter.</p>:<><label>Søk i rapportspillere<input type="search" placeholder="Navn, draktnummer eller lag" value={search} onChange={e=>S(e.target.value)}/></label>
 {groups.map(g=><div key={g.key} hidden={!visible.includes(g)}><PlayerGroup group={g} people={people} packet={packet} busy={busy} confirm={confirm}/></div>)}{!visible.length&&<p>Ingen treff i søket.</p>}</>}</div></section>;
}
