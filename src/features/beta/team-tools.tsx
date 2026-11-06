import { useState, type FormEvent } from "react";
import { Users, UserRound } from "lucide-react";
import { createTeam, inviteMember, renameTeam, saveProfile, type Member, type Snapshot } from "@/lib/beta";
import type { Run } from "./program-builder";

export function TeamTools({data,busy,run}:{data:Snapshot;busy:boolean;run:Run}){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<Member["role"]>("athlete");
  const [url,setUrl]=useState("");
  const [copied,setCopied]=useState(false);
  async function invite(e:FormEvent){
    e.preventDefault();setCopied(false);setUrl("");
    await run(async()=>setUrl(await inviteMember(data.me.squad,email.trim().toLowerCase(),role)));
  }
  return <section className="panel panel-pad grid" id="team"><h2><Users/> Team management</h2>
    <p className="muted">Coaching staff · {data.roster.filter(m=>m.role==="coach").map(m=>m.name).join(", ")}</p>
    <label>Team name<input value={name} maxLength={80} placeholder={data.teams.find(t=>t.id===data.me.squad)?.name} onChange={e=>setName(e.target.value)}/></label>
    <div className="day-strip"><button className="btn" disabled={!name.trim()||busy} onClick={()=>run(()=>createTeam(data.me,name.trim()))}>Create team</button><button className="btn" disabled={!name.trim()||busy} onClick={()=>run(()=>renameTeam(data.me.squad,name.trim()))}>Rename current team</button></div>
    <form className="grid" onSubmit={invite}><label>Invite email<input type="email" required value={email} maxLength={254} onChange={e=>setEmail(e.target.value)}/></label><label>Invite role<select value={role} onChange={e=>setRole(e.target.value as Member["role"])}><option value="athlete">Athlete</option><option value="coach">Coach</option></select></label><button className="btn" disabled={busy}>Create invitation link</button></form>
    {url&&<><label>Invitation link · valid for 7 days<input value={url} readOnly onFocus={e=>e.target.select()}/></label><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setCopied(false);}}}>{copied?"Copied":"Copy invitation link"}</button></>}
  </section>;
}
async function thumbnail(file:File){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>8_000_000)throw Error("Choose a JPG, PNG or WebP under 8 MB.");
  const img=await createImageBitmap(file);
  try{
    const canvas=document.createElement("canvas");canvas.width=canvas.height=200;
    const edge=Math.min(img.width,img.height);
    canvas.getContext("2d")!.drawImage(img,(img.width-edge)/2,(img.height-edge)/2,edge,edge,0,0,200,200);
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
