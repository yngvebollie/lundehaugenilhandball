import {useEffect,useState} from "react";
import {CalendarDays,ChevronLeft,ChevronRight,History,Mail,Plus,Search,Trash2,Users} from "lucide-react";
import {changePlayer,playerLog,publish,today,type Assignment,type Member,type PlayerLog,type Snapshot} from "@/lib/beta";
import {court,courtEnabled,type Doc} from "@/lib/court/client";
import {wallTime} from "@/lib/court/model";
import {regular} from "@/lib/coach-feedback";
import {plusDay,onDate,type Rule} from "@/lib/regular";
import {monday,weekLabel,type EventKind} from "@/lib/workload";
import {Conversation} from "./athlete-team";
import type {Run} from "./program-builder";
import "./player-desk.css";

const kinds={Session:"Økt",Practice:"Trening",Game:"Kamp"};
const split=(v:string)=>v.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const dateLabel=(day:string)=>new Intl.DateTimeFormat("nb-NO",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(day+"T12:00Z"));
type Props={data:Snapshot;busy:boolean;run:Run};
export function PlayerDesk({data,busy,run}:Props){
 const [query,Q]=useState(""),[week,W]=useState(()=>monday(today())),[expanded,X]=useState(""),[docs,D]=useState<Doc[]>([]),[rules,R]=useState<Rule[]>([]),[warn,E]=useState("");
 useEffect(()=>{let active=true;Promise.allSettled([courtEnabled?court(data).then(p=>p.sessions):Promise.resolve([] as Doc[]),regular(data)]).then(([c,r])=>{if(!active)return;D(c.status==="fulfilled"?c.value:[]);R(r.status==="fulfilled"?r.value:[]);E([c.status==="rejected"?"Håndballøktene kunne ikke hentes.":"",r.status==="rejected"?"Faste aktiviteter kunne ikke hentes.":""].filter(Boolean).join(" "));});return()=>{active=false;};},[data]);
 const all=data.roster.filter(m=>m.role==="athlete"&&m.squad===data.me.squad).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 const players=all.filter(m=>(m.name+" "+(m.shirt_number||"")).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <section className="player-desk"><header><div><small>{data.teams.find(t=>t.id===data.me.squad)?.name}</small><h2><Users size={20}/> {all.length} registrerte spillere</h2></div>
 <div className="dev-actions"><button className="btn" title="Forrige uke" aria-label="Forrige uke" onClick={()=>W(plusDay(week,-7))}><ChevronLeft size={16}/></button><button className="btn" onClick={()=>W(monday(today()))}>Denne uken</button><button className="btn" title="Neste uke" aria-label="Neste uke" onClick={()=>W(plusDay(week,7))}><ChevronRight size={16}/></button></div></header>
 <div className="desk-filters"><label><Search size={15}/> Søk etter spiller<input type="search" value={query} onChange={e=>Q(e.target.value)} placeholder="Navn eller draktnummer"/></label><label>{weekLabel(week)}<input aria-label="Velg uke med dato" type="date" value={week} onChange={e=>{if(e.target.value)W(monday(e.target.value));}}/></label></div>
 {warn&&<p role="alert">{warn}</p>}{!players.length&&<p>{all.length?"Ingen spillere passer søket.":"Laget har ingen registrerte utøvere ennå."}</p>}
 {players.map(m=>{const end=plusDay(week,7),plans=data.plans.filter(a=>a.athlete===m.id&&a.day>=week&&a.day<end);
 const rows:{day:string;time:string;title:string;meta:string;plan?:Assignment;link?:string}[]=plans.map(a=>({day:a.day,time:a.start_time?.slice(0,5)||"",title:a.title,meta:(a.personal?"Egentrening":kinds[a.kind||"Session"])+(a.minutes?" · "+a.minutes+" min":""),plan:a}));
 for(const d of docs){const shared=d.sharedPlan||d.plan,dt=wallTime(shared.start);if(d.published&&!d.archived&&(!d.audience||d.audience.includes(m.id))&&dt.slice(0,10)>=week&&dt.slice(0,10)<end)rows.push({day:dt.slice(0,10),time:dt.slice(11),title:shared.title,meta:"Delt håndballøkt",link:"/okter?edit="+d.id});}
 for(let day=week;day<end;day=plusDay(day,1))for(const r of onDate(rules,day,m.id))rows.push({day,time:r.profile_gym?"":r.clock.slice(0,5),title:r.title,meta:"Fast aktivitet · "+r.minutes+" min"});
 rows.sort((a,b)=>a.day.localeCompare(b.day)||a.time.localeCompare(b.time));
 return <article className="desk-player" key={m.id}><header><div><small>{m.shirt_number?"Drakt #"+m.shirt_number:"Spiller"}</small><h3>{m.name}</h3></div><span>{rows.length} aktiviteter</span></header>
 {rows.length?<ul>{rows.map((r,i)=><li key={r.plan?.id||r.link||r.day+i}><time>{dateLabel(r.day)} {r.time}</time><div><strong>{r.title}</strong><small>{r.meta}</small></div>{r.link?<a href={r.link}>Åpne fellesøkt</a>:r.plan&&!r.plan.personal&&r.day>=today()&&!data.checks.some(c=>c.assignment===r.plan!.id)?<details><summary>Endre</summary><EditActivity key={JSON.stringify(r.plan.exercises)} data={data} run={run} busy={busy} a={r.plan}/></details>:null}</li>)}</ul>:<p className="muted">Ingen aktiviteter denne uken.</p>}
 <div className="dev-actions">{([["plan","Legg til aktivitet",Plus],["chat","Melding",Mail],["log","Trenerlogg",History]] as const).map(([id,label,Icon])=><button key={id} className="btn" aria-expanded={expanded===m.id+id} onClick={()=>X(expanded===m.id+id?"":m.id+id)}><Icon size={16}/>{label}</button>)}</div>
 {expanded===m.id+"plan"&&<AddActivity key={m.id+week} {...{data,busy,run}} player={m} day={week===monday(today())?today():week} done={()=>X("")}/>}
 {expanded===m.id+"chat"&&<Conversation data={data} player={m.id}/>}
 {expanded===m.id+"log"&&<Audit data={data} player={m.id}/>}</article>;})}</section>;
}
function AddActivity({data,busy,run,player,day,done}:Props&{player:Member;day:string;done:()=>void}){
 const [kind,K]=useState<EventKind>("Session");
 return <form className="desk-form grid" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget),val=(k:string)=>String(f.get(k)||"").trim(),ex=kind==="Session"?split(val("lines")):["Attended "+kind.toLowerCase()];
 if(await run(async()=>{if(!val("title")||!ex.length||ex.length>40||ex.some(x=>x.length>250))throw Error("Skriv navn og 1–40 øvelser (maks 250 tegn hver).");await publish([{id:crypto.randomUUID(),squad:data.me.squad,athlete:player.id,title:val("title"),kind,day:val("day"),start_time:val("time")||null,minutes:Number(val("minutes")),exercises:ex}]);}))done();}}>
 <h4>Ny aktivitet for {player.name}</h4><label>Aktivitetstype<select value={kind} onChange={e=>K(e.target.value as EventKind)}>{Object.entries(kinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label>Navn på aktivitet<input name="title" required maxLength={100}/></label><div className="desk-filters"><label>Dato<input name="day" type="date" required defaultValue={day}/></label><label>Klokkeslett<input name="time" type="time"/></label><label>Minutter<input name="minutes" type="number" required min={1} max={600} defaultValue={45}/></label></div>
 {kind==="Session"&&<label>Øvelser, én per linje<textarea required name="lines" rows={3}/></label>}<button disabled={busy} className="btn primary"><CalendarDays size={16}/>Legg til i spillerens plan</button></form>;
}
function EditActivity({data,busy,run,a}:Props&{a:Assignment}){
 const [value,V]=useState(a.exercises.join("\n")),[note,N]=useState("");
 return <div className="desk-form grid">{(!a.kind||a.kind==="Session")&&<><label>Øvelser, én per linje<textarea value={value} onChange={e=>{V(e.target.value);N("");}}/></label><button className="btn" disabled={busy||!value.trim()||a.exercises.join("\n")===value} onClick={async()=>{if(await run(()=>changePlayer(data,a.athlete,a.id,"exercises",a.exercises,split(value))))N("Øvelsene er lagret.");}}>Lagre øvelser</button></>}
 <button className="btn" disabled={busy} onClick={()=>{if(confirm("Fjerne «"+a.title+"» fra denne spillerens plan?"))void run(()=>changePlayer(data,a.athlete,a.id,"remove",a.exercises));}}><Trash2 size={15}/>Fjern aktivitet</button>{note&&<small role="status">{note}</small>}</div>;
}
function Audit({data,player}:{data:Snapshot;player:string}){
 const [rows,R]=useState<PlayerLog[]>([]),[limit,L]=useState(30),[error,E]=useState(""),[loading,B]=useState(true);
 useEffect(()=>{let live=true;B(true);playerLog(data.me.squad,player,limit+1).then(v=>{if(live){R(v);E("");}}).catch(e=>{if(live)E(e.message);}).finally(()=>{if(live)B(false);});return()=>{live=false;};},[data,player,limit]);
 return <section className="desk-form"><h4>Trenerlogg</h4>{error?<p role="alert">{error}</p>:!rows.length?<p>{loading?"Henter loggen …":"Ingen loggførte hendelser ennå."}</p>:<ol>{rows.slice(0,limit).map(x=><li key={x.id}><strong>{x.action}</strong><small>{new Date(x.at_time).toLocaleString("nb-NO",{timeZone:"Europe/Oslo"})} · {data.roster.find(m=>m.id===x.actor)?.name||"Trener"}</small><p>{x.detail}</p></li>)}</ol>}{rows.length>limit&&<button className="btn" onClick={()=>L(limit+30)}>Vis eldre hendelser</button>}</section>;
}
