import {useEffect,useState} from "react";
import {Eye,Settings2,Target,Video} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {court,courtEnabled} from "@/lib/court/client";
import type {Drill} from "@/lib/court/model";
import {profiles,levels,label,originals,type Profile} from "@/lib/development/model";
import {media} from "@/lib/court/films";
import {DrillDetail} from "./court-bank";

export function DevelopmentSetup({data,empty}:{data:Snapshot;empty:boolean}){
 const [section,S]=useState(empty?"oppsett":""),[profile,P]=useState<Profile>("field"),[videos,V]=useState<Drill[]>(),[error,E]=useState(""),[selected,Q]=useState("");
 useEffect(()=>{if(section!=="video"||!courtEnabled)return;let current=true;V(undefined);E("");Q("");
  court(data).then(p=>{if(current)V(p.catalog.filter(x=>!!media(x)));}).catch(e=>{if(current)E(e.message||"Kunne ikke hente videoer.");});return()=>{current=false};},[data,section]);
 const video=videos?.find(x=>x.id===selected);
 return <section className="dev-panel"><h3><Settings2/> Lagets utviklingsoppsett</h3>
 <div className="dev-actions dev-setup-links"><button aria-expanded={section==="oppsett"} onClick={()=>S(section==="oppsett"?"":"oppsett")}><Target size={16}/>Ferdigheter og øvelser</button><button aria-expanded={section==="video"} onClick={()=>S(section==="video"?"":"video")}><Video size={16}/>Lagets videoer</button><a className="dev-secondary" href="/utvikling/demo?eksempel=1&rolle=trener"><Eye/>Se som trener</a><a className="dev-secondary" href="/utvikling/demo?eksempel=1&rolle=utover"><Eye/>Se som utøver</a></div>
 {section==="oppsett"&&<div className="dev-grid dev-setup-body"><label>Ferdighetsoppsett<select value={profile} onChange={e=>P(e.target.value as Profile)}><option value="field">Utespiller</option><option value="keeper">Keeper</option></select></label><p>{levels.join(" → ")}</p>
 {Object.entries(profiles[profile]).map(([key,subs])=><details key={key}><summary>{label(key)}</summary><p>{subs.map(label).join(" · ")}</p></details>)}
 <h4>Grunnøvelser for utviklingsmål</h4>{originals.map(d=><details key={d.id}><summary>{d.title}</summary><p>{d.instructions}</p></details>)}</div>}
 {section==="video"&&<div className="dev-grid dev-setup-body">{!courtEnabled?<p>Videobanken er ikke aktivert her.</p>:<>{error?<p role="alert">{error}</p>:!videos?<p role="status">Henter videoer …</p>:video?<><button onClick={()=>Q("")}>Tilbake til lagets videoer</button><DrillDetail key={video.id} d={video}/></>:videos.length? videos.map(v=><button key={v.id} onClick={()=>Q(v.id)}><Video size={16}/> {v.title} · {v.source}</button>):<p>Ingen øvelser med video er tilgjengelige for dette laget ennå.</p>}<a className="dev-secondary" href="/okter?vis=bank">Åpne øvelsesbanken</a></>}</div>}</section>;
}
