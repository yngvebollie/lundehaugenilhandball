import {useEffect,useState} from "react";
import {today,type Snapshot} from "@/lib/beta";
import {court,courtEnabled,type Doc} from "@/lib/court/client";
import {wallTime} from "@/lib/court/model";

export function PlayerNow({data,player}:{data:Snapshot;player:string}){
 const [docs,D]=useState<Doc[]>([]),[error,E]=useState(""),[ready,R]=useState(!courtEnabled);
 useEffect(()=>{let live=true;D([]);E("");R(!courtEnabled);if(courtEnabled)void court(data).then(p=>{if(live){D(p.sessions);R(true);}}).catch(()=>{if(live){E("Publiserte lagøkter kunne ikke lastes.");R(true);}});return()=>{live=false;};},[data,player]);
 const day=today(),own=data.plans.filter(p=>p.athlete===player&&p.squad===data.me.squad);
 const complete=(id:string,steps:number)=>steps>0&&Array.from({length:steps},(_,i)=>i).every(i=>data.checks.some(c=>c.assignment===id&&c.step===i));
 const latest=own.filter(p=>p.kind!=="Game"&&p.day<=day&&complete(p.id,p.exercises.length)).sort((a,b)=>b.day.localeCompare(a.day)||(b.start_time||"").localeCompare(a.start_time||""))[0];
 const next=[...own.filter(p=>p.day>=day&&!p.personal&&!complete(p.id,p.exercises.length)).map(p=>({id:p.id,title:p.title,start:p.day+(p.start_time?"T"+p.start_time:""),url:"/spillere?athlete="+encodeURIComponent(player)+"&uke="+p.day+"#plan"})),
 ...docs.filter(d=>d.published&&!d.archived&&(!d.audience||d.audience.includes(player))).map(d=>{const p=d.sharedPlan||d.plan;return {id:d.id,title:p.title,start:wallTime(p.start),url:"/okter?session="+d.id};}).filter(p=>p.start.slice(0,10)>=day)]
 .sort((a,b)=>a.start.localeCompare(b.start))[0];
 return <section className="player-now" aria-label="Spillerstatus"><div><h3>Neste i planen</h3>{!ready?<p role="status">Henter planlagte aktiviteter …</p>:next?<><strong>{next.title}</strong><small>{next.start.replace("T"," · ")}</small><a href={next.url}>Åpne planlagt aktivitet</a></>:<p>{error?"Planen er ufullstendig.":"Ingen kommende aktivitet registrert."}</p>}{error&&<small role="alert">{error}</small>}</div>
 <div><h3>Siste fullførte økt</h3>{latest?<><strong>{latest.title}</strong><small>{latest.day} · {latest.minutes==null?"Varighet ikke registrert":latest.minutes+" min"+(!latest.personal?" i planen":"")}</small><a href={"/spillere?athlete="+encodeURIComponent(player)+"&uke="+latest.day+"#plan"}>Se planlagt og gjennomført</a></>:<p>Ingen fullført økt registrert.</p>}</div></section>;
}
