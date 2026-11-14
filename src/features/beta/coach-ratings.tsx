import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {Star} from "lucide-react";
import {teamRatings,type RatingRow} from "@/lib/coach-feedback";
import type {Snapshot} from "@/lib/beta";
import {baseDrills} from "@/lib/court/model";
import {referenceDrills} from "@/lib/court/films";
import {strength} from "@/lib/strength";

const sources:Record<string,string>={assignment:"Tildelt aktivitet",catalog:"Øvelsesbank",manual:"Manuell øvelse",challenge:"Utfordring"};
export function CoachRatings({data,athlete}:{data:Snapshot;athlete?:string}){
 const [rows,R]=useState<RatingRow[]>(),[err,E]=useState(""),[retry,T]=useState(0),[chosen,P]=useState(""),[source,S]=useState(""),[search,Q]=useState("");
 useEffect(()=>{let alive=true;teamRatings(data).then(r=>{if(alive){R(r);E("");}}).catch(e=>{if(alive){R(undefined);E(e.message||"Kunne ikke hente vurderingene.");}});return()=>{alive=false};},[data,retry]);
 const player=athlete||chosen;
 const names=new Map(data.roster.filter(p=>p.squad===data.me.squad&&p.role==="athlete").map(p=>[p.id,p.name]));
 const labels=new Map([...baseDrills,...referenceDrills,...strength.map(e=>({id:e.id,title:e.name})),...data.library.map(e=>({id:e.id,title:e.name}))].map(d=>[d.id,d.title]));
 const assignments=new Map(data.plans.filter(p=>p.squad===data.me.squad).map(a=>[a.id,a])),reviews=new Map(data.reviews.map(r=>[r.assignment,r])),efforts=new Map(data.feedback.map(f=>[f.assignment,f.effort]));
 const list=[...(rows||[])],known=new Set(list.filter(r=>r.origin==="assignment").map(r=>r.activity+":"+r.item));
 // These older exercise stars were already shared as part of the coach's workout review.
 for(const r of reviews.values()){const a=assignments.get(r.assignment);if(!a)continue;r.exercise_stars.forEach((stars,i)=>{if(stars>0&&a.exercises[i]&&!known.has(a.id+":"+i))list.push({athlete:a.athlete,exercise:"",label:a.exercises[i],origin:"assignment",activity:a.id,item:String(i),stars,updated:a.day});});}
 const groups=new Map<string,RatingRow[]>();for(const row of list){
  if(!names.has(row.athlete)||player&&row.athlete!==player||source&&row.origin!==source)continue;
  const title=row.label||labels.get(row.exercise)||row.exercise;if(!title.toLocaleLowerCase("nb").includes(search.trim().toLocaleLowerCase("nb")))continue;
  const batch=groups.get(title)||[];batch.push(row);groups.set(title,batch);
 }
 const count=[...groups.values()].reduce((n,rs)=>n+rs.length,0);
 return <section className="grid" id="ratings"><header><FeatureInfo topic="ratings"><h2><Star/> Øvelsesvurderinger</h2></FeatureInfo><p className="muted">{data.teams.find(t=>t.id===data.me.squad)?.name} · Kun trenere</p></header>
 <div className="field-pair">{!athlete&&<label>Spiller<select value={player} onChange={e=>P(e.target.value)}><option value="">Alle spillere</option>{[...names].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}<label>Kilde<select value={source} onChange={e=>S(e.target.value)}><option value="">Alle kilder</option>{Object.entries(sources).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Søk etter øvelse<input type="search" value={search} onChange={e=>Q(e.target.value)}/></label></div>
 {err?<p role="alert">{err} <button className="btn" onClick={()=>T(retry+1)}>Prøv igjen</button></p>:!rows?<p>Henter vurderinger …</p>:<><p>{count} vurderinger · {groups.size} øvelser</p>
 {[...groups].sort(([a],[b])=>a.localeCompare(b,"nb")).map(([title,rs])=><details className="library-tools" key={title}><summary>{title} · {(rs.reduce((n,r)=>n+r.stars,0)/rs.length).toLocaleString("nb",{maximumFractionDigits:1})}/5 · {rs.length} vurderinger</summary><div className="monitor-table"><table className="table"><thead><tr>{["Spiller","Stjerner","Kilde","Aktivitet","Dato"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rs.map((r,i)=><tr key={i}><td><a href={"/spillere?athlete="+r.athlete}>{names.get(r.athlete)}</a></td><td>{r.stars}/5</td><td>{sources[r.origin]}</td><td>{r.activity&&assignments.get(r.activity)?.title||"–"}</td><td>{new Date(r.updated).toLocaleDateString("nb-NO",{timeZone:"Europe/Oslo"})}</td></tr>)}</tbody></table></div></details>)}
 {!count&&<p>Ingen delte øvelsesvurderinger i dette utvalget.</p>}</>}
 <details className="library-tools"><summary>Øktvurderinger, kommentarer og opplevd belastning</summary>{[...assignments.values()].filter(a=>(!player||a.athlete===player)&&(reviews.has(a.id)||efforts.has(a.id))).sort((a,b)=>b.day.localeCompare(a.day)).map(a=><div className="result" key={a.id}><div><strong>{names.get(a.athlete)} · {a.title}</strong><p>{a.day} · {data.checks.filter(c=>c.assignment===a.id).length}/{a.exercises.length} registrert</p>{reviews.get(a.id)?.comment&&<p>{reviews.get(a.id)?.comment}</p>}</div><small>{reviews.has(a.id)?reviews.get(a.id)!.stars+"/5":"–"} · {efforts.get(a.id)||"Ingen belastningsvurdering"}</small></div>)}</details>
 </section>;
}
