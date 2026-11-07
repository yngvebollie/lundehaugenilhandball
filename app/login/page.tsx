"use client";

import { useEffect, useState, type FormEvent } from "react";
import { db, demo, demoAccounts, joinDemo, registerDemoAthlete,selectTeam } from "@/lib/beta";
import { Activity, ArrowLeft, ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { PublicShell } from "@/features/beta/public-shell";

export default function Login(){
  const [invite,setInvite]=useState("");
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [phone,setPhone]=useState("");
  const [password,setPassword]=useState("");
  const [signup,setSignup]=useState(false);
  const [join,setJoin]=useState(false),[link,setLink]=useState("");
  const [role,setRole]=useState<"coach"|"athlete">("coach");
  const [selected,setSelected]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [account,setAccount]=useState("coach");
  const [signed,setSigned]=useState("");
  const [accounts,setAccounts]=useState<{id:string;name:string;role:string}[]>([]);
  useEffect(()=>{
    setInvite(new URLSearchParams(location.search).get("invite")||"");
    setSignup(new URLSearchParams(location.search).get("new")==="1");
    const param=new URLSearchParams(location.search).get("role");
    if(param==="coach"||param==="athlete"){setSelected(true);setRole(param);setAccount(param==="athlete"?"liv":"coach");}
    if(demo)setAccounts(demoAccounts());
    if(!db)return;
    const sub=db.auth.onAuthStateChange((_,s)=>setSigned(s?.user.email||""));
    return ()=>sub.data.subscription.unsubscribe();
  },[]);
  async function enter(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      if(demo){
        if(invite)joinDemo(invite,email.trim().toLowerCase(),name.trim());
        else if(join&&role==="athlete"){registerDemoAthlete(email.trim().toLowerCase(),name.trim());location.assign("/join");return;}
        else sessionStorage.setItem("nhf-persona",account);
      }else{
        if(!db)throw Error("Both Supabase public settings are required.");
        if(!signed){
          if(signup||(join&&role==="athlete")){
            const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:invite?location.href:location.origin+"/join",data:{full_name:name.trim(),contact_phone:phone.trim()}}});
            if(error)throw error;
            if(!data.session){setMessage(invite?"Confirm your email, then reopen your invitation.":"Confirm your email, then sign in as an athlete to choose a team.");return;}
          }else{
            const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
          }
        }
        if(!invite){
          const user=(await db.auth.getUser()).data.user;
          const member=await db.from("beta_members").select("role").eq("id",user?.id).maybeSingle().throwOnError();
          if(member.data&&member.data.role!==role)throw Error("Choose "+member.data.role+" sign-in for this account.");
          if(!member.data){if(role==="athlete"){location.assign("/join");return;}throw Error("Accept a coach invitation to open the coach dashboard.");}
        }
        if(invite){
          const team=(await db.rpc("beta_join",{code:invite,display_name:name.trim()}).throwOnError()).data;
          const {data}=await db.auth.getUser();if(data.user)selectTeam(data.user.id,String(team));
        }
      }
      if(demo&&!invite&&role==="athlete"&&!demoAccounts().find(m=>m.id===account)?.squad){location.assign("/join");return;}
      location.assign(invite?"/":role==="athlete"?"/athlete":"/");
    }catch(error){setMessage((error as Error).message||"Could not sign in.");}finally{setBusy(false);}
  }
  const choice=!selected&&!invite;
  return <PublicShell><div className="entry-content">
    {!choice&&!invite&&<a className="entry-back" href="/login"><ArrowLeft size={16}/>Choose another role</a>}
    <h1>{choice?"Team sign-in":invite?"Join your team":join?"Create an account":role==="coach"?"Coach login":"Athlete login"}</h1>
    {choice?<><p className="entry-lead">Choose your role to continue.</p><nav className="entry-roles" aria-label="Account role">
      <a className="entry-role athlete" href="/login?role=athlete" aria-label="Athlete login"><span className="role-icon"><Activity/></span><span><strong>Athlete login</strong><small>My sessions, progress and feedback</small></span><ArrowRight size={19}/></a>
      <a className="entry-role coach" href="/login?role=coach" aria-label="Coach login"><span className="role-icon"><ClipboardList/></span><span><strong>Coach login</strong><small>Team planning, workload and match day</small></span><ArrowRight size={19}/></a>
    </nav></>:<>
    {join&&!invite&&role==="coach"?<form className="grid" onSubmit={e=>{e.preventDefault();try{const url=new URL(link.trim(),location.origin);const shared=url.searchParams.get("link");const code=shared||url.searchParams.get("invite")||link.trim();if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(code))throw Error();location.assign((shared?"/apply?link=":"/login?new=1&invite=")+encodeURIComponent(code));}catch{setMessage("Enter the invitation link from your team administrator.");}}}><label>Team invitation link or code<input required value={link} onChange={e=>setLink(e.target.value)}/></label><p className="muted">Coach accounts require an invitation from a team admin.</p><button className="btn primary">Continue with invitation</button></form>:<>
    <form className="grid" onSubmit={enter}>
    {demo&&!invite&&!join?<label>Demo account<select value={account} onChange={e=>setAccount(e.target.value)}>{accounts.filter(m=>m.role===role).map(m=><option value={m.id} key={m.id}>{m.name} · {m.role}</option>)}</select></label>:<>
      {(invite||join)&&<label>Your name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
      {!signed&&(signup||join)&&<label>Phone number<input required type="tel" minLength={7} maxLength={30} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>}
      {signed?<p>Signed in as {signed}</p>:<><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>{!demo&&<label>Password<input required type="password" minLength={signup?8:1} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}</>}
    </>}
    <button className="btn primary" disabled={busy}>{invite?(signup&&!signed?"Create account and join":"Accept invitation"):join?"Continue to team selection":"Sign in"}</button></form>
    {!demo&&invite&&!signed&&<button className="btn" onClick={()=>setSignup(!signup)}>{signup?"Use existing account":"Create invited account"}</button>}</>}
    {signed&&<button className="btn" onClick={()=>db?.auth.signOut()}>Switch account</button>}{message&&<p role="status">{message}</p>}
    {!invite&&<div className="entry-alternate">{join?"Already have an account?":"New to the platform?"} <button type="button" onClick={()=>{setJoin(!join);setMessage("");}}>{join?"Sign in":"Create account"}</button></div>}
    </>}
    {demo&&<small className="entry-demo">Browser-local demo</small>}
    <footer className="entry-footer"><a href="/documentation"><BookOpen size={17}/>Platform documentation<ArrowRight size={15}/></a></footer>
    </div></PublicShell>;
}
