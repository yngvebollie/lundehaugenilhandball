import {useEffect,useState} from "react";
import {Award} from "lucide-react";
import {badges,badgeAction,tier,type BadgeState} from "@/lib/badges";
import {ExerciseInsight} from "./exercise-insight";
import type {Assignment,Snapshot} from "@/lib/beta";
import "./workout-finish.css";
function TrainingEntry({plan,data}:{plan:Assignment;data:Snapshot}){
 const steps=new Set(data.checks.filter(c=>c.assignment===plan.id).map(c=>c.step));
 return <details className="session-feed-entry"><summary><span className="feed-session-heading"><time>{plan.day}{plan.start_time&&" · "+plan.start_time.slice(0,5)}</time>{plan.title} · {steps.size===plan.exercises.length?"Fullført":"Påbegynt"}{plan.minutes?" · "+plan.minutes+" min":""}</span></summary>
 {plan.logged_sets?.length?plan.logged_sets.map(e=><div className="feed-sets" key={e.id}><ExerciseInsight athlete={plan.athlete} data={data} id={e.id} name={e.name}/><ol aria-label={"Sett for "+e.name}>{e.sets.map((n,i)=><li key={i}><small>Sett {i+1}</small>{n} {e.unit}</li>)}</ol></div>):plan.exercises.map((line,i)=><div key={i}>{steps.has(i)?"✓ ":"– "}<ExerciseInsight athlete={plan.athlete} data={data} name={line}/></div>)}</details>;
}
export function MeritFeed({data,athlete=data.me.id}:{data:Snapshot;athlete?:string}){
 const coach=data.me.role==="coach",badgePage="/merker"+(coach?"?athlete="+encodeURIComponent(athlete):"");
 const [limit,more]=useState(8);
 const [items,setItems]=useState<BadgeState["earned"]>([]),[celebrate,C]=useState(""),[error,E]=useState(false);
 useEffect(()=>{let live=true,inflight=false;const storage="merit-celebrated:"+data.me.squad+":"+data.me.id;
 const read=async()=>{if(inflight||document.hidden)return;inflight=true;try{const v=await badgeAction(data,athlete);if(!live)return;
 const seen=new Set<string>(),list=[...v.earned].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||b.level-a.level).filter(e=>{const key=e.fixture?e.key+e.fixture:e.key+e.level+e.at;if(seen.has(key))return false;seen.add(key);return true;});setItems(list);E(false);
 const first=list[0];if(!coach&&first&&v.notifications!==false){const id=[first.key,first.fixture||first.at,first.level].join(":");if(localStorage.getItem(storage)!==id){localStorage.setItem(storage,id);C(id);}}
 }catch{if(live)E(true);}finally{inflight=false;}};void read();const timer=window.setInterval(read,60000);window.addEventListener("focus",read);return()=>{live=false;clearInterval(timer);window.removeEventListener("focus",read);};},[data,athlete,coach]);
 useEffect(()=>{if(celebrate){const t=setTimeout(()=>C(""),2300);return()=>clearTimeout(t);}},[celebrate]);
 const completions=new Set(data.checks.map(c=>c.assignment));
 const entries=[...items.map(e=>({at:e.at,id:["badge",e.key,e.fixture||e.at,e.level].join(":"),badge:e,plan:null})),...data.plans.filter(p=>p.athlete===athlete&&p.squad===data.me.squad&&completions.has(p.id)).map(p=>({at:p.day+"T"+(p.start_time||"00:00"),id:p.id,badge:null,plan:p}))].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id));
 return <section className="panel panel-pad grid merit-feed"><header><h2><Award size={20}/> {coach?"Spillerens høydepunkter":"Mine høydepunkter"}</h2></header>
 {celebrate&&<div className="confetti" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{left:(i*37%100)+"%",backgroundColor:["#d80063","#102047","#ef94c4"][i%3],animationDelay:(i%5)*.06+"s"}}/>)}</div>}
 {error&&<small role="status">Kunne ikke oppdatere høydepunktene.</small>}{entries.slice(0,limit).map(event=>{if(event.plan)return <TrainingEntry key={event.id} data={data} plan={event.plan}/>;const e=event.badge!;const badgeHref=badgePage+(coach?"&":"?")+"badge="+encodeURIComponent(e.key);const href=e.match?(coach?"/match?game=":"/athlete?fixture=")+encodeURIComponent(e.match):badgeHref;const b=badges.find(b=>b.key===e.key);return b?<article key={[e.key,e.fixture||e.at,e.level].join(":")}><div><small>{new Date(e.at).toLocaleDateString("nb-NO")}</small><h3><a href={href}>{coach?tier(b,e.level)+" i "+b.title:"Gratulerer med "+tier(b,e.level).toLowerCase()+" i "+b.title+"!"}</a></h3><p>{e.fixture?e.goals+" mål mot "+e.opponent+". Flott innsats for laget!":"Et nytt steg i utviklingen din. Godt jobbet!"}</p><footer><a href={badgeHref}>Se merket</a>{e.match&&<a href={href}>Se kampen</a>}</footer></div></article>:null;})}
 {entries.length>limit&&<button type="button" className="btn" onClick={()=>more(n=>n+12)}>Vis flere hendelser</button>}{!entries.length&&!error&&<small>Ingen registrerte økter eller merker ennå.</small>}<a href={badgePage}>{coach?"Alle spillerens merker":"Alle mine merker"}</a></section>;
}
