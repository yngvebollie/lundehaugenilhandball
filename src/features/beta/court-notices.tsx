import {useEffect,useState} from "react";
import {Bell,Video} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {court,type Packet} from "@/lib/court/client";
import {media} from "@/lib/court/films";
import {wallTime} from "@/lib/court/model";

// The published audience is evaluated by the same RPC as the session itself.
// Deriving the inbox from that snapshot avoids duplicate or stale invitations.
export function CourtNotices({data}:{data:Snapshot}){
 const [packet,P]=useState<Packet>(),[now,N]=useState(()=>new Date().toISOString()),[error,E]=useState("");
 useEffect(()=>{let active=true,request=0;
  const refresh=async()=>{const id=++request;try{const result=await court(data);if(active&&id===request){P(result);E("");N(new Date().toISOString());}}catch{if(active&&id===request){P(undefined);E("Kunne ikke hente dagens treningsmeldinger.");}}};
  void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);window.addEventListener("focus",refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};},[data]);
 if(error)return <small role="status">{error}</small>;
 if(!packet)return null;
 const day=wallTime(now).slice(0,10),limit=new Date(Date.parse(day+"T12:00:00Z")+7*86400000).toISOString().slice(0,10);
 const rows=packet.sessions.filter(s=>s.published&&!s.archived&&s.plan.purpose==="team"&&s.plan.start).map(s=>{
  const date=wallTime(s.plan.start).slice(0,10),films=s.plan.items.flatMap(i=>{const d=packet.catalog.find(d=>d.id===i.ex),f=d&&media(d);return i.prepareVideo&&d&&f?[{i,d,f}]:[];});return {s,date,films};
 }).filter(x=>x.date===day||x.date>day&&x.date<=limit&&x.films.length).sort((a,b)=>a.s.plan.start.localeCompare(b.s.plan.start));
 return <>{[true,false].map(today=>{const group=rows.filter(x=>(x.date===day)===today);return group.length?<section key={String(today)} aria-label={today?"Dagens treningsmeldinger":"Forbered kommende trening"} className="grid">{group.map(({s,date,films})=>{const url="/okter?session="+encodeURIComponent(s.id),p=s.plan;
 return <article key={s.id} className="panel panel-pad grid athlete-session"><h2><Bell size={18}/>{today?"Ny trening i dag":"Før neste trening"}</h2><strong>{!today&&date+" · "}{wallTime(p.start).slice(11,16)} · {p.title}</strong>{p.venue&&<small>{p.venue}</small>}
 {films.map(({i,d,f})=><div className="grid" key={i.id}><a className="challenge-shortcut" href={url+"&item="+encodeURIComponent(i.id)}><Video size={16}/> Se før trening: {d.title}</a><p>{i.instructions||d.instructions}</p><a className="dev-secondary" href={f.href} target="_blank" rel="noreferrer">Åpne filmen hos {f.host}</a></div>)}<a className="btn primary" href={url}>Åpne treningen</a></article>;})}</section>:null;})}</>;
}

