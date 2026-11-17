import {useEffect,useState} from "react";
import {db,demo,type Snapshot,type Assignment} from "@/lib/beta";
import {matches} from "@/lib/matches";
import {registrations,type Fixture} from "@/lib/match-journal";
import {cupAttendance} from "@/lib/game-attendance";
import {wallTime,total} from "@/lib/court/model";
import type {Doc} from "@/lib/court/client";
import {plusDay,onDate,type Rule} from "@/lib/regular";
import {monday} from "@/lib/workload";
import {groupCalendar} from "@/lib/calendar-plan";
import {CalendarDialog,CalendarEdit,RegularCalendarEdit} from "./calendar-edit";
import {FixtureEdit} from "./fixture-edit";
import type {Run} from "./program-builder";
import "./calendar.css";
type Game={id:string;day:string;time:string;title:string;meta:string;url:string;fixture?:Fixture};
const dateLabel=(day:string)=>new Date(day+"T12:00:00Z").toLocaleDateString("nb-NO",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"});
export function CalendarBoard({data,docs,rules,week,date,target,view,selectDay,busy,run,refreshRules}:{data:Snapshot;docs:Doc[];rules:Rule[];week:string;date:string;target:string;view:string;selectDay:(day:string)=>void;busy:boolean;run:Run;refreshRules:()=>void}){
 const coach=data.me.role==="coach",[filter,F]=useState("Alle"),[query,Q]=useState(""),[selected,S]=useState<Assignment[]>(),[fixed,R]=useState<{rule:Rule;day:string}>(),[game,G]=useState<Game>(),[games,M]=useState<Game[]>([]),[error,E]=useState(""),[version,V]=useState(0);
 const reloadGames=async()=>{V(n=>n+1);G(undefined);};
 useEffect(()=>{let live=true;M([]);E("");const load=async()=>{
  if(!coach){if(demo)return [];const list=(await db!.rpc("beta_my_fixture_log").throwOnError()).data||[];return list.map((g:{id:string;day:string;time:string|null;title:string;team_name:string;score:string|null})=>({id:g.id,day:g.day,time:g.time?.slice(0,5)||"",title:g.title,meta:g.team_name+(g.score?" · "+g.score:""),url:"/athlete?fixture="+g.id}));}
  const regs=await registrations(data.me.squad),fixtures:Fixture[]=demo?await matches(data.me.squad) as Fixture[]:[];
  if(!demo)for(let offset=0;;offset+=500){const batch=(await db!.from("beta_matches").select("*").eq("team",data.me.squad).order("id").range(offset,offset+499).throwOnError()).data as Fixture[];fixtures.push(...batch);if(batch.length<500)break;}
  const cups=await cupAttendance(data.me.squad,regs.map(r=>r.id));
  return [...fixtures.map(g=>({id:g.id,day:g.day,time:g.start_time?.slice(0,5)||"",title:g.home&&g.away?g.home+" – "+g.away:"Kamp mot "+g.opponent,meta:(g.score||g.status||"Lagets kamp")+" · "+(g.venue||"Sted ikke satt"),url:"/match?game="+g.id,fixture:g})),...cups.map(({reg,game:g})=>({id:g.id,day:g.day,time:"",title:"Cup · "+g.opponent,meta:g.scored!=null&&g.conceded!=null?g.scored+"–"+g.conceded:"Turneringskamp",url:"/match?view=cups&reg="+reg+"&cupGame="+g.id}))];
 };void load().then(g=>{if(live)M(g);}).catch(()=>{if(live)E("Kampene kunne ikke lastes. Andre aktiviteter vises fortsatt.");});return()=>{live=false;};},[data.me.squad,data.me.id,coach,version]);
 const month=date.slice(0,7),start=view==="Month"?monday(month+"-01"):week;
 const nextMonth=plusDay(month+"-01",32).slice(0,7)+"-01",end=view==="Month"?(monday(nextMonth)===nextMonth?nextMonth:plusDay(monday(nextMonth),7)):plusDay(week,7);
 const days:string[]=[];for(let d=start;d<end;d=plusDay(d,1))days.push(d);
 const allow=(category:string,title:string)=>(filter==="Alle"||filter===category)&&title.toLocaleLowerCase("nb").includes(query.trim().toLocaleLowerCase("nb"));
 const name=(id:string)=>data.roster.find(p=>p.id===id)?.name||data.me.name;
 return <section className="calendar-unified" aria-label="Samlet kalender"><div className="field-pair"><label>Aktivitetsfilter<select value={filter} onChange={e=>F(e.target.value)}>{["Alle","Økter","Håndballøkter","Kamper","Skolegym","Annen aktivitet"].map(s=><option key={s}>{s}</option>)}</select></label><label>Søk i kalender<input type="search" value={query} onChange={e=>Q(e.target.value)} placeholder="Navn på aktivitet"/></label></div>
 {error&&<p role="alert">{error} <button className="btn" onClick={()=>V(version+1)}>Prøv igjen</button></p>}
 <div className={"calendar-board "+(view==="Agenda"?"calendar-agenda":view==="Month"?"calendar-month":"calendar-week")}>
 {days.map(day=>{const rows: {id:string;title:string;meta:string;category:string;time:string;url?:string;open?:()=>void}[]=[];
 const plans=data.plans.filter(a=>a.squad===data.me.squad&&a.day===day&&(!target||a.athlete===target)&&(coach||a.athlete===data.me.id));
 for(const group of groupCalendar(plans)){const a=group[0];rows.push({id:a.id,title:a.title,time:a.start_time?.slice(0,5)||"",category:a.kind==="Game"?"Kamper":"Økter",meta:(a.personal?"Egen aktivitet":a.kind==="Practice"?"Lagtrening":"Økt")+(a.minutes!=null?" · "+a.minutes+" min":"")+" · "+(group.length===1?name(a.athlete):group.length+" utøvere"),open:()=>S(group)});}
 for(const d of docs){const p=coach?d.plan:d.sharedPlan||d.plan,local=wallTime(p.start);if(d.archived||p.origin==="template"||!coach&&!d.published||local.slice(0,10)!==day||(target&&d.audience&&!d.audience.includes(target))||(!coach&&d.audience&&!d.audience.includes(data.me.id)))continue;rows.push({id:d.id,title:p.title,time:local.slice(11,16),category:"Håndballøkter",meta:(d.published?"Publisert":"Utkast")+" · "+Math.round(total(p)/60)+" min",url:"/okter?"+(coach?"edit":"session")+"="+d.id});}
 for(const r of onDate(rules,day,target||(!coach?data.me.id:""))){rows.push({id:r.id,title:r.title,time:r.profile_gym?"":r.clock.slice(0,5),category:r.kind==="gym"?"Skolegym":"Annen aktivitet",meta:name(r.athlete)+" · "+r.minutes+" min"+(r.checks?.[day]?(r.checks[day].done?" · Gjennomført":" · Ikke gjennomført"):" · Fast plan"),open:()=>R({rule:r,day})});}
 for(const g of games.filter(g=>g.day===day))rows.push({id:g.id,title:g.title,time:g.time,category:"Kamper",meta:g.meta+(coach&&target?" · Lagets terminliste":""),...(g.fixture?{open:()=>G(g)}:{url:g.url})});
 const visible=rows.filter(r=>allow(r.category,r.title)).sort((a,b)=>(a.time||"99").localeCompare(b.time||"99")||a.title.localeCompare(b.title,"nb"));
 return <section key={day} className={"calendar-day "+(day===date?"chosen ":"")+(view==="Month"&&!day.startsWith(month)?"outside":"")}><button className="calendar-day-title" aria-pressed={day===date} onClick={()=>selectDay(day)}>{dateLabel(day)}</button><div className="calendar-day-events">{visible.map(r=>{const children=<><small>{r.time||"Tid ikke satt"} · {r.category}</small><strong>{r.title}</strong><small>{r.meta}</small></>;return r.url?<a className="calendar-event" data-category={r.category} href={r.url} key={r.id}>{children}</a>:<button type="button" className="calendar-event" data-category={r.category} onClick={r.open} key={r.id}>{children}</button>;})}{!visible.length&&<small className="muted">Ingen aktiviteter</small>}</div></section>;
 })}</div>
 {selected&&<CalendarEdit data={data} rows={selected} run={run} busy={busy} close={()=>S(undefined)}/>} {fixed&&<RegularCalendarEdit data={data} rule={fixed.rule} day={fixed.day} run={run} busy={busy} close={()=>R(undefined)} changed={refreshRules}/>}
 {game&&<CalendarDialog title={game.title} close={()=>G(undefined)}><p>{game.day} · {game.time} · {game.meta}</p>{coach&&game.fixture&&<FixtureEdit game={game.fixture} reload={reloadGames}/>}<a className="btn" href={game.url}>Åpne kamp, tropp og rapport</a></CalendarDialog>}
 </section>;
}
