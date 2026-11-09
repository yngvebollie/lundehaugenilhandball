import {useState,type FormEvent} from "react";
import {CalendarDays,Plus} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {checkRegular,regular} from "@/lib/coach-feedback";
import {intensity,monthBounds,onDate,plusDay,regularComparison,regularLoad,weekdays,type CheckInput,type Rule} from "@/lib/regular";
import {wallTime,total} from "@/lib/court/model";
import type {Doc} from "@/lib/court/client";

export function RegularEditor({data,rules,changed}:{data:Snapshot;rules:Rule[];changed:(r:Rule[])=>void}){
 const [kind,K]=useState<Rule["kind"]>("gym"),[days,D]=useState<number[]>([]),[busy,B]=useState(false),[msg,M]=useState("");
 async function add(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!days.length){M("Velg minst én ukedag.");return;}const f=new FormData(e.currentTarget);
 B(true);M("");try{changed(await regular(data,"add",{kind,title:kind==="gym"?"Skolegym":String(f.get("title")).trim(),days,minutes:Number(f.get("minutes")),weight:Number(f.get("weight")),clock:String(f.get("clock")),starts:String(f.get("starts")),ends:String(f.get("ends"))||null}));D([]);M("Fast aktivitet er lagret i kalenderen.");}catch(e){M((e as Error).message);}finally{B(false);}}
 async function stop(id:string){if(!confirm("Avslutte fra og med i dag? Tidligere dager beholdes."))return;B(true);try{changed(await regular(data,"stop",{id}));M("Aktiviteten er avsluttet.");}catch(e){M((e as Error).message);}finally{B(false);}}
 return <details className="library-tools regular-editor"><summary>Mine faste aktiviteter · skolegym og annet</summary>
 {rules.filter(r=>r.athlete===data.me.id&&(!r.ends||r.ends>=today())).map(r=><div className="result" key={r.id}><div><strong>{r.title}</strong><p>{r.days.map(x=>weekdays[x-1]).join(", ")} · {!r.profile_gym&&r.clock.slice(0,5)+" · "}{r.minutes} min · {intensity[r.weight]}</p><small>{r.starts} – {r.ends||"inntil videre"}</small></div><button className="btn" disabled={busy} onClick={()=>stop(r.id)}>Avslutt</button></div>)}
 <form className="grid" onSubmit={add}><div className="field-pair"><label>Fast aktivitet<select value={kind} onChange={e=>K(e.target.value as Rule["kind"])}><option value="gym">Skolegym</option><option value="other">Annen aktivitet</option></select></label>{kind==="other"&&<label>Navn på aktivitet<input required name="title" maxLength={90} placeholder="F.eks. dans"/></label>}</div>
 <fieldset><legend>Ukedager</legend><div className="day-strip">{weekdays.map((name,i)=><button type="button" className={"btn "+(days.includes(i+1)?"selected":"")} aria-pressed={days.includes(i+1)} key={name} onClick={()=>D(days.includes(i+1)?days.filter(d=>d!==i+1):[...days,i+1].sort())}>{name}</button>)}</div></fieldset>
 <div className="field-pair"><label>Starttid (Oslo)<input required name="clock" type="time" defaultValue="10:00"/></label><label>Minutter per gang<input required type="number" name="minutes" min="1" max="600" defaultValue="45"/></label><label>Planlagt intensitet<select name="weight" defaultValue="3">{intensity.slice(1).map((v,i)=><option value={i+1} key={v}>{v}</option>)}</select></label></div>
 <div className="field-pair"><label>Fra dato<input name="starts" type="date" required defaultValue={today()}/></label><label>Til og med (valgfritt)<input name="ends" type="date"/></label></div><button className="btn primary" disabled={busy}><Plus size={16}/>Lagre fast aktivitet</button></form>{msg&&<p role="status">{msg}</p>}</details>;
}
export function DailyChecks({data,rules,day,changed}:{data:Snapshot;rules:Rule[];day:string;changed:(r:Rule[])=>void}){
 const items=onDate(rules,day,data.me.id);
 if(!items.length)return null;
 return <section className="library-tools grid"><h3>Mine aktiviteter · {day}</h3>{items.map(r=><DayCheck key={r.id+day} data={data} r={r} day={day} changed={changed}/>)}</section>;
}
function DayCheck({data,r,day,changed}:{data:Snapshot;r:Rule;day:string;changed:(r:Rule[])=>void}){
 const c=r.checks?.[day],future=day>today();
 const [edit,E]=useState(false),[busy,B]=useState(false),[error,Err]=useState("");
 async function save(state:CheckInput["state"],minutes?:number,weight?:number){
  B(true);Err("");try{changed(await checkRegular(data,{id:r.id,day,state,minutes,weight}));E(false);}catch(e){Err((e as Error).message||"Kunne ikke lagre. Prøv igjen.");}finally{B(false);}
 }
 return <div className="grid"><strong>{r.title}</strong><small>Plan: {r.minutes} min · {intensity[r.weight]}</small>
 <span role="status">{future?"Planlagt":!c?"Ikke bekreftet":c.done?`Gjennomført · ${c.minutes} min · ${intensity[c.weight]}`:"Ikke gjennomført"}</span>
 {!future&&<div className="day-strip">{!c?.done&&<button className="btn primary" disabled={busy} onClick={()=>save("done")}>Gjennomført som planlagt</button>}<button className="btn" disabled={busy} aria-expanded={edit} onClick={()=>E(!edit)}>Juster denne dagen</button>{(!c||c.done)&&<button className="btn" disabled={busy} onClick={()=>save("skipped")}>Ikke gjennomført</button>}{c&&<button className="btn" disabled={busy} onClick={()=>save("clear")}>Angre registrering</button>}</div>}
 {edit&&!future&&<form className="grid" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void save("done",Number(f.get("minutes")),Number(f.get("weight")));}}><div className="field-pair"><label>Faktiske minutter<input required name="minutes" type="number" min="1" max="600" defaultValue={c?.done?c.minutes:r.minutes}/></label><label>Faktisk intensitet<select name="weight" defaultValue={c?.done?c.weight:r.weight}>{intensity.slice(1).map((v,i)=><option value={i+1} key={v}>{v}</option>)}</select></label></div><button className="btn primary" disabled={busy}>Lagre for denne dagen</button></form>}
 {error&&<p role="alert">{error}</p>}</div>;
}
export function LoadTotals({data,week,date,target,rules,docs}:{data:Snapshot;week:string;date:string;target:string;rules:Rule[];docs:Doc[]}){
 const [month,end]=monthBounds(date);
 function row(label:string,start:string,until:string){const reg=regularLoad(rules,start,until,target);
  const assigned=data.plans.filter(p=>p.squad===data.me.squad&&(!target||p.athlete===target)&&p.day>=start&&p.day<until);
  let minutes=0,points=0,missing=0;for(const a of assigned){if(!a.minutes){missing++;continue;}minutes+=a.minutes;points+=a.minutes*(a.kind==="Game"?5:a.kind==="Practice"?4:3);}
  for(const d of docs){const p=d.sharedPlan||d.plan,day=wallTime(p.start).slice(0,10);if(!day||day<start||day>=until)continue;
   const count=data.me.role==="athlete"?1:data.roster.filter(a=>a.role==="athlete"&&a.squad===data.me.squad&&(!target||target===a.id)&&(!d.audience||d.audience.includes(a.id))).length;
   const n=Math.round(total(p)/60)*count;minutes+=n;points+=n*(p.purpose==="team"?4:3);}
  return <tr key={label}><th>{label}<small>{start} – {plusDay(until,-1)}</small></th><td>{reg.sessions}</td><td>{reg.minutes}</td><td>{minutes}</td><td>{reg.minutes+minutes}</td><td>{points+reg.points}{missing>0&&<small>{missing} uten varighet</small>}</td></tr>;
 }
 return <section className="grid"><h3><CalendarDays size={17}/> Planlagt belastning</h3><div className="monitor-table"><table className="table"><thead><tr>{["Periode","Faste timer (antall)","Faste min","Økt- og kampmin","Min totalt","Belastningspoeng"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{row("Uke",week,plusDay(week,7))}{row("Måned",month,end)}</tbody></table></div>
 <small>Estimat, ikke oppmøte. Poeng = minutter × intensitet (1–5). Skolegym er normalt 3, lagtrening 4 og kamp 5. Økter uten varighet er ikke med i summen.{!target&&data.me.role==="coach"?" Lagtotalen summerer belastningen per spiller.":""}</small>
 <h3>Skolegym og annen fast aktivitet</h3><div className="monitor-table"><table className="table"><thead><tr>{["Periode","Planlagt min / poeng","Bekreftet min / poeng","Gjennomført","Ikke gjennomført","Ubekreftet","Kommende"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{([["Uke",week,plusDay(week,7)],["Måned",month,end]] as const).map(([label,start,until])=>{
 const s=regularComparison(rules,start,until,today(),target);
 return <tr key={label}><th>{label}</th><td>{s.plannedMinutes} / {s.planned}</td><td>{s.done+s.skipped?s.actualMinutes+" / "+s.actual:"–"}</td><td>{s.done}</td><td>{s.skipped}</td><td>{s.unknown}</td><td>{s.future}</td></tr>;
 })}</tbody></table></div><small>Planlagt gjelder hele perioden. Bekreftet belastning bygger bare på spillerens registreringer. En ubekreftet aktivitet er ikke fravær.</small></section>;
}
