"use client";

import {FeatureInfo} from "./feature-info";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, BookOpen, CalendarDays, Download, Dumbbell, LogOut, Users } from "lucide-react";
import { clubRole,db, demo, readBeta, selectTeam, type Snapshot } from "@/lib/beta";

import { ProgramBuilder, type Run } from "./program-builder";
import {WizardGate} from "./player-wizard";
import { AthleteTraining } from "./athlete-training";
import { About } from "./about";
import { Conversation } from "./athlete-team";

import { Challenges } from "./challenges";
import { CoachAgenda } from "./coach-agenda";
import {ChartNoAxesColumn,Medal,ContactRound,Volleyball,Trophy,House,Ellipsis,UserRound} from "lucide-react";
import { Kamper } from "./kamper";
import {CoachNotices} from "./team-notices";
import {ClubCrest} from "./club-crest";
import {BadgePanel} from "./badge-panel";
import {developmentVisible} from "@/lib/development/flags";
import {CourtRoom} from "./court-room";
import {courtEnabled} from "@/lib/court/client";
import {Development} from "./development";
import {ChartNoAxesColumnIncreasing} from "lucide-react";
import {LiveAnalysis} from "./live-analysis";
import {ScanLine,ClipboardList as ClipboardIcon} from "lucide-react";
import {PlayerStatistics} from "./player-statistics";
import {DirectoryPanel} from "./directory-panel";
import { TeamTools } from "./team-tools";
import {CoachRatings} from "./coach-ratings";
import { WeeklyPlanner } from "./weekly-planner";
import { QuickCoach,type QuickProgram } from "./quick-coach";

function message(error: unknown) {
  return error && typeof error==="object" && "message" in error ? String(error.message) : "Could not save. Please retry.";
}
function signedOut() { return db?.auth.signOut().then(({error})=>{if(error) throw error;}); }
export function Workspace({ athlete = false, view="dashboard" }: { athlete?: boolean;view?:"dashboard"|"team"|"match"|"challenges"|"directory"|"badges"|"players"|"live"|"development"|"court" }) {
  const [more,setMore]=useState(false),[hash,setHash]=useState("");
  useEffect(()=>{const follow=()=>{setHash(location.hash);setMore(false);};follow();window.addEventListener("hashchange",follow);return()=>window.removeEventListener("hashchange",follow);},[]);
  const [persona,setPersona]=useState(athlete?"liv":"coach");
  const [data,setData]=useState<Snapshot|null>(null);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const sequence=useRef(0);
  const reload=useCallback(async()=>{
    const request=++sequence.current;
    if(demo&&persona==="coach"&&!sessionStorage.getItem("nhf-persona")&&!location.hash){location.replace("/login");return;}
    try {
      const next=await readBeta(persona);
      if((!next&&!demo)||(next&&!next.me.squad)){location.replace(next?"/join":view==="development"?"/login?next=development":view==="court"?"/login?next="+(new URLSearchParams(location.search).get("vis")==="bank"?"bank":"court"):location.hash==="#ratings"?"/login?next=ratings":"/login");return;}
      if(request===sequence.current){setData(next);setError("");}
    } catch(e){if(request===sequence.current){if(message(e).startsWith("Finish joining")){location.replace("/join");return;}setData(null);setError(message(e));}}
    finally {if(request===sequence.current)setReady(true);}
  },[persona,view]);
  useEffect(()=>{
    void reload();
    const update=()=>{void reload();};
    window.addEventListener("focus",update);
    window.addEventListener("storage",update);
    const timer=setInterval(update,30000);
    const listener=db?.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){sequence.current++;setData(null);} });
    return ()=>{sequence.current++;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",update);listener?.data.subscription.unsubscribe();};
  },[reload]);
  async function run(action:()=>Promise<void>){
    setBusy(true);setError("");
    try {await action();await reload();return true;} catch(e){setError(message(e));return false;} finally{setBusy(false);}
  }
  async function login(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const form=new FormData(e.currentTarget);
    await run(async()=>{if(!db) throw Error("Check the deployment configuration.");const {error}=await db.auth.signInWithPassword({email:String(form.get("email")).trim(),password:String(form.get("password"))});if(error)throw error;});
  }
  const notice=error && <p className="error" role="alert">{error}</p>;
  if(!data) return <main className="login grid"><Brand/><h1>{ready?"Team sign-in":"Opening workspace..."}</h1>{notice}{ready && !demo && <form className="grid" onSubmit={login}><label>Email<input required name="email" type="email" autoComplete="username"/></label><label>Password<input required name="password" type="password" autoComplete="current-password"/></label><button disabled={busy} className="btn primary">Sign in</button></form>}{error && <button className="btn" onClick={()=>void run(async()=>{await signedOut();})}>Return to sign-in</button>}</main>;
  const coach=data.me.role==="coach";
  const teamName=data.teams.find(t=>t.id===data.me.squad)?.name;
  const account=<div className="account"><strong>{data.me.name}</strong>{data.club?.eligible&&<label>Arbeidsrolle<select aria-label="Arbeidsrolle" disabled={busy} value={data.club.active?"club":"coach"} onChange={e=>{const mode=e.target.value as "club"|"coach";void run(async()=>{await clubRole(mode);sessionStorage.removeItem("nhf-team:"+data.me.id);setData(null);setReady(false);});}}><option value="coach">Trener</option><option value="club">Klubbadmin</option></select></label>}{coach?<label>Current team<select id="active-team" disabled={busy} value={data.me.squad} onChange={e=>{selectTeam(data.me.id,e.target.value);setData(null);setReady(false);void reload();}}>{data.teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label>:<span>{teamName}</span>}
    {demo&&<span className="badge orange">Local demo</span>}<button className="btn" onClick={async()=>{if(db){const {error}=await db.auth.signOut();if(error){setError(error.message);return;}}sessionStorage.removeItem("nhf-persona");location.assign("/login");}}><LogOut size={16}/>{demo?"Switch account":"Sign out"}</button></div>;
  if(!coach&&view==="court")return <main className="dev-mobile"><CourtRoom key={data.me.squad} data={data}/><nav className="dev-mobile-nav"><a href="/athlete"><House/>Hjem</a><a href="/okter" aria-current="page"><Dumbbell/>Økter</a><a href="/utvikling"><ChartNoAxesColumnIncreasing/>Min utvikling</a></nav></main>;
  if(!coach&&view==="development")return <main className="dev-mobile"><Development data={data}/><nav className="dev-mobile-nav" aria-label="Utøvermeny"><a href="/athlete"><House/> Hjem</a><a href="/utvikling" aria-current="page"><ChartNoAxesColumnIncreasing/> Min utvikling</a><a href="/merker"><Medal/> Merker</a></nav></main>;
  if(!coach) return <main className="mobile-shell"><div className="mobile-main grid"><Brand/>{account}{notice}<WizardGate key={data.me.id+data.me.squad} data={data} reload={reload}><AthleteTraining key={data.me.id} initialTab={view==="badges"?"Merker":view==="challenges"?"Utfordringer":"Today"} data={data} busy={busy} run={run}/></WizardGate></div></main>;
  const navigation=<><a className={"nav-item "+(view==="dashboard"&&(!hash||hash==="#overview")?"active":"")} href="/#overview"><Activity/>Overview</a><a className={"nav-item "+(hash==="#builder"?"active":"")} href="/#builder"><Dumbbell/>Workout builder</a><a className={"nav-item "+(hash==="#weekly"?"active":"")} href="/#weekly"><CalendarDays/>Weekly planner</a><a className={"nav-item "+(hash==="#monitor"?"active":"")} href="/#monitor"><Activity/>Health monitor</a><a className={"nav-item "+(hash==="#ratings"?"active":"")} href="/#ratings"><ClipboardIcon/>Øvelsesvurderinger</a><a className={"nav-item "+(view==="team"?"active":"")} href="/team"><Users/>Team management</a><a className={"nav-item "+(view==="match"?"active":"")} href="/match"><Volleyball aria-hidden="true"/>Kamper</a><a className={"nav-item "+(view==="live"?"active":"")} href="/liveanalyse"><ScanLine/>Liveanalyse</a><a className={"nav-item "+(view==="players"?"active":"")} href="/spillerstats"><ChartNoAxesColumn/>Spillerstats</a><a className={"nav-item "+(view==="challenges"?"active":"")} href="/challenges"><Trophy/>Utfordringer</a>{courtEnabled&&<><a className={"nav-item "+(view==="court"?"active":"")} href="/okter"><ClipboardIcon/>Øktplanlegger</a><a className="nav-item" href="/okter?vis=bank"><BookOpen/>Øvelsesbank</a></>}{developmentVisible&&<a className={"nav-item "+(view==="development"?"active":"")} href="/utvikling"><ChartNoAxesColumnIncreasing/>Min utvikling</a>}<a className={"nav-item "+(view==="badges"?"active":"")} href="/merker"><Medal/>Merker</a><a className={"nav-item "+(hash==="#messages"?"active":"")} href="/#messages"><Users/>Meldinger</a><a className={"nav-item "+(view==="directory"?"active":"")} href="/directory"><ContactRound/>Brukeroversikt</a></>;
  return <div className={"app-shell beta"+(view==="development"||view==="court"?" dev-shell":"")}><aside className="sidebar"><Brand/><nav className="nav-section">{navigation}</nav><div className="sidebar-footer muted">Performance operations</div></aside>
    <main className={"main grid coach-main "+(view==="match"?"match-main":"")} id="overview"><div className="phone-brand"><Brand/><button aria-label="Kontomeny" aria-expanded={more} onClick={()=>setMore(!more)}><UserRound/></button></div><header className="page-head"><div><span className="eyeline">Trenerrom / {view==="court"?"Øktplanlegger":view==="development"?"Min utvikling":view==="live"?"Liveanalyse":view==="players"?"Spillerstats":view==="badges"?"Merker":view==="directory"?"Brukeroversikt":view==="match"?"Kamper":view==="team"?"Lagstyring":view==="challenges"?"Utfordringer":hash==="#ratings"?"Øvelsesvurderinger":"Oversikt"}</span><h1>{view==="team"?"Team settings":view==="court"?"Øktplanlegger":view==="development"?"Min utvikling":view==="live"?"Liveanalyse":view==="players"?"Spillerstats":view==="badges"?"Merker":view==="directory"?"Brukeroversikt":view==="match"?"Kamper":view==="challenges"?"Utfordringer":hash==="#ratings"?"Øvelsesvurderinger":"Squad overview"}</h1></div>{account}</header>{more&&<section className="phone-more"><nav aria-label="Flere trenerverktøy">{navigation}</nav>{account}</section>}
    <nav className="phone-tabs" aria-label="Trenervalg"><a className={view==="dashboard"&&hash!=="#weekly"?"current":""} href="/#overview"><House/>Oversikt</a><a className={view==="dashboard"&&hash==="#weekly"?"current":""} href="/#weekly"><CalendarDays/>Ukeplan</a><a className={view==="match"?"current":""} href="/match"><Volleyball aria-hidden="true"/>Kamper</a><button aria-expanded={more} onClick={()=>setMore(!more)}><Ellipsis/>Mer</button></nav>{notice}
    {view==="court"?<CourtRoom key={data.me.squad} data={data}/>:view==="development"?<Development key={data.me.squad} data={data}/>:view==="live"?<LiveAnalysis key={data.me.squad} data={data}/>:view==="players"?<PlayerStatistics key={data.me.squad} data={data}/>:view==="badges"?<BadgePanel key={data.me.squad} data={data}/>:view==="directory"?<DirectoryPanel key={String(data.club?.active)} data={data}/>:view==="challenges"?<Challenges key={data.me.squad} data={data}/>:view==="team"?<TeamTools key={data.me.squad+":"+data.admins.includes(data.me.id)} data={data} busy={busy} run={run}/>:view==="match"?<Kamper key={data.me.squad} data={data}/>:<Coach key={data.me.squad} hash={hash} data={data} busy={busy} run={run}/>}<details><summary>About the platform and account roles</summary><About/></details></main></div>;
}
function Brand(){return <div className="brand"><ClubCrest/><div>Lundehaugen IL<br/><small>Performance Platform</small></div></div>;}
function count(data:Snapshot,id:string){return data.checks.filter(c=>c.assignment===id).length;}
function Coach({data,busy,run,hash}:{data:Snapshot;busy:boolean;run:Run;hash:string}){
  const [quick,setQuick]=useState<{id:string;draft:QuickProgram}>();
  const dirty=useRef(false);
  const flagDraft=useCallback((value:boolean)=>{dirty.current=value;},[]);
  function openDraft(draft:QuickProgram){
    if(dirty.current&&!window.confirm("Replace the current program draft? Saved programs will not change."))return;
    setQuick({id:crypto.randomUUID(),draft});
    location.hash="builder";requestAnimationFrame(()=>document.getElementById("builder")?.scrollIntoView());
  }
  const players=data.roster.filter(p=>p.role==="athlete");
  const [filter,setFilter]=useState("");
  const schedule=data.plans.filter(p=>!filter || p.day===filter).sort((a,b)=>b.day.localeCompare(a.day)||a.title.localeCompare(b.title));
  function report(){
    const escape=(v:string)=>'"'+(/^[=+@\-\t\r]/.test(v)?"'":"")+v.replaceAll('"','""')+'"';
    const csv=[["Date","Workout","Athlete","Exercises done","Exercises assigned"],...schedule.map(p=>[p.day,p.title,players.find(a=>a.id===p.athlete)?.name||"",String(count(data,p.id)),String(p.exercises.length)])].map(row=>row.map(escape).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="NHF-training.csv";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  if(!hash||hash==="#overview")return <CoachAgenda data={data}/>;
  if(hash==="#ratings")return <CoachRatings key={data.me.squad} data={data}/>;
  if(hash==="#messages")return <><CoachNotices data={data} run={run} busy={busy}/><Conversation data={data}/></>;
  return <>
    <WeeklyPlanner data={data} busy={busy} run={run} onDraft={openDraft} renderBuilder={show=><>
      <QuickCoach onApply={openDraft}/>
      <ProgramBuilder key={quick?.id} initial={quick?.draft} data={data} busy={busy} run={run} onDirty={flagDraft} onCalendar={show}/>
    </>}/>
    <section className="panel panel-pad grid" id="schedule"><header className="page-head"><FeatureInfo topic="week"><h2><CalendarDays/> Training schedule</h2></FeatureInfo><button onClick={report} className="btn"><Download size={16}/>CSV</button></header><label>Filter by day<input type="date" value={filter} onChange={e=>setFilter(e.target.value)}/></label>{schedule.map(p=><div className="result" key={p.id}><div><strong>{p.title}</strong><p className="muted">{p.day} · {players.find(a=>a.id===p.athlete)?.name}</p></div><span className="badge blue">{count(data,p.id)} / {p.exercises.length} done</span></div>)}{!schedule.length && <p>No workouts scheduled for this selection.</p>}</section></>;
}
