import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Info,X} from "lucide-react";
import {strength,broadZones} from "@/lib/strength";
import {liftGuide,muscleNames} from "@/lib/lift-guides";
import type {Snapshot} from "@/lib/beta";
import {baseDrills,type Drill} from "@/lib/court/model";
import {referenceDrills} from "@/lib/court/films";
import {court,courtEnabled} from "@/lib/court/client";
import {DrillDetail} from "./court-bank";
import {ExerciseHistory} from "./exercise-history";
import {BodyMap} from "./body-map";
import "./player-feed.css";

export function ExerciseInsight({data,id,name,label,athlete,drills=[]}:{data:Snapshot;id?:string;name:string;label?:string;athlete?:string;drills?:Drill[]}){
 const [open,O]=useState(false);
 return <><button type="button" className="exercise-insight-link" aria-haspopup="dialog" onClick={()=>O(true)}><Info size={15}/>{label||name}</button>{open&&createPortal(<ExerciseDialog athlete={data.me.role==="athlete"?data.me.id:athlete} data={data} id={id} name={name} drills={drills} close={()=>O(false)}/>,document.body)}</>;
}
function ExerciseDialog({data,id,name,drills,athlete,close}:{athlete?:string;data:Snapshot;id?:string;name:string;drills:Drill[];close:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),heading=useId(),[extra,E]=useState<Drill[]>([]),[loading,L]=useState(false),[error,F]=useState(false);
 const clean=name.replace(/^\[[^\]]+\]\s*/,"").split(/\s*·\s*|\s+\d+\s*[x×]\s*\d/i)[0].trim().toLocaleLowerCase("nb");
 const is=(key:string,title:string)=>id?key===id:title.toLocaleLowerCase("nb")===clean;
 const lift=strength.find(x=>is(x.id,x.name)),club=data.library.find(x=>is(x.id,x.name)),drill=[...drills,...extra,...referenceDrills,...baseDrills].find(x=>is(x.id,x.title));
 useEffect(()=>{const d=ref.current!;d.showModal();return()=>d.close();},[]);
 useEffect(()=>{if(lift||club||drill||!courtEnabled)return;let live=true;L(true);court(data).then(p=>{if(live)E(p.catalog);}).catch(()=>{if(live)F(true);}).finally(()=>{if(live)L(false);});return()=>{live=false;};},[data,lift,club,drill]);
 const zones=lift?.zones||(club?broadZones[club.region]:[])||[];
 return <dialog ref={ref} className="exercise-dialog" aria-labelledby={heading} onCancel={close} onClick={e=>{if(e.target===ref.current)close();}}><div>
 <header><h2 id={heading}>{lift?.name||club?.name||drill?.title||name}</h2><button className="btn" type="button" aria-label="Lukk øvelsesinformasjon" onClick={close}><X size={18}/></button></header>
 {lift||club?<div className="exercise-insight-body">{!!zones.length&&<figure><BodyMap zones={zones}/><figcaption>Rødt: {lift?"muskler i øvelsen":"valgt kroppsregion"}</figcaption></figure>}<section><h3>{lift?"Gjennomføring":"Lagets øvelse"}</h3><p>{lift?liftGuide.get(lift.name):club?.dose}</p>{!!zones.length&&<><h3>{lift?"Muskelgrupper":"Kroppsregion"}</h3><p>{zones.map(z=>muscleNames[z]).join(" · ")}</p></>}{lift&&<small>Forslag fra øvelsesbanken: {lift.dose}</small>}</section></div>:drill?<DrillDetail d={drill}/>:<p role="status">{loading?"Henter øvelsen …":error?"Kunne ikke hente øvelsesbeskrivelsen.":"Denne loggføringen har ingen tilknyttet øvelsesbeskrivelse eller muskelkart."}</p>}
 {athlete&&<ExerciseHistory data={data} athlete={athlete} exercise={id||lift?.id||club?.id||drill?.id}/>}
 </div></dialog>;
}
