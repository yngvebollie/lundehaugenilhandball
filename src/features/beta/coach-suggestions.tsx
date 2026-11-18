import {useEffect,useState} from "react";
import {RefreshCw,Target,Star,Activity,Check} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {plusDay} from "@/lib/regular";
import {teamRatings,type RatingRow} from "@/lib/coach-feedback";
import {development} from "@/lib/development/client";
import {developmentVisible} from "@/lib/development/flags";
import type {Plan} from "@/lib/development/model";
import {followupLog,followedUp,type FollowupLog} from "@/lib/followup-log";
import {CompleteFollowup} from "./complete-followup";
import {coachSuggestions,type Suggestion} from "@/lib/coach-suggestions";
import {baseDrills} from "@/lib/court/model";
import {referenceDrills} from "@/lib/court/films";
import {strength} from "@/lib/strength";
import {useRecordedActivity} from "./use-recorded-activity";
import {FeatureInfo} from "./feature-info";
import "./coach-suggestions.css";

export function CoachSuggestions({data,person}:{data:Snapshot;person?:string}){
 return data.me.role==="coach"?<Suggestions key={data.me.squad+":"+data.me.id+":"+(person||"")} data={data} person={person}/>:null;
}
function Suggestions({data,person}:{data:Snapshot;person?:string}){
 const day=today(),from=plusDay(day,-29),history=useRecordedActivity(data,from,plusDay(day,1),person);
 const [ratings,R]=useState<RatingRow[]>([]),[plans,P]=useState<Record<string,Plan>>({}),[errors,E]=useState<string[]>([]),[ready,D]=useState(false),[tick,T]=useState(0),[filter,F]=useState("all"),[chosen,C]=useState(""),[limit,L]=useState(8);
 const [completed,Done]=useState<FollowupLog[]>([]),[logReady,LR]=useState(false),[status,Status]=useState("open"),[selected,Select]=useState<Suggestion>(),[savedNote,Saved]=useState("");
 const players=data.roster.filter(p=>p.squad===data.me.squad&&p.role==="athlete"&&(!person||p.id===person));
 useEffect(()=>{let live=true;R([]);P({});E([]);D(false);Done([]);LR(false);
  const read=async()=>{
   const failures:string[]=[],found:Record<string,Plan>={};let rs:RatingRow[]=[],logs:FollowupLog[]=[],logsReady=false;
   try{logs=await followupLog(data,person);logsReady=true;}catch{failures.push("Oppfølgingsstatus kunne ikke lastes.");}
   try{rs=await teamRatings(data);}catch{failures.push("Øvelsesvurderinger kunne ikke lastes.");}
   let index=0;
   const worker=async()=>{while(live&&index<players.length){const p=players[index++];try{found[p.id]=(await development(data,p.id)).plan;}catch{failures.push("Utviklingsmål for "+p.name+" kunne ikke lastes.");}}};
   if(developmentVisible)await Promise.all(Array.from({length:Math.min(3,players.length)},worker));
   if(live){R(rs);P(found);Done(logs);LR(logsReady);E(failures);D(true);}
  };void read();return()=>{live=false;};
 },[data,person,tick]);
 useEffect(()=>{const refresh=()=>T(n=>n+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
 const labels=new Map([...baseDrills,...referenceDrills,...strength.map(e=>({id:e.id,title:e.name})),...data.library.map(e=>({id:e.id,title:e.name}))].map(e=>[e.id,e.title]));
 const list=ratings.map(r=>({...r,label:r.label||labels.get(r.exercise)||"Øvelse"})),known=new Set(ratings.filter(r=>r.origin==="assignment").map(r=>r.activity+":"+r.item));
 for(const r of data.reviews){const a=data.plans.find(a=>a.id===r.assignment&&a.squad===data.me.squad);if(!a)continue;r.exercise_stars.forEach((stars,i)=>{if(stars>0&&a.exercises[i]&&!known.has(a.id+":"+i))list.push({athlete:a.athlete,exercise:"",label:a.exercises[i],origin:"assignment",activity:a.id,item:String(i),stars,updated:a.day});});}
 const suggestions=ready?coachSuggestions(data,history.error?[]:history.rows,list,plans,day,from,plusDay(day,-6),person||chosen):[];
 const open=suggestions.filter(s=>!followedUp(s,completed)),done=completed.filter(r=>(!chosen||r.athlete===chosen)&&players.some(p=>p.id===r.athlete)&&(filter==="all"||r.followup.kind===filter));
 const visible=open.filter(s=>filter==="all"||s.kind===filter),incomplete=!!history.error||errors.length>0;
 const tabs=[["all","Alle"],["goals","Mål"],["ratings","Vurderinger"],["activity","Aktivitet"]],icons={goals:Target,ratings:Star,activity:Activity};
 return <section className="coach-suggestions" aria-label="Oppfølgingsforslag"><header className="feature-heading"><FeatureInfo topic="followup"><h3>Oppfølgingsforslag</h3></FeatureInfo><button className="btn" aria-label="Oppdater oppfølgingsforslag" title="Oppdater oppfølgingsforslag" onClick={()=>{T(n=>n+1);history.retry();}}><RefreshCw size={16}/></button></header>
 <div className="suggestion-filters"><div className="workspace-tabs" aria-label="Forslagstype">{tabs.map(([id,title])=><button type="button" className={filter===id?"current":""} aria-pressed={filter===id} key={id} onClick={()=>{F(id);L(8);}}>{title} <small>{status==="open"?open.filter(s=>id==="all"||s.kind===id).length:completed.filter(r=>(!chosen||r.athlete===chosen)&&players.some(p=>p.id===r.athlete)&&(id==="all"||r.followup.kind===id)).length}</small></button>)}</div>{!person&&<label>Spiller<select aria-label="Spiller" value={chosen} onChange={e=>{C(e.target.value);L(8);}}><option value="">Alle spillere</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}</div>
 <div className="workspace-tabs" aria-label="Oppfølgingsstatus"><button type="button" className={status==="open"?"current":""} aria-pressed={status==="open"} onClick={()=>{Status("open");L(8);}}>Åpne</button><button type="button" className={status==="done"?"current":""} aria-pressed={status==="done"} onClick={()=>{Status("done");L(8);}}>Fulgt opp</button></div>
 {savedNote&&<p role="status">{savedNote}</p>}
 <small className="suggestion-period">{status==="open"?"Aktivitet: siste sju dager · Vurderinger: siste 30 dager · Avtalte, aktive mål":"Lagrede oppfølginger · Nyeste først"}</small>
 {!ready||!history.ready&&!history.error?<p role="status">Henter grunnlag for oppfølging …</p>:null}
 {incomplete&&<p role="alert">Grunnlaget er ufullstendig. {[history.error,...errors].filter(Boolean).join(" ")} <button className="btn" onClick={()=>{T(n=>n+1);history.retry();}}>Prøv igjen</button></p>}
 {status==="open"?<><ul className="suggestion-list">{visible.slice(0,limit).map(s=>{const Icon=icons[s.kind];return <li key={s.id}><Icon size={18} aria-hidden="true"/><div><a className="suggestion-player" href={"/spillere?athlete="+encodeURIComponent(s.athlete)}>{players.find(p=>p.id===s.athlete)?.name}</a><h4>{s.title}</h4><p>{s.evidence}</p><div className="followup-actions"><a href={s.href}>{s.action}</a><button type="button" className="btn" disabled={!logReady||!ready} onClick={()=>{Select(s);Saved("");}}><Check size={16}/>Marker som fulgt opp</button></div></div></li>;})}</ul>
 {visible.length>limit&&<button className="btn" onClick={()=>L(n=>n+8)}>Vis flere forslag</button>}
 {ready&&history.ready&&!incomplete&&!visible.length&&<p>Ingen forslag i dette utvalget ut fra registrerte data.</p>}
 </>:<><ul className="suggestion-list">{done.slice(0,limit).map(r=><li key={r.id}><Check size={18}/><div><a href={"/spillere?athlete="+encodeURIComponent(r.athlete)}>{players.find(p=>p.id===r.athlete)?.name}</a><h4>{r.followup.title}</h4><small>{new Date(r.at_time).toLocaleString("nb-NO",{timeZone:"Europe/Oslo"})} · {data.roster.find(p=>p.id===r.actor)?.name||"Trener"}</small><p className="followup-note">{r.followup.note}</p><a href={"/spillere?athlete="+encodeURIComponent(r.athlete)+"#logg"}>Se trenerlogg</a></div></li>)}</ul>{done.length>limit&&<button className="btn" onClick={()=>L(n=>n+8)}>Vis flere oppfølginger</button>}{ready&&logReady&&!done.length&&<p>Ingen oppfølginger lagret i dette utvalget.</p>}</>}
 {selected&&<CompleteFollowup data={data} suggestion={selected} close={()=>Select(undefined)} saved={(row,conflict)=>{Done(rs=>[row,...rs.filter(r=>r.id!==row.id)]);Saved(conflict?"Forslaget var allerede fulgt opp.":"Oppfølging lagret i trenerloggen.");T(n=>n+1);}}/>}
 </section>;
}
