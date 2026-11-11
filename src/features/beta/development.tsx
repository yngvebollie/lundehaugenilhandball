"use client";
import {FeatureInfo} from "./feature-info";
import {useCallback,useEffect,useRef,useState} from "react";
import {Activity,ArrowLeft,ArrowRight,Check,ChevronRight,ClipboardCheck,Clock3,Dumbbell,Flag,Footprints,History,LockKeyhole,MessageCircle,Plus,Send,Star,Target,Trophy,UserRound} from "lucide-react";
import {demo,type Snapshot} from "@/lib/beta";
import {development} from "@/lib/development/client";
import {axisObservation,busyGoal,countPractice,journey,label,levels,localDay,profiles,type Goal,type Profile} from "@/lib/development/model";
import type {Packet} from "@/lib/development/types";
import {plannerBridge} from "@/lib/development/flags";
import {CourtRating} from "./court-rating";
import {DevelopmentSetup} from "./development-setup";
import {MeritReview} from "./development-merits";
import {BulkPractice} from "./development-bulk";
import {Editor,type Write} from "./development-forms";
import {dateText,Radar} from "./development-radar";
import "./development.css";
const tabs=["Oversikt","Mål","Øvelser","Historikk"] as const;
const statuses:Record<string,string>={draft:"Kladd",proposed:"Foreslått",active:"Aktivt mål",awaiting_review:"Trener vurderer fremgangen",completed:"Bekreftet",paused:"På pause",archived:"Arkivert",cancelled:"Avsluttet"};
function Journey({g}:{g:Goal}){return <section className="dev-panel dev-journey"><FeatureInfo topic="journey"><h3><Flag/> Målreise</h3></FeatureInfo><ol>{journey.map((l,i)=><li key={l} className={i<g.stage?"passed":i===g.stage?"here":""} aria-current={i===g.stage?"step":undefined}><span>{i<g.stage||g.stage===3&&i===3?<Check size={13}/>:i+1}</span>{l}</li>)}</ol></section>;}
function Progress({n,target}:{n:number;target:number|null}){return <div className="dev-practice-count"><small>{target?"Øvd "+n+" av "+target+" avtalte ganger":n+" registrerte øvinger"}</small>{target&&<progress value={Math.min(n,target)} max={target} aria-label="Avtalte øvinger"/>}</div>;}
export function Development({data,highlights}:{data:Snapshot;highlights?:(id:string)=>React.ReactNode}){
 const coach=data.me.role==="coach",players=data.roster.filter(p=>p.role==="athlete"&&p.squad===data.me.squad).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 const [person,P]=useState(coach?(demo&&players.some(p=>p.id==="liv")?"liv":players[0]?.id||""):data.me.id),[queue,Q]=useState(false);
 useEffect(()=>{const wanted=new URLSearchParams(location.search).get("athlete");if(coach&&players.some(p=>p.id===wanted))P(wanted!);},[data.me.squad]);
 return <section className="dev-room"><div className="dev-personbar"><div><span className="dev-overline">{coach?"Trenerrom":"Spillerrom"} · {data.teams.find(t=>t.id===data.me.squad)?.name}</span><FeatureInfo topic="development"><h2>{coach?(players.find(p=>p.id===person)?.name||"Spilleroversikt"):"Min utvikling"}</h2></FeatureInfo></div>{coach&&players.length>0&&<div className="dev-picker"><label>Utøver<select value={person} onChange={e=>{P(e.target.value);Q(false);}}>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button className="dev-secondary" aria-pressed={queue} onClick={()=>Q(!queue)}><UserRound size={16}/> Lagoversikt</button></div>}</div>
 {highlights?.(person)}
 {coach&&data.me.squad!=="development-preview"&&<DevelopmentSetup key={data.me.squad} data={data} empty={!players.length}/>}
 {demo&&data.me.squad!=="development-preview"&&<small className="dev-demo">Lokal demo · eksempeldata</small>}
 {!person?<p>Ingen utøvere på dette laget ennå. <a href="/team">Inviter en utøver til laget</a>.</p>:queue&&coach?<ReviewQueue data={data} pick={id=>{P(id);Q(false);}}/>:<PlayerPage key={data.me.squad+person+data.me.id} data={data} person={person}/>}</section>;
}
function ReviewQueue({data,pick}:{data:Snapshot;pick:(id:string)=>void}){
 const [rows,R]=useState<{id:string;name:string;goals:Goal[]}[]>(),[filter,F]=useState("Alle"),[skill,S]=useState(""),[err,E]=useState("");
 useEffect(()=>{let alive=true;Promise.all(data.roster.filter(p=>p.role==="athlete"&&p.squad===data.me.squad).map(async p=>({id:p.id,name:p.name,goals:(await development(data,p.id)).plan.goals}))).then(r=>{if(alive)R(r.sort((a,b)=>a.name.localeCompare(b.name,"nb")));}).catch(e=>{if(alive){R(undefined);E(e.message);}});return()=>{alive=false};},[data]);
 return <section className="dev-panel dev-queue"><h3><ClipboardCheck/> Lagets utviklingsmål</h3><div className="dev-pair"><label>Vurderingsstatus<select value={filter} onChange={e=>F(e.target.value)}>{["Alle","Bedt om vurdering","Vurderingsdato passert"].map(v=><option key={v}>{v}</option>)}</select></label><label>Søk etter ferdighet<input type="search" value={skill} onChange={e=>S(e.target.value)}/></label></div>
 {err?<p role="alert">{err}</p>:!rows?<p>Laster …</p>:rows.map(p=>{const gs=p.goals.filter(g=>busyGoal(g)&&label(g.skill).toLowerCase().includes(skill.toLowerCase())&&(filter==="Alle"||filter==="Bedt om vurdering"&&g.status==="awaiting_review"||filter==="Vurderingsdato passert"&&g.review&&g.review<localDay(new Date().toISOString())));return !gs.length&&(filter!=="Alle"||skill)?null:<button className="dev-listrow" key={p.id} onClick={()=>pick(p.id)}><b>{p.name}</b><span>{gs.map(g=>g.title+(g.review?" · "+dateText(g.review):"")).join(" / ")||"Ingen aktive mål"}</span><ChevronRight size={16}/></button>;})}{rows&&<BulkPractice data={data} rows={rows}/>}</section>;
}
function PlayerPage({data,person}:{data:Snapshot;person:string}){
 const [packet,U]=useState<Packet>(),[tab,T]=useState<string>("Oversikt"),[goalId,G]=useState(""),[detail,D]=useState(false),[form,F]=useState(""),[profile,P]=useState<Profile>("field"),[skill,SK]=useState(""),[exercise,X]=useState(""),[busy,B]=useState(false),[note,N]=useState(""),[error,E]=useState(""),[refresh,V]=useState(0);
 const lock=useRef(false),retry=useRef({signature:"",key:""}),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false};},[]);
 const read=useCallback(async()=>{try{const r=await development(data,person);if(alive.current){U(old=>old&&old.rev>r.rev?old:r);E("");}}catch(e){if(alive.current){U(undefined);E((e as Error).message||"Kunne ikke hente planen.");}}},[data,person]);
 useEffect(()=>{void read();const focus=()=>void read();window.addEventListener("focus",focus);return()=>window.removeEventListener("focus",focus);},[read,refresh]);
 const write:Write=async(action,v)=>{if(!packet||lock.current)return false;lock.current=true;B(true);E("");N("");
  const signature=JSON.stringify([action,v]);if(retry.current.signature!==signature)retry.current={signature,key:crypto.randomUUID()};
  try{const r=await development(data,person,packet.rev,{action,v:JSON.parse(JSON.stringify(v)),key:retry.current.key});if(alive.current){U(r);N(action==="practice"?"Øvingen er registrert.":"Lagret.");}retry.current={signature:"",key:""};return true;}
  catch(e){if(alive.current){const err=e as Error&{status?:number};E(err.message||"Ikke lagret. Kontroller forbindelsen.");if(err.status===401||err.status===403)U(undefined);}return false;}finally{lock.current=false;if(alive.current)B(false);}
 };
 const fail=error&&<div className="dev-error" role="alert">{error} <button onClick={()=>V(refresh+1)}>Hent siste versjon</button></div>;
 if(!packet)return <>{fail||<p>Laster utviklingsplan …</p>}</>;
 const {plan,coach}=packet,active=plan.goals.filter(busyGoal),g=plan.goals.find(x=>x.id===goalId)||active[0]||plan.goals[0];
 const reviewable=g&&busyGoal(g),selected=packet.catalog.find(i=>i.id===exercise);
 function selectGoal(goal:Goal){G(goal.id);D(true);F("");SK("");X("");}
 function editor(kind:string){if(g)G(g.id);F(kind);D(false);SK("");X("");N("");}
 const openGoal=(goal:Goal)=><button className="dev-goal-card" key={goal.id} onClick={()=>selectGoal(goal)}><span className="dev-goal-heading"><i><Footprints/></i><span><strong>{goal.title}</strong><small>{goal.base&&goal.target?"Nivå "+goal.base+" → "+goal.target:goal.skill?label(goal.skill):"Prosessmål"}</small></span><ChevronRight size={15}/></span><Progress n={countPractice(plan,goal.id)} target={goal.practiceTarget}/><span className={"dev-status "+(goal.stage===3?"verified":"")}><Clock3 size={14}/>{goal.status==="active"?journey[goal.stage]:statuses[goal.status]}</span></button>;
 const listExercises=(goal:Goal)=><section className="dev-panel"><h3><Dumbbell/> Øvelser for mitt mål</h3>{goal.assignments.length?goal.assignments.map(a=>{const item=packet.catalog.find(e=>e.id===a.exercise);return <button className="dev-listrow" key={a.exercise} disabled={!item} onClick={()=>{G(goal.id);X(a.exercise);SK("");D(false);}}><Dumbbell size={18}/><span><strong>{item?.title||"Øvelsen er ikke lenger tilgjengelig"}</strong><small>{a.cue||"Se øvelse"}</small></span><ChevronRight size={16}/></button>}):<p>Ingen øvelser tildelt. {coach&&<button onClick={()=>{G(goal.id);F("assign");}}>Tildel øvelse</button>}</p>}</section>;
 const focusLevel=g?.skill?axisObservation(plan,g.profile,g.skill,localDay(new Date().toISOString()))?.level:null;
 const obs=skill?axisObservation(plan,profile,skill,localDay(new Date().toISOString())):undefined;
 return <><nav className="dev-tabs" aria-label="Utviklingsvisning">{tabs.map(k=><button key={k} aria-pressed={tab===k} onClick={()=>{T(k);D(false);F("");X("");SK("");}}>{k}</button>)}</nav>{fail}{note&&<p className="dev-saved" role="status">{note}</p>}
 {form?<Editor key={form+goalId} kind={form} profile={profile} initialSkill={skill} packet={packet} g={form==="new"?undefined:g} close={()=>F("")} busy={busy} write={write}/>:
 exercise&&selected&&g?<section className="dev-panel dev-detail"><button className="dev-back" onClick={()=>{X("");D(true);}}><ArrowLeft/> Mitt mål</button><h3><Dumbbell/> {selected.title}</h3><p>{selected.instructions}</p><p><b>Trenerens holdepunkt:</b> {g.assignments.find(a=>a.exercise===exercise)?.cue||"Ingen ekstra tilpasning."}</p><small>{selected.format} · {selected.equipment} · {selected.space}</small>
 {!coach&&<CourtRating key={person+exercise} data={data} id={exercise}/>}{reviewable&&<PracticeButton plan={packet} exercise={exercise} goal={g} busy={busy} write={write}/>}
 {coach&&plannerBridge&&data.me.squad!=="development-preview"&&<a className="dev-secondary" href={"/?devExercise="+encodeURIComponent(exercise)+"#builder"}>Til øktutkast <ChevronRight size={16}/></a>}</section>:
 skill?<section className="dev-panel dev-detail"><button className="dev-back" onClick={()=>SK("")}><ArrowLeft/> Oversikt</button><h3><Activity/> {label(skill)}</h3><strong>{obs?levels[obs.level-1]:"Ikke vurdert"}</strong>{obs&&<p>{dateText(obs.observed)} · {obs.rubric} · {obs.criterion}<br/>{obs.context}<br/>{obs.feedback}</p>}
 {(profiles[profile] as Record<string,string[]>)[skill]&&<div className="dev-actions">{(profiles[profile] as Record<string,string[]>)[skill].map(sub=><button key={sub} onClick={()=>SK(sub)}>{label(sub)}</button>)}</div>}
 {plan.goals.filter(x=>x.profile===profile&&x.skill===skill).map(openGoal)}
 {plan.rubrics.filter(r=>r.profile===profile&&r.skill===skill).map(r=><details key={r.version}><summary>{r.version} · {r.scope}</summary><ol>{r.criteria.map((c,i)=><li key={i}>{levels[i]}: {c}</li>)}</ol></details>)}
 {plan.observations.filter(o=>o.profile===profile&&o.skill===skill).sort((a,b)=>b.observed.localeCompare(a.observed)).map(o=><p key={o.id}>{dateText(o.observed)} · {o.revoked?"Trukket tilbake":o.draft?"Kladd":levels[o.level-1]} · {o.feedback}</p>)}
 {coach&&<button className="dev-secondary" onClick={()=>F("assess")}><ClipboardCheck/> Vurder ferdighet</button>}</section>:
 detail&&g?<><button className="dev-back" onClick={()=>D(false)}><ArrowLeft/> Oversikt</button><section className="dev-panel dev-detail"><h3><Target/> {g.title}</h3><p>{g.intention}</p><dl><dt>Kriterier</dt><dd>{g.criteria}</dd>{g.review&&<><dt>Vurderingsdato</dt><dd>{dateText(g.review)}</dd></>}</dl><Progress n={countPractice(plan,g.id)} target={g.practiceTarget}/></section><Journey g={g}/>
 {g.stage===3&&g.status==="completed"?<div className="dev-confirmed"><Check/> Trener har bekreftet målet. {g.evidence}</div>:g.status==="awaiting_review"?<p className="dev-neutral">Trener vurderer fremgangen.</p>:null}
 {g.feedback&&<section className="dev-panel dev-quote"><h3><MessageCircle/> Tilbakemelding fra trener</h3><blockquote>{g.feedback}</blockquote></section>}{listExercises(g)}
 <details className="dev-panel"><summary>Øvingshistorikk</summary>{plan.practices.filter(p=>p.goals.includes(g.id)).map(p=><p key={p.id}>{dateText(p.at)} · {p.revoked?"Trukket tilbake":packet.catalog.find(x=>x.id===p.exercise)?.title||"Tidligere øvelse"} {!p.revoked&&(coach||p.by===data.me.id)&&<EditPractice at={p.at} context={p.context||""} save={(at,context)=>write("editPractice",{practice:p.id,at,context})} busy={busy}/>} {!p.revoked&&(coach||p.by===data.me.id)&&<button disabled={busy} onClick={()=>write("revokePractice",{practice:p.id})}>Trekk tilbake</button>}</p>)}</details>
 <div className="dev-actions">{!coach&&g.status==="active"&&<button className="dev-secondary" disabled={busy} onClick={()=>write("review",{goal:g.id})}><Send size={17}/> Be om tilbakemelding</button>}
 {coach&&<>{["draft","proposed"].includes(g.status)&&<button className="dev-primary" disabled={busy} onClick={()=>write("publish",{goal:g.id})}>Publiser avtalt mål</button>}
 {reviewable&&<><button className="dev-secondary" onClick={()=>editor("transfer")}>Registrer bruk i spill</button><button className="dev-primary" onClick={()=>editor("complete")}>Bekreft mål</button><button onClick={()=>editor("feedback")}>Gi tilbakemelding</button><button disabled={busy} onClick={()=>write("pause",{goal:g.id})}>Sett på pause</button></>}
 {["draft","proposed","paused","completed"].includes(g.status)&&<button disabled={busy} onClick={()=>write("archive",{goal:g.id})}>Arkiver mål</button>}{reviewable&&<button disabled={busy} onClick={()=>write("cancel",{goal:g.id})}>Avslutt uten bekreftelse</button>}{g.status==="paused"&&<button onClick={()=>write("resume",{goal:g.id})}>Gjenoppta mål</button>}{g.status==="completed"&&<button onClick={()=>editor("reopen")}>Gjenåpne mål</button>}
 {!["completed","archived","cancelled"].includes(g.status)&&<button onClick={()=>editor("edit")}>Rediger mål</button>}</>}</div></>:
 tab==="Oversikt"?<><div className={"dev-board "+(!coach?"player":"")}>
 {!coach&&g&&<section className="dev-panel dev-current"><h3><Target/> Mitt fokus: {g.title}</h3><p>{g.intention}</p><p><strong>Neste steg:</strong> {journey[Math.min(g.stage+1,3)]}</p><div className="dev-focus-actions"><button className="dev-secondary" onClick={()=>selectGoal(g)}>Se mitt mål <ChevronRight size={16}/></button>{reviewable&&g.assignments.some(a=>packet.catalog.some(x=>x.id===a.exercise))&&<button className="dev-primary" onClick={()=>{G(g.id);X(g.assignments.find(a=>packet.catalog.some(x=>x.id===a.exercise))!.exercise);}}><Dumbbell size={16}/> Registrer øving</button>}</div></section>}
 {!coach&&g?.skill&&<section className="dev-panel dev-ladder"><h3><Activity/> Ferdighetsstige</h3><ol>{levels.map((l,i)=><li key={l} className={i+1===focusLevel?"marked":""}><i/>{l}</li>)}</ol><p>{focusLevel?"Bekreftet nivå: "+levels[focusLevel-1]:"Ingen bekreftet vurdering av "+label(g.skill)+" ennå."}</p></section>}
 {!coach&&g&&<div className="dev-priority-exercises">{listExercises(g)}</div>}<div className="dev-radar-col"><Radar plan={plan} profile={profile} keeperAxes={packet.keeperAxes} onSkill={SK}/><label className="dev-profile-select">Ferdighetsprofil<select value={profile} onChange={e=>P(e.target.value as Profile)}><option value="field">Utespiller</option>{packet.keeper&&<option value="keeper">Keeper</option>}</select></label></div>
 <section className="dev-panel dev-active"><h3><Target/> Aktive mål <small>{active.length}/{packet.limit}</small></h3>{active.length?active.map(openGoal):<p>Velg ditt første mål sammen med treneren.</p>}</section></div>
 {g&&<Journey g={g}/>}<div className="dev-actions">{coach&&g&&<button className="dev-primary" onClick={()=>editor("assign")}><Plus/> Tildel øvelse</button>}{coach&&<button className="dev-secondary" onClick={()=>editor("assess")}><ClipboardCheck/> Vurder fremgang</button>}<button className={coach?"dev-secondary":"dev-primary"} onClick={()=>editor("new")}><Plus/>{coach?"Nytt mål":"Foreslå mål"}</button></div>
 {coach&&<details className="dev-panel"><summary><LockKeyhole size={16}/> Privat trenerområde</summary><button onClick={()=>editor("note")}>Skriv privat notat</button><button onClick={()=>editor("rubric")}>Godkjenn vurderingsrubrikk</button><MeritReview packet={packet} write={write} busy={busy}/>{packet.notes.map((n,i)=><p key={i}>{dateText(n.at)} · {n.text}</p>)}</details>}
  {plan.history.some(e=>e.public&&["complete","assess","endorse"].includes(e.action))&&<section className="dev-panel dev-history"><h3><Star/> Siste observasjoner</h3>{plan.history.filter(e=>e.public&&["complete","assess","endorse"].includes(e.action)).slice(-3).reverse().map(e=><div key={e.id}><time>{dateText(e.at)}</time><strong>{e.message}</strong></div>)}</section>}
 {data.me.squad!=="development-preview"&&<a className="dev-merit" href={coach?"/merker?athlete="+encodeURIComponent(person):"/merker"}><Trophy size={18}/> Se merker <ChevronRight size={15}/></a>}</>:
 tab==="Mål"?<><div className="dev-actions"><h3>Utviklingsmål</h3><button className="dev-primary" onClick={()=>editor("new")}><Plus/>{coach?"Nytt mål":"Foreslå mål"}</button></div>{plan.goals.map(openGoal)}{!plan.goals.length&&<p>Velg ditt første mål sammen med treneren.</p>}</>:
 tab==="Øvelser"?<>{active.map(x=><div key={x.id}><h3>{x.title}</h3>{listExercises(x)}</div>)}{!active.length&&<p>Ingen øvelser tildelt.</p>}</>:
 <section className="dev-panel dev-history"><h3><History/> Utviklingshistorikk</h3>{coach&&<button className="dev-secondary" onClick={()=>editor("correct")}>Korriger ferdighetsvurdering</button>}{[...plan.history].reverse().map(e=><div key={e.id}><time>{dateText(e.at)}</time><strong>{e.message}</strong></div>)}{!plan.history.length&&<p>Ingen hendelser registrert.</p>}</section>}</>;
}
function PracticeButton({plan,exercise,goal,busy,write}:{plan:Packet;exercise:string;goal:Goal;busy:boolean;write:Write}){
 const [extra,S]=useState<string[]>([]);
 return <div className="dev-grid">{plan.plan.goals.filter(g=>g.id!==goal.id&&busyGoal(g)&&g.assignments.some(a=>a.exercise===exercise)).map(g=><label className="dev-check" key={g.id}><input type="checkbox" checked={extra.includes(g.id)} onChange={e=>S(e.target.checked?[...extra,g.id]:extra.filter(k=>k!==g.id))}/>Samme øving gjelder også {g.title}</label>)}<button className="dev-primary" disabled={busy} onClick={()=>write("practice",{goals:[goal.id,...extra],exercise})}><Plus size={17}/> Registrer øving</button></div>
}
function EditPractice({at,context,save,busy}:{at:string;context:string;save:(at:string,context:string)=>Promise<boolean>;busy:boolean}){
 const [open,O]=useState(false),[day,D]=useState(localDay(at)),[memo,M]=useState(context);
 return open?<span className="dev-grid"><label>Øvingsdato<input type="date" max={localDay(new Date().toISOString())} value={day} onChange={e=>D(e.target.value)}/></label><label>Kontekst<input value={memo} maxLength={300} onChange={e=>M(e.target.value)}/></label><button disabled={!day||busy} onClick={async()=>{const time=day===localDay(at)?at:day===localDay(new Date().toISOString())?new Date().toISOString():new Date(day+"T12:00:00Z").toISOString();if(await save(time,memo))O(false);}}>Lagre rettelse</button></span>:<button onClick={()=>O(true)}>Korriger øving</button>;
}
