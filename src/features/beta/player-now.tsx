import {today,type Snapshot} from "@/lib/beta";
import {wallTime} from "@/lib/court/model";
import {plusDay} from "@/lib/regular";
import {useRecordedActivity} from "./use-recorded-activity";

export function PlayerNow({data,player}:{data:Snapshot;player:string}){
 const day=today(),from=plusDay(day,-29),history=useRecordedActivity(data,from,plusDay(day,1),player);
 const own=data.plans.filter(p=>p.athlete===player&&p.squad===data.me.squad);
 const complete=(id:string,steps:number)=>steps>0&&Array.from({length:steps},(_,i)=>i).every(i=>data.checks.some(c=>c.assignment===id&&c.step===i));
 const known=(source:string,id:string,date:string)=>history.rows.some(r=>r.source===source&&r.event===id&&r.day===date);
 const latest=[...history.rows.filter(r=>r.done).map(r=>({id:r.id,title:r.title,day:r.day,minutes:r.minutes,actual:true})),
 ...own.filter(p=>p.kind!=="Game"&&p.day>=from&&p.day<=day&&complete(p.id,p.exercises.length)&&!known("assignment",p.id,p.day)).map(p=>({id:p.id,title:p.title,day:p.day,minutes:p.minutes,actual:!!p.personal}))]
 .sort((a,b)=>b.day.localeCompare(a.day)||a.id.localeCompare(b.id))[0];
 const next=[...own.filter(p=>p.day>=day&&!p.personal&&!complete(p.id,p.exercises.length)&&!known("assignment",p.id,p.day)).map(p=>({id:p.id,title:p.title,start:p.day+(p.start_time?"T"+p.start_time:""),url:"/spillere?athlete="+encodeURIComponent(player)+"&uke="+p.day+"#plan"})),
 ...history.docs.filter(d=>d.published&&!d.archived&&(!d.audience||d.audience.includes(player))).map(d=>{const p=d.sharedPlan||d.plan;return {id:d.id,title:p.title,start:wallTime(p.start),url:"/okter?session="+d.id};}).filter(p=>p.start.slice(0,10)>=day&&!known("court",p.id,p.start.slice(0,10)))]
 .sort((a,b)=>a.start.localeCompare(b.start))[0];
 return <section className="player-now" aria-label="Spillerstatus"><div><h3>Neste i planen</h3>{!history.ready&&!history.error?<p role="status">Henter planlagte aktiviteter …</p>:next?<><strong>{next.title}</strong><small>{next.start.replace("T"," · ")}</small><a href={next.url}>Åpne planlagt aktivitet</a></>:<p>{history.error?"Planen er ufullstendig.":"Ingen kommende aktivitet registrert."}</p>}</div>
 <div><h3>Siste fullførte aktivitet</h3><small>Siste 30 dager</small>{!history.ready&&!history.error?<p role="status">Henter gjennomføring …</p>:latest?<><strong>{latest.title}</strong><small>{latest.day} · {latest.minutes==null?"Varighet ikke registrert":latest.minutes+" min"+(latest.actual?" faktisk":" i planen")}</small><a href={"/spillere?athlete="+encodeURIComponent(player)+"&uke="+latest.day+"#plan"}>Se planlagt og gjennomført</a></>:<p>{history.error?"Gjennomføring er ikke tilgjengelig.":"Ingen fullført aktivitet registrert i perioden."}</p>}</div>
 {history.error&&<p role="alert">{history.error} <button className="btn" onClick={history.retry}>Prøv igjen</button></p>}</section>;
}
