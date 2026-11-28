import {FeatureInfo} from "./feature-info";
import {ClubLog,usePending} from "./club-log";
import {CoachPositions} from "./player-wizard";
import { useState, type FormEvent } from "react";
import { Users, UserRound,KeyRound,Link as LinkIcon,Mail,Copy,RefreshCw } from "lucide-react";
import { createTeam, demo, emailInvites, inviteBatch, saveTeamDetails, saveProfile, type Member, type Snapshot } from "@/lib/beta";
import type { Run } from "./program-builder";
import {invitationCode} from "@/lib/invitation-code";
import {clubLink} from "@/lib/club-url";
import {useEffect} from "react";
import "./squad-stats.css";
import {TeamEntry} from "./team-entry";
import {ShareLink,TeamStaff} from "./team-staff";
import {InvitationDeliveries} from "./invitation-deliveries";
import {GuardianManagement} from './guardian-management';

export function TeamTools({data,busy,run}:{data:Snapshot;busy:boolean;run:Run}){
  const teamName=data.teams.find(t=>t.id===data.me.squad)?.name||"";
  const [name,setName]=useState(teamName);
  const savedLogo=data.teams.find(t=>t.id===data.me.squad)?.logo||"";
  const [logo,setLogo]=useState(savedLogo);
  const [newName,setNewName]=useState(""),[status,setStatus]=useState("");
  const pending=usePending(data.me.squad);
  const [tab,setTab]=useState("Medlemmer"),[method,setMethod]=useState("Lenke");
  useEffect(()=>{const v=new URLSearchParams(location.search).get("vis");if(v==="posisjoner")setTab("Posisjoner");if(v==="soknader")setTab("Søknader");if(v==="inviter")setTab("Inviter");if(v==="lagprofil")setTab("Lagprofil");if(v==='foresatte')setTab('Foresatte');},[]);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<Member["role"]>("athlete");
  const [links,setLinks]=useState<{email:string;url:string}[]>([]);
  const [copied,setCopied]=useState(false);
  const [deliveryRevision,setDeliveryRevision]=useState(0);
  async function invite(e:FormEvent){
    e.preventDefault();setCopied(false);setLinks([]);setStatus("");
    const manual=demo||((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null)?.value==="manual";
    await run(async()=>{
      if(manual){setLinks(await inviteBatch(data.me.squad,email,role));setStatus("Lenker opprettet. Ingen e-post er sendt.");return;}
      const result=await emailInvites(data.me.squad,email,role);
      setLinks(result.links);setStatus(result.reason||"Se leveringsstatus per mottaker nedenfor.");setDeliveryRevision(v=>v+1);
    });
  }
  return <section className="panel panel-pad grid" id="team"><h2><Users/> {teamName}</h2><nav className="workspace-tabs" aria-label="Lagadministrasjon">{["Medlemmer","Inviter","Foresatte","Posisjoner","Lagprofil","Søknader","Trenerlogg"].map(v=><button className={tab===v?"current":""} key={v} aria-pressed={tab===v} onClick={()=>{setTab(v);setStatus("");}}>{v}{v==="Søknader"&&pending>0&&<span className="pending-count" aria-label={pending+" ventende søknader"}>{pending}</span>}</button>)}</nav>{tab==="Trenerlogg"&&<ClubLog team={data.me.squad}/>}{tab==='Foresatte'&&<GuardianManagement data={data}/>}
    {tab==="Lagprofil"&&<>
    <p className="muted">Coaching staff · {data.roster.filter(m=>m.role==="coach").map(m=>m.name).join(", ")}</p>
    <form className="grid" onSubmit={async e=>{e.preventDefault();const next=name.trim();if(next&&await run(()=>saveTeamDetails(data.me.squad,next,logo))){setName(next);setStatus("Team details saved.");}}}><label>Team name<input value={name} maxLength={80} required onChange={e=>{setName(e.target.value);setStatus("");}}/></label>
    {logo&&<img src={logo} width={72} height={72} alt="Team logo preview"/>}<label>Team logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(file)try{setLogo(await thumbnail(file,true));}catch(err){setStatus((err as Error).message);}}}/></label>
    {logo&&<button className="btn" type="button" onClick={()=>setLogo("")}>Remove logo</button>}<button className="btn primary" disabled={busy||!name.trim()||(name.trim()===teamName&&logo===savedLogo)}>Save</button></form>
    <details className="library-tools"><summary>Legg til et lag</summary><FeatureInfo topic="team"/><form className="grid" onSubmit={async e=>{e.preventDefault();const next=newName.trim();if(next&&await run(async()=>{await createTeam(data.me,next);})){setNewName("");setStatus(next+" er opprettet. Aktivt lag: "+teamName+".");}}}><label>Nytt lagnavn<input value={newName} required maxLength={80} onChange={e=>setNewName(e.target.value)}/></label><button className="btn" disabled={busy||!newName.trim()}>Opprett lag</button></form></details>
    </>}
    {tab==="Posisjoner"&&<CoachPositions data={data}/>}
    {tab==="Medlemmer"&&<TeamStaff data={data} busy={busy} run={run}/>}
    {tab==="Inviter"&&<><FeatureInfo topic="team"><h3>Inviter til {teamName}</h3></FeatureInfo>
    <label>Rolle i laget<select value={role} onChange={e=>{setRole(e.target.value as Member["role"]);setLinks([]);setStatus("");setCopied(false);}}><option value="athlete">Utøver</option>{data.admins.includes(data.me.id)&&<option value="coach">Trener</option>}</select></label>
    <div className="stat-switch" role="group" aria-label="Invitasjonsmåte">{[["Lenke",LinkIcon],["Kode",KeyRound],["E-post",Mail]].map(([v,Icon])=>{const I=Icon as typeof Mail;return <button aria-pressed={method===v} key={String(v)} onClick={()=>{setMethod(String(v));setStatus("");}}><I size={15} aria-hidden="true"/> {String(v)}</button>;})}</div>
    {method==="Lenke"?<ShareLink key={data.me.squad+role} data={data} busy={busy} run={run} role={role}/>:method==="Kode"?<InviteCode key={data.me.squad+role} team={data.me.squad} role={role} busy={busy} run={run}/>:<>
    <h3>Inviter på e-post</h3><p className="muted">Hver mottaker får sin egen invitasjon til dette laget. Bruk Lenke hvis du vil invitere uten å kjenne adressen.</p>
    <form className="grid" onSubmit={invite}><label>E-postadresser<textarea rows={3} required value={email} maxLength={26000} placeholder="Én eller flere adresser, skilt med komma eller linjeskift" onChange={e=>setEmail(e.target.value)}/></label>{!demo&&<button className="btn primary" disabled={busy}>Send invitasjoner</button>}<button className="btn" value="manual" disabled={busy}>{demo?"Opprett invitasjonslenker":"Opprett kun lenker"}</button></form>
    {links.length>0&&<><div className="invite-results grid">{links.map(item=><div key={item.email}><label>Invitasjon · {item.email}<input value={item.url} readOnly onFocus={e=>e.target.select()}/></label><a href={"mailto:"+encodeURIComponent(item.email)+"?subject="+encodeURIComponent("Invitasjon til "+teamName)+"&body="+encodeURIComponent("Hei! Du er invitert til "+teamName+". Åpne din personlige invitasjon innen sju dager:\n\n"+item.url)}>Åpne i eget e-postprogram</a></div>)}</div><small>Personlige lenker er gyldige i sju dager. Del hver lenke kun med mottakeren.</small><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(links.map(l=>l.email+" "+l.url).join("\n"));setCopied(true);}catch{setCopied(false);}}}>{copied?"Kopiert":"Kopier mottakerlenkene"}</button></>}
    <InvitationDeliveries key={data.me.squad} team={data.me.squad} revision={deliveryRevision}/>
    </>}</>}{tab==="Søknader"&&<TeamEntry data={data} run={run} busy={busy}/>}
    {status&&<p role="status">{status}</p>}</section>;
}
function InviteCode({team,role,busy,run}:{team:string;role:Member["role"];busy:boolean;run:Run}){
  const [record,setRecord]=useState<{code:string;expires:string}|null>(null),[note,setNote]=useState(""),[ready,setReady]=useState(false);
  useEffect(()=>{let alive=true;invitationCode(team,role,"get").then(r=>{if(alive){setRecord(r);setReady(true);}}).catch(e=>{if(alive)setNote(e.message);});return()=>{alive=false;};},[team,role]);
  const coach=role==="coach",name=coach?"trenerkode":"utøverkode";
  async function copy(s:string){try{await navigator.clipboard.writeText(s);setNote("Kopiert.");}catch{setNote("Marker feltet og kopier.");}}
  return <section className="grid"><h3>{coach?"Trenerkode":"Utøverkode"}</h3><small>{coach?"Engangskode · gyldig i 24 timer · gir vanlig trenerrolle":"Lagkode · gyldig i 7 dager · kan brukes av flere utøvere"}</small>
    {record&&<><label>Aktiv kode<input readOnly value={record.code} onFocus={e=>e.target.select()}/></label><small>Utløper {new Date(record.expires).toLocaleString("nb-NO")}</small><div className="day-strip"><button className="btn primary" onClick={()=>copy(record.code)}><Copy size={16}/>Kopier kode</button>
      <button className="btn" onClick={()=>copy(clubLink("/apply?"+role+"_code="+record.code,demo?location.origin:undefined))}><LinkIcon size={16}/>Kopier registreringslenke</button></div></>}
    <div className="day-strip"><button className={record?"btn":"btn primary"} disabled={busy||!ready} onClick={()=>{if(record&&!confirm("Erstatte koden? Den gamle slutter å virke."))return;void run(async()=>{setRecord(await invitationCode(team,role,"issue"));setNote("Koden er klar til deling.");});}}><RefreshCw size={16}/>{record?"Erstatt kode":"Opprett "+name}</button>
    {record&&<button className="btn" disabled={busy} onClick={()=>run(async()=>{setRecord(await invitationCode(team,role,"revoke"));setNote("Koden er deaktivert.");})}>Deaktiver kode</button>}</div>
    {note&&<p role="status">{note}</p>}</section>;
}
async function thumbnail(file:File,fit=false){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8_000_000)throw Error("Choose a JPG, PNG or WebP under 8 MB.");
  const img=await createImageBitmap(file);
  try{
    const canvas=document.createElement("canvas");canvas.width=canvas.height=200;
    const edge=Math.min(img.width,img.height);
    const ctx=canvas.getContext("2d")!;
    if(fit){const scale=200/Math.max(img.width,img.height);ctx.fillStyle="#ffffff";ctx.fillRect(0,0,200,200);ctx.drawImage(img,(200-img.width*scale)/2,(200-img.height*scale)/2,img.width*scale,img.height*scale);}
    else ctx.drawImage(img,(img.width-edge)/2,(img.height-edge)/2,edge,edge,0,0,200,200);
    return canvas.toDataURL("image/jpeg",0.82);
  }finally{img.close();}
}
export function Profile({me,busy,run}:{me:Member;busy:boolean;run:Run}){
  const [bio,setBio]=useState(me.bio||""),[photo,setPhoto]=useState(me.photo||""),[note,setNote]=useState("");
  return <section className="panel panel-pad grid"><h2><UserRound/> Utøverprofil</h2><FeatureInfo topic="wizard"/>{photo&&<img src={photo} width={80} height={80} alt="Profilbilde av utøveren"/>}
    <label>Profilbilde<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const f=e.target.files?.[0];if(f)try{setPhoto(await thumbnail(f));setNote("");}catch(err){setNote((err as Error).message);}}}/></label>{photo&&<button className="btn" onClick={()=>setPhoto("")}>Fjern profilbilde</button>}
    <a className="btn" href="/athlete?profil=rediger">Rediger spillerprofil og posisjoner</a><label>Om meg<textarea value={bio} maxLength={500} onChange={e=>setBio(e.target.value)}/></label>
    <button className="btn primary" disabled={busy} onClick={async()=>{if(await run(()=>saveProfile(me,{name:me.name,given_name:me.given_name,family_name:me.family_name,shirt_number:me.shirt_number,position:me.position,bio,photo})))setNote("Profilen er lagret.");}}>Lagre profil</button>{note&&<p role="status">{note}</p>}</section>;
}
