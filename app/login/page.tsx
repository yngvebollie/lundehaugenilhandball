"use client";

import { useEffect, useState, type FormEvent } from "react";
import { db, demo, demoAccounts, joinDemo, selectTeam } from "@/lib/beta";

export default function Login(){
  const [invite,setInvite]=useState("");
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [password,setPassword]=useState("");
  const [signup,setSignup]=useState(false);
  const [join,setJoin]=useState(false),[link,setLink]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [account,setAccount]=useState("coach");
  const [signed,setSigned]=useState("");
  const [accounts,setAccounts]=useState<{id:string;name:string;role:string}[]>([]);
  useEffect(()=>{
    setInvite(new URLSearchParams(location.search).get("invite")||"");
    setSignup(new URLSearchParams(location.search).get("new")==="1");
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
        else sessionStorage.setItem("nhf-persona",account);
      }else{
        if(!db)throw Error("Both Supabase public settings are required.");
        if(!signed){
          if(signup){
            const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:location.href}});
            if(error)throw error;
            if(!data.session){setMessage("Confirm your email, then reopen the invitation to join.");return;}
          }else{
            const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
          }
        }
        if(invite){
          const team=(await db.rpc("beta_join",{code:invite,display_name:name.trim()}).throwOnError()).data;
          const {data}=await db.auth.getUser();if(data.user)selectTeam(data.user.id,String(team));
        }
      }
      location.assign("/");
    }catch(error){setMessage((error as Error).message||"Could not sign in.");}finally{setBusy(false);}
  }
  return <main className="login grid"><div className="brand"><div className="brand-mark">NHF</div>Performance Platform</div>
    <h1>{invite?"Join your team":join?"Create an account":"Team sign-in"}</h1>{demo&&<span className="badge orange">Browser-local demo</span>}
    {!invite&&<div className="day-strip">{["Sign in","Create account"].map((t,i)=><button className={"btn "+(join===Boolean(i)?"selected":"")} aria-pressed={join===Boolean(i)} key={t} onClick={()=>{setJoin(Boolean(i));setMessage("");}}>{t}</button>)}</div>}
    {join&&!invite?<form className="grid" onSubmit={e=>{e.preventDefault();try{const url=new URL(link.trim(),location.origin);const code=url.searchParams.get("invite")||link.trim();if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(code))throw Error();location.assign("/login?new=1&invite="+encodeURIComponent(code));}catch{setMessage("Enter the invitation link or code from your coach.");}}}><label>Team invitation link or code<input required value={link} onChange={e=>setLink(e.target.value)}/></label><p className="muted">Your coach’s invitation sets your team and account role.</p><button className="btn primary">Continue with invitation</button></form>:<>
    <form className="grid" onSubmit={enter}>
    {demo&&!invite?<label>Demo account<select value={account} onChange={e=>setAccount(e.target.value)}>{accounts.map(m=><option value={m.id} key={m.id}>{m.name} · {m.role}</option>)}</select></label>:<>
      {invite&&<label>Your name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
      {signed?<p>Signed in as {signed}</p>:<><label>Email<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>{!demo&&<label>Password<input required type="password" minLength={signup?8:1} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}</>}
    </>}
    <button className="btn primary" disabled={busy}>{invite?(signup&&!signed?"Create account and join":"Accept invitation"):"Open workspace"}</button></form>
    {!demo&&invite&&!signed&&<button className="btn" onClick={()=>setSignup(!signup)}>{signup?"Use existing account":"Create invited account"}</button>}</>}
    {signed&&<button className="btn" onClick={()=>db?.auth.signOut()}>Switch account</button>}{message&&<p role="status">{message}</p>}
  </main>;
}
