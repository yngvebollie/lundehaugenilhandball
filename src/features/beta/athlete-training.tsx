import { useEffect,useState } from "react";
import { Activity, CalendarDays, CheckCheck, ClipboardCheck, Dumbbell, UserRound, Users, Mail } from "lucide-react";
import { WeeklyPlanner } from "./weekly-planner";
import { AthleteTeam,Conversation } from "./athlete-team";
import { Profile } from "./team-tools";
import { checkExercise, rateSession, today, type Snapshot } from "@/lib/beta";
import type { Effort } from "@/lib/programs";
import type { Run } from "./program-builder";
import { Celebration, ReviewForm } from "./workout-finish";
import {challenges,phase,type Challenge} from "@/lib/challenges";
import {AchievementBar,Challenges} from "./challenges";
import {BadgePanel} from "./badge-panel";
import {Medal,Trophy} from "lucide-react";
import { AthleteNotices } from "./team-notices";

const tabs=[{name:"Today",icon:Dumbbell},{name:"Plan",icon:CalendarDays},{name:"Progress",icon:Activity},{name:"Team",icon:Users},{name:"Messages",icon:Mail},{name:"Profile",icon:UserRound},{name:"Utfordringer",icon:Trophy},{name:"Merker",icon:Medal}] as const;
const efforts:Effort[]=["Easy","Just right","Hard"];
function longDate(day:string) {
  return new Intl.DateTimeFormat("en-GB",{weekday:"short",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(day+"T12:00:00Z"));
}
export function AthleteTraining({data,busy,run,initialTab="Today"}:{data:Snapshot;busy:boolean;run:Run;initialTab?:string}){
  const [tab,setTab]=useState<string>(initialTab);
  const [selected,setSelected]=useState("");
  const [openChallenges,setOpenChallenges]=useState<Challenge[]>([]),[challengeStart,setChallengeStart]=useState<{id:string;exercise:string}>();
  useEffect(()=>{let live=true;challenges(data).then(list=>{if(live)setOpenChallenges(list.filter(c=>phase(c)==="Aktiv"&&c.exercises?.length));}).catch(()=>{if(live)setOpenChallenges([]);});return()=>{live=false;};},[data]);
  const [shared,setShared]=useState("");
  const [started,setStarted]=useState<Record<string,boolean>>({});
  const [celebrate,setCelebrate]=useState("");
  const now=today();
  const plans=[...data.plans].sort((a,b)=>a.day.localeCompare(b.day));
  const shown=plans.filter(p=>tab==="Plan"?(!selected||selected===p.day):p.day===now);
  const completed=(id:string)=>data.checks.filter(c=>c.assignment===id).length;
  const finished=plans.filter(p=>completed(p.id)===p.exercises.length);
  const due=plans.filter(p=>p.day<=now);
  const dueFinished=due.filter(p=>completed(p.id)===p.exercises.length);
  return <><header className="athlete-title"><span className="eyeline">{longDate(now)} · Athlete workspace</span><h1>{tab==="Today"?"Today's training":tab==="Plan"?"My training plan":tab==="Profile"?"My profile":tab==="Team"?"My team":tab==="Messages"?"My messages":tab==="Utfordringer"?"Utfordringer":tab==="Merker"?"Merker":"My progress"}</h1></header>
    <nav className="athlete-nav" aria-label="Training views">{tabs.map(t=><button className={tab===t.name?"selected":""} aria-pressed={tab===t.name} key={t.name} onClick={()=>setTab(t.name)}><t.icon size={18}/>{t.name}</button>)}</nav>
    {tab!=="Merker"&&<AchievementBar data={data}/>}
    {tab!=="Messages"&&data.notices.some(n=>!n.read_at)&&<button className="btn" onClick={()=>setTab("Messages")}><Mail size={18}/>{data.notices.filter(n=>!n.read_at).length} team notice(s) to acknowledge</button>}
    {tab==="Messages"&&<AthleteNotices data={data} busy={busy} run={run}/>}
    {tab==="Plan"&&<WeeklyPlanner data={data} busy={busy} run={run}/>}
    {tab==="Merker"?<BadgePanel data={data}/>:tab==="Utfordringer"?<Challenges data={data} startWith={challengeStart}/>:tab==="Team"?<AthleteTeam data={data}/>:tab==="Messages"?<Conversation data={data}/>:tab==="Profile"?<><Profile me={data.me} busy={busy} run={run}/><a href="/merker" className="btn"><Medal size={16}/>Mine merker</a></>:tab==="Progress"?<><section className="panel panel-pad grid"><h2><Activity/> Training record</h2><div className="athlete-stats"><div><strong>{finished.length}</strong>Activities done</div><div><strong>{data.checks.filter(c=>plans.some(p=>p.id===c.assignment&&(!p.kind||p.kind==="Session"))).length}</strong>Exercises done</div><div><strong>{due.length?Math.round(dueFinished.length*100/due.length)+"%":"—"}</strong>Due activities complete</div></div></section><section className="grid"><h2>Session history</h2>{[...due].reverse().map(p=><div className="result" key={p.id}><div><strong>{p.title}</strong><p className="muted">{longDate(p.day)} · {completed(p.id)}/{p.exercises.length} checked</p></div><span>{data.feedback.find(f=>f.assignment===p.id)?.effort||"Unrated"}</span></div>)}{!due.length&&<p>No sessions due yet.</p>}</section></>:<>
    {tab==="Plan"&&<label>Training day<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">All dates</option>{Array.from(new Set(plans.map(p=>p.day))).map(d=><option key={d} value={d}>{longDate(d)}</option>)}</select></label>}
    {shown.map(p=>{
      const n=completed(p.id);
      const rating=data.feedback.find(f=>f.assignment===p.id);
      const workout=!p.kind||p.kind==="Session",startKey="nhf-start:"+data.me.id+":"+p.id;
      const active=!workout||n>0||started[p.id]||sessionStorage.getItem(startKey)==="1";
      return <section className="panel panel-pad grid athlete-session" key={p.id}>
        <header><p className="eyeline">{p.personal?"My schedule":p.program_name||p.kind||"Squad training"} · {longDate(p.day)} {p.start_time?.slice(0,5)} {p.minutes?" · "+p.minutes+" min":""}</p><h2>{p.title}</h2></header>
        {p.kind==="Game"&&p.day<=now&&<a className="challenge-shortcut" href="/merker?peer=1"><Medal size={15}/>Anerkjennelser etter kamp</a>}
        <div className="session-progress"><ClipboardCheck size={18}/><strong role="status">{n===p.exercises.length?"Workout complete. Nicely done!":n+" of "+p.exercises.length+" exercises complete"}</strong></div><progress value={n} max={p.exercises.length} aria-label="Workout progress"/>
        {!active&&<button className="btn primary" onClick={()=>{sessionStorage.setItem(startKey,"1");setStarted({...started,[p.id]:true});}}>LETS GO!</button>}
        <fieldset className="exercise-list"><legend>{p.kind&&p.kind!=="Session"?"Attendance":"Exercise checklist"}</legend>{p.exercises.map((line,i)=>{
          const checked=data.checks.some(c=>c.assignment===p.id&&c.step===i);
          const text=line.toLocaleLowerCase().trim(),eligible=openChallenges.flatMap(c=>(c.exercises||[]).filter(n=>{const name=n.toLocaleLowerCase().trim();return text===name||text.startsWith(name)&&/^(?:\\s*[·:]|\\s+\\d)/.test(text.slice(name.length));}).map(n=>({id:c.id,title:c.title,exercise:n})));
          return <div key={i}><label className={"exercise-row "+(checked?"checked":"")}><input type="checkbox" checked={checked} disabled={busy||!active} onChange={async e=>{const value=e.target.checked;if(await run(()=>checkExercise(p.id,i,value))&&workout&&value&&n+1===p.exercises.length)setCelebrate(p.id);}}/><span>{line}</span></label>{eligible.map(c=><button type="button" className="challenge-shortcut" key={c.id+c.exercise} onClick={()=>{setChallengeStart(c);setTab("Utfordringer");}}><Trophy size={14}/>Registrer sett i {c.title}</button>)}</div>;
        })}</fieldset>
        {n===p.exercises.length&&workout&&<ReviewForm session={p} review={data.reviews.find(r=>r.assignment===p.id)} run={run} busy={busy}/>}
        {celebrate===p.id&&<Celebration title={p.title} onClose={()=>setCelebrate("")}/>}
        {n===p.exercises.length&&<button className="btn" onClick={async()=>{const text="Completed "+p.title+" · "+p.day;try{if(navigator.share)await navigator.share({text});else {await navigator.clipboard.writeText(text);setShared(p.id);}}catch{setShared("");}}}>{shared===p.id?"Completion copied":"Share completion"}</button>}
        <fieldset className="effort"><legend>How did the session feel?</legend><div>{efforts.map(level=><button key={level} disabled={busy} aria-pressed={rating?.effort===level} className={rating?.effort===level?"selected":""} onClick={()=>run(()=>rateSession({assignment:p.id,effort:level},Boolean(rating)))}>{level}</button>)}</div>{rating&&<small className="trend"><CheckCheck size={14}/> Shared with coach</small>}</fieldset>
      </section>;
    })}{!shown.length&&<div className="panel panel-pad grid"><h2>No sessions scheduled</h2>{tab==="Today"&&<button className="btn" onClick={()=>setTab("Plan")}>View training plan</button>}</div>}</>}</>;
}
