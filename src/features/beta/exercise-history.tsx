import {useState} from "react";
import type {LoggedExercise,Snapshot} from "@/lib/beta";

type Unit=LoggedExercise["unit"];
type Entry={id:string;day:string;time:string;unit:Unit;sets:number[];total:number};
const units:Record<Unit,string>={rep:"repetisjoner",sek:"sekunder",min:"minutter",m:"meter"};
const dateLabel=(d:string)=>new Intl.DateTimeFormat("nb-NO",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(new Date(d+"T12:00:00Z"));

export function ExerciseHistory({data,athlete,exercise}:{data:Snapshot;athlete:string;exercise?:string}){
 const [selected,select]=useState<Unit>(),[limit,more]=useState(8);
 const allowed=data.me.role==="athlete"?athlete===data.me.id:data.roster.some(p=>p.id===athlete&&p.squad===data.me.squad&&p.role==="athlete");
 if(!allowed)return null;
 const player=data.me.role==="athlete"?data.me:data.roster.find(p=>p.id===athlete);
 const checked=new Set(data.checks.map(c=>c.assignment+":"+c.step)),entries:Entry[]=[];
 for(const p of data.plans){
   if(!exercise||p.athlete!==athlete||p.squad!==data.me.squad||!p.logged_sets)continue;
   const grouped=new Map<Unit,number[]>();
   p.logged_sets.forEach((e,i)=>{if(e.id===exercise&&checked.has(p.id+":"+i)&&e.sets.length)grouped.set(e.unit,[...(grouped.get(e.unit)||[]),...e.sets]);});
   for(const [unit,sets] of grouped)entries.push({id:p.id,day:p.day,time:p.start_time?.slice(0,5)||"",unit,sets,total:sets.reduce((a,b)=>a+b,0)});
 }
 entries.sort((a,b)=>b.day.localeCompare(a.day)||b.time.localeCompare(a.time)||b.id.localeCompare(a.id));
 const choices=[...new Set(entries.map(e=>e.unit))],unit=selected&&choices.includes(selected)?selected:choices[0];
 const rows=entries.filter(e=>e.unit===unit),delta=rows.length>1?rows[0].total-rows[1].total:null;
 const recent=rows.slice(0,10).reverse(),max=Math.max(1,...recent.map(e=>e.total));
 return <section className="exercise-history" aria-label="Øvelseshistorikk"><h3>Øvelseshistorikk</h3><small>{player?.name}</small>
 {!rows.length?<p>Ingen gjennomførte sett er registrert for denne øvelsen ennå.</p>:<>
 {choices.length>1&&<label>Måleenhet<select value={unit} onChange={e=>{select(e.target.value as Unit);more(8);}}>{choices.map(u=><option key={u} value={u}>{units[u]}</option>)}</select></label>}
 <p><strong>{rows[0].total} {units[unit]}</strong> i siste økt. {delta===null?"Første registrering.":delta===0?"Samme total som forrige økt.":Math.abs(delta)+(delta>0?" flere":" færre")+" enn i forrige økt."}</p>
 {recent.length>1&&<figure className="exercise-history-chart"><figcaption>Totalt per økt · siste {recent.length}</figcaption><div aria-hidden="true">{recent.map(e=><i key={e.id} style={{height:(100*e.total/max)+"%"}} title={dateLabel(e.day)+": "+e.total+" "+unit}/>)}</div><small>{dateLabel(recent[0].day)} til {dateLabel(recent[recent.length-1].day)}</small></figure>}
 <table aria-label="Gjennomførte sett per økt"><thead><tr><th scope="col">Dato</th><th scope="col">Sett ({unit})</th><th scope="col">Totalt</th></tr></thead><tbody>{rows.slice(0,limit).map(e=><tr key={e.id}><td><time dateTime={e.day}>{dateLabel(e.day)}</time>{e.time&&<small>{e.time}</small>}</td><td>{e.sets.join(" / ")}</td><td>{e.total}</td></tr>)}</tbody></table>
 {rows.length>limit&&<button type="button" className="btn" onClick={()=>more(n=>n+12)}>Vis eldre økter</button>}</>}
 </section>;
}
