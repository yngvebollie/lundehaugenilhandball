import {useEffect,useState} from "react";
import {Bell,Video} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {court,type Packet} from "@/lib/court/client";
import {wallTime} from "@/lib/court/model";

// The published audience is evaluated by the same RPC as the session itself.
// Deriving the inbox from that snapshot avoids duplicate or stale invitations.
export function CourtNotices({data}:{data:Snapshot}){
 const [packet,P]=useState<Packet>(),[now,N]=useState(()=>new Date().toISOString()),[error,E]=useState("");
 useEffect(()=>{let active=true,request=0;
  const refresh=async()=>{const id=++request;try{const result=await court(data);if(active&&id===request){P(result);E("");N(new Date().toISOString());}}catch{if(active&&id===request){P(undefined);E("Kunne ikke hente dagens treningsmeldinger.");}}};
  void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},60000);window.addEventListener("focus",refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);};},[data]);
 if(error)return <small role="status">{error}</small>;
 const day=wallTime(now).slice(0,10),due=packet?.sessions.filter(s=>s.published&&!s.archived&&s.plan.start&&s.plan.purpose==="team"&&wallTime(s.plan.start).startsWith(day)).sort((a,b)=>a.plan.start!.localeCompare(b.plan.start!))||[];
 if(!packet||!due.length)return null;
 return <section aria-label="Dagens treningsmeldinger" className="grid">{due.map(({id,plan})=>{const url="/okter?session="+encodeURIComponent(id);
  return <article key={id} className="panel panel-pad grid athlete-session"><h2><Bell size={18}/>Ny trening i dag</h2><strong>{wallTime(plan.start!).slice(11,16)} · {plan.title}</strong>{plan.venue&&<small>{plan.venue}</small>}
  {plan.items.flatMap(i=>{const d=packet.catalog.find(d=>d.id===i.ex);return i.prepareVideo&&d&&/^\d{1,15}$/.test(d.vimeo)?[<a className="challenge-shortcut" key={i.id} href={url+"&item="+encodeURIComponent(i.id)}><Video size={16}/> Se før trening: {d.title}</a>]:[];})}<a className="btn primary" href={url}>Åpne treningen</a></article>;
 })}</section>;
}
