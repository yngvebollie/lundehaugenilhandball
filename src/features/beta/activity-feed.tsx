import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {Activity,RefreshCw} from "lucide-react";
import {today} from "@/lib/beta";
import {plusDay,intensity} from "@/lib/regular";
import {useRecordedActivity} from "./use-recorded-activity";
import type {Snapshot} from "@/lib/beta";
import {activity,type FeedEvent} from "@/lib/coach-activity";
export function ActivityFeed({data,person}:{data:Snapshot;person?:string}){
 const day=today(),history=useRecordedActivity(data,plusDay(day,-29),plusDay(day,1),person);
 const [rows,setRows]=useState<FeedEvent[]>([]),[error,setError]=useState(""),[tick,setTick]=useState(0),[limit,setLimit]=useState(40);
 useEffect(()=>{let ok=true;const refresh=()=>activity(data,person,limit).then(r=>{if(ok){setRows(r);setError("");}}).catch(e=>{if(ok)setError(e.message);});
  void refresh();window.addEventListener("focus",refresh);return()=>{ok=false;window.removeEventListener("focus",refresh);};},[data,person,tick,limit]);
 const recorded=history.rows.filter(r=>r.source!=="assignment").map(r=>({id:"record:"+r.id,athlete:r.athlete,name:data.roster.find(p=>p.id===r.athlete)?.name||"Utøver",kind:"activity",title:r.title,detail:(r.done?"Gjennomført":"Ikke deltatt")+" · "+r.minutes+" min faktisk"+(r.done?" · "+intensity[r.weight]:""),day:r.day,at_time:null,href:r.href}));
 const combined=[...rows.map(e=>({...e,href:undefined as string|undefined})),...recorded].sort((a,b)=>Date.parse(b.at_time||b.day)-Date.parse(a.at_time||a.day)||a.id.localeCompare(b.id)).slice(0,limit);
 return <section className="coach-feed grid"><header className="feature-heading"><FeatureInfo topic="feed"><h3><Activity size={17}/> Utøveraktivitet</h3></FeatureInfo><button className="btn" title="Oppdater aktivitet" aria-label="Oppdater aktivitet" onClick={()=>{setTick(x=>x+1);history.retry();}}><RefreshCw size={15}/></button></header>
 {history.error&&<p role="alert">{history.error}</p>}{error?<p role="alert">{error}</p>:!combined.length?<p>{history.error?"Aktivitetsbildet er ufullstendig.":!history.ready?"Henter aktivitet …":"Ingen registrert aktivitet ennå."}</p>:<div className="feed-scroll" tabIndex={0} aria-label="Siste utøveraktivitet"><ol>{combined.map(e=><li key={e.id}><time>{e.at_time?new Date(e.at_time).toLocaleString("nb-NO",{timeZone:"Europe/Oslo",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):e.day}</time><div><a href={"/spillere?athlete="+encodeURIComponent(e.athlete)}>{e.name}</a><p>{e.kind==="review"?"Vurderte økt":e.kind==="challenge"?"Registrerte sett":e.kind==="activity"?"Registrerte aktivitet":"Fullførte øvelse"}: {e.href?<a href={e.href}>{e.title}</a>:e.title}</p><small>{e.detail}</small></div></li>)}</ol>{combined.length===limit&&limit<200&&<button className="btn" onClick={()=>setLimit(v=>Math.min(200,v+40))}>Vis eldre aktivitet</button>}</div>}</section>;
}
