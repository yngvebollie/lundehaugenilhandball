import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {Activity,RefreshCw} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {activity,type FeedEvent} from "@/lib/coach-activity";
export function ActivityFeed({data,person}:{data:Snapshot;person?:string}){
 const [rows,setRows]=useState<FeedEvent[]>([]),[error,setError]=useState(""),[tick,setTick]=useState(0),[limit,setLimit]=useState(40);
 useEffect(()=>{let ok=true;const refresh=()=>activity(data,person,limit).then(r=>{if(ok){setRows(r);setError("");}}).catch(e=>{if(ok)setError(e.message);});
  void refresh();window.addEventListener("focus",refresh);return()=>{ok=false;window.removeEventListener("focus",refresh);};},[data,person,tick,limit]);
 return <section className="coach-feed grid"><header className="feature-heading"><FeatureInfo topic="feed"><h3><Activity size={17}/> Utøveraktivitet</h3></FeatureInfo><button className="btn" title="Oppdater aktivitet" aria-label="Oppdater aktivitet" onClick={()=>setTick(x=>x+1)}><RefreshCw size={15}/></button></header>
 {error?<p role="alert">{error}</p>:!rows.length?<p>Ingen registrert aktivitet ennå.</p>:<div className="feed-scroll" tabIndex={0} aria-label="Siste utøveraktivitet"><ol>{rows.map(e=><li key={e.id}><time>{e.at_time?new Date(e.at_time).toLocaleString("nb-NO",{timeZone:"Europe/Oslo",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):e.day}</time><div><a href={"/spillerstats?athlete="+encodeURIComponent(e.athlete)}>{e.name}</a><p>{e.kind==="review"?"Vurderte økt":e.kind==="challenge"?"Registrerte sett":"Fullførte øvelse"}: {e.title}</p><small>{e.detail}</small></div></li>)}</ol>{rows.length===limit&&limit<200&&<button className="btn" onClick={()=>setLimit(v=>Math.min(200,v+40))}>Vis eldre aktivitet</button>}</div>}</section>;
}
