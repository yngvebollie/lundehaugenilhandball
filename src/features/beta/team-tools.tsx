import { useState, type FormEvent } from "react";
import { Users, UserRound } from "lucide-react";
import { createTeam, demo, emailInvites, inviteBatch, saveTeamDetails, saveProfile, type Member, type Snapshot } from "@/lib/beta";
import type { Run } from "./program-builder";
import {TeamEntry} from "./team-entry";
import {ShareLink,TeamStaff} from "./team-staff";

export function TeamTools({data,busy,run}:{data:Snapshot;busy:boolean;run:Run}){
  const teamName=data.teams.find(t=>t.id===data.me.squad)?.name||"";
  const [name,setName]=useState(teamName);
  const savedLogo=data.teams.find(t=>t.id===data.me.squad)?.logo||"";
  const [logo,setLogo]=useState(savedLogo);
  const [newName,setNewName]=useState(""),[status,setStatus]=useState("");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<Member["role"]>("athlete");
  const [links,setLinks]=useState<{email:string;url:string}[]>([]);
  const [copied,setCopied]=useState(false);
  async function invite(e:FormEvent){
    e.preventDefault();setCopied(false);setLinks([]);setStatus("");
    const manual=demo||((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null)?.value==="manual";
    await run(async()=>{
      if(manual){setLinks(await inviteBatch(data.me.squad,email,role));setStatus("Links created. No email sent.");return;}
      const result=await emailInvites(data.me.squad,email,role);
      setLinks(result.links);setStatus(result.accepted?result.links.length+" invitation email(s) accepted for sending.":"Email acceptance not confirmed. Share the links below.");
    });
  }
  return <section className="panel panel-pad grid" id="team"><h2><Users/> Team management</h2>
    <p className="muted">Coaching staff · {data.roster.filter(m=>m.role==="coach").map(m=>m.name).join(", ")}</p>
    <form className="grid" onSubmit={async e=>{e.preventDefault();const next=name.trim();if(next&&await run(()=>saveTeamDetails(data.me.squad,next,logo))){setName(next);setStatus("Team details saved.");}}}><label>Team name<input value={name} maxLength={80} required onChange={e=>{setName(e.target.value);setStatus("");}}/></label>
    {logo&&<img src={logo} width={72} height={72} alt="Team logo preview"/>}<label>Team logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(file)try{setLogo(await thumbnail(file,true));}catch(err){setStatus((err as Error).message);}}}/></label>
    {logo&&<button className="btn" type="button" onClick={()=>setLogo("")}>Remove logo</button>}<button className="btn primary" disabled={busy||!name.trim()||(name.trim()===teamName&&logo===savedLogo)}>Save</button></form>
    <details className="library-tools"><summary>Add another team</summary><form className="grid" onSubmit={async e=>{e.preventDefault();const next=newName.trim();if(next&&await run(()=>createTeam(data.me,next))){setNewName("");setStatus(next+" created. Publishing team: "+teamName+".");}}}><label>New team name<input value={newName} required maxLength={80} onChange={e=>setNewName(e.target.value)}/></label><button className="btn" disabled={busy||!newName.trim()}>Create team</button></form></details>
    {status&&<p role="status">{status}</p>}
    <TeamStaff data={data} busy={busy} run={run}/><ShareLink data={data} busy={busy} run={run}/>
    <form className="grid" onSubmit={invite}><label>Invite emails<textarea rows={3} required value={email} maxLength={26000} placeholder="Paste up to 100 email addresses" onChange={e=>setEmail(e.target.value)}/></label><label>Invite role<select value={role} onChange={e=>setRole(e.target.value as Member["role"])}><option value="athlete">Athlete</option>{data.admins.includes(data.me.id)&&<option value="coach">Coach</option>}</select></label>{!demo&&<button className="btn primary" disabled={busy}>Send invitations</button>}<button className="btn" value="manual" disabled={busy}>{demo?"Create invitation links":"Create links only"}</button></form>
    {links.length>0&&<><div className="invite-results grid">{links.map(item=><label key={item.email}>Invitation link · {item.email}<input value={item.url} readOnly onFocus={e=>e.target.select()}/></label>)}</div><small>Links expire in seven days. Share each link with its matching recipient.</small><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(links.map(l=>l.email+" "+l.url).join("\n"));setCopied(true);}catch{setCopied(false);}}}>{copied?"Copied":"Copy recipient links"}</button></>}
    <TeamEntry data={data} run={run} busy={busy}/></section>;
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
  const [name,setName]=useState(me.name),[position,setPosition]=useState(me.position||""),[bio,setBio]=useState(me.bio||""),[photo,setPhoto]=useState(me.photo||""),[note,setNote]=useState("");
  return <section className="panel panel-pad grid"><h2><UserRound/> Athlete profile</h2>{photo&&<img src={photo} width={80} height={80} alt="Profile portrait"/>}
    <label>Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const f=e.target.files?.[0];if(f)try{setPhoto(await thumbnail(f));setNote("");}catch(err){setNote((err as Error).message);}}}/></label>{photo&&<button className="btn" onClick={()=>setPhoto("")}>Remove photo</button>}
    <label>Display name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)}/></label><label>Playing position<input value={position} maxLength={80} onChange={e=>setPosition(e.target.value)}/></label><label>About me<textarea value={bio} maxLength={500} onChange={e=>setBio(e.target.value)}/></label>
    <button className="btn primary" disabled={busy||!name.trim()} onClick={async()=>{if(await run(()=>saveProfile(me,{name:name.trim(),position,bio,photo})))setNote("Profile saved.");}}>Save profile</button>{note&&<p role="status">{note}</p>}</section>;
}
