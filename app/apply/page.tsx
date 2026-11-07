"use client";
import {useEffect,useState,type FormEvent} from "react";
import {PublicShell} from "@/features/beta/public-shell";
import {applications,applyWithLink,db,demo,linkInfo,selectTeam,type LinkInfo,type Application} from "@/lib/beta";

export default function Apply(){
  const [code,setCode]=useState(""),[info,setInfo]=useState<LinkInfo|null>(null),[ready,setReady]=useState(false);
  const [existing,setExisting]=useState(false),[signed,setSigned]=useState(""),[name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState(""),[password,setPassword]=useState("");
  const [request,setRequest]=useState<Application>(),[note,setNote]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{
    const token=new URLSearchParams(location.search).get("link")||"";setCode(token);
    linkInfo(token).then(setInfo).catch(e=>setNote(e.message)).finally(()=>setReady(true));
    const listener=db?.auth.onAuthStateChange((_,session)=>{setSigned(session?.user.email||"");if(session){setName(n=>n||session.user.user_metadata?.full_name||"");setPhone(n=>n||session.user.user_metadata?.contact_phone||"");}});
    return ()=>listener?.data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    setRequest(undefined);
    if(!info||(!signed&&!demo))return;
    let active=true;const refresh=()=>applications().then(rows=>{if(active)setRequest(rows.find(r=>r.team===info.id&&(r.role||"athlete")===info.role));}).catch(e=>{if(active)setNote(e.message);});
    void refresh();window.addEventListener("focus",refresh);const timer=setInterval(refresh,12000);
    return ()=>{active=false;window.removeEventListener("focus",refresh);clearInterval(timer);};
  },[info,signed]);
  async function submit(e:FormEvent){
    e.preventDefault();if(!info)return;
    setBusy(true);setNote("");try{
      if(!name.trim()||!/^\+?[\d ().-]+$/.test(phone)||!/^\d{7,15}$/.test(phone.replace(/\D/g,"")))throw Error("Enter your name and a valid phone number, including country code.");
      if(!demo&&!signed){
        if(existing){const {error}=await db!.auth.signInWithPassword({email,password});if(error)throw error;}
        else{const {data,error}=await db!.auth.signUp({email,password,options:{data:{full_name:name.trim(),contact_phone:phone.trim()},emailRedirectTo:location.href}});if(error)throw error;if(!data.session){setNote("Confirm your email, then reopen this team link to submit your application.");return;}}
      }
      await applyWithLink(code,name.trim(),phone.trim(),(signed||email).trim().toLowerCase());
      setRequest((await applications()).find(a=>a.team===info.id&&(a.role||"athlete")===info.role));setNote("");
    }catch(err){setNote((err as Error).message||"Could not submit the application.");}finally{setBusy(false);}
  }
  return <PublicShell><section className="entry-content grid">
    <h1>{info?"Apply to "+info.name:"Team application"}</h1>
    {!ready?<p>Checking invitation…</p>:!info?<p>This application link is invalid, expired or has been replaced. Ask a coach for the current link.</p>:<>
    <strong>{info.role==="coach"?"Coach application":"Athlete application"}</strong>
    {request?<><p role="status">{request.status==="Approved"?"Approved. You can now open your team.":request.status==="Declined"?"The coaching staff declined this application.":"Applied · Pending approval. You can open this team once its coaching staff approves your application."}</p>
      {request.status==="Approved"&&<button className="btn primary" onClick={async()=>{const id=demo?sessionStorage.getItem("nhf-persona"):(await db?.auth.getUser())?.data.user?.id;if(id)selectTeam(id,info.id);location.assign(info.role==="coach"?"/":"/athlete");}}>Open team</button>}</>:<form className="grid" onSubmit={submit}>
      <label>Full name<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Phone number<input type="tel" required maxLength={30} autoComplete="tel" placeholder="+47" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label>Email<input type="email" required readOnly={!!signed} autoComplete="email" value={signed||email} onChange={e=>setEmail(e.target.value)}/></label>
      {!demo&&!signed&&<label>Password<input required type="password" minLength={existing?1:8} autoComplete={existing?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
      <small>Team coaches use these contact details to review your application.</small>
      <button className="btn primary" disabled={busy}>{signed||demo?"Submit application":existing?"Sign in and apply":"Create account and apply"}</button>
      {!signed&&!demo&&<button className="btn" type="button" onClick={()=>{setExisting(!existing);setNote("");}}>{existing?"Create a new account":"Use my existing account"}</button>}
    </form>}</>}
    {note&&<p role="status">{note}</p>}<a className="entry-back" href="/login">Back to sign-in</a>
  </section></PublicShell>;
}
