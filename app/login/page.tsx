"use client";

import {FeatureInfo} from "@/features/beta/feature-info";
import { useEffect, useState, type FormEvent } from "react";
import { db, demo, demoAccounts, joinDemo, registerDemoAthlete,selectTeam } from "@/lib/beta";
import { Activity, ArrowLeft, ArrowRight, BookOpen, ClipboardList } from "lucide-react";
import { PublicShell } from "@/features/beta/public-shell";
import {AthleteName,joinName,legacyNames} from "@/features/beta/athlete-name";
import {SignupSuccess} from "@/features/beta/signup-success";
import {clubLink} from "@/lib/club-url";
import {registerPlayer,passwordLogin,contactAddress} from "@/lib/player-access";
import {emailSignIn,validPhone,validTeamCode} from "@/lib/invite-auth";

export default function Login(){
  const [next,setNext]=useState("");
  const destination=next==="ratings"?"/#ratings":next==="development"?"/utvikling":next==="bank"?"/okter?vis=bank":next==="court"?"/okter":"";
  const onward=next?"&next="+next:"";
  const [invite,setInvite]=useState("");
  const [email,setEmail]=useState("");
  const [full,setName]=useState(""),[given,setGiven]=useState(""),[family,setFamily]=useState("");
  const [phone,setPhone]=useState(""),[shirt,setShirt]=useState("");
  const [teamCode,setTeamCode]=useState(""),[magic,setMagic]=useState(false);
  const [password,setPassword]=useState("");
  const [signup,setSignup]=useState(false);
  const [join,setJoin]=useState(false),[link,setLink]=useState("");
  const [role,setRole]=useState<"coach"|"athlete">("coach");
  const parts=role==="athlete"&&(join||!!invite),name=parts?joinName(given,family):full;
  const [selected,setSelected]=useState(false);
  const [busy,setBusy]=useState(false);
  const [mail,setMail]=useState<"created"|"sent"|"">("");
  const [message,setMessage]=useState("");
  const [account,setAccount]=useState("coach");
  const [signed,setSigned]=useState("");
  const [accounts,setAccounts]=useState<{id:string;name:string;role:string}[]>([]);
  useEffect(()=>{
    setInvite(new URLSearchParams(location.search).get("invite")||"");
    setSignup(new URLSearchParams(location.search).get("new")==="1");
    const qp=new URLSearchParams(location.search);setNext(["development","court","bank","ratings"].includes(qp.get("next")||"")?qp.get("next")!:"");const param=qp.get("role")||(qp.has("invite")?"athlete":null);const code=qp.get("team_code")?.trim().toUpperCase();if(code&&validTeamCode(code)){setTeamCode(code);setRole("athlete");setSelected(true);setJoin(true);}
    if(param==="athlete"&&qp.get("register")==="1")setJoin(true);
    if(param==="coach"||param==="athlete"){setSelected(true);setRole(param);setAccount(param==="athlete"?"liv":"coach");}
    if(demo)setAccounts(demoAccounts());
    if(!db)return;
    const sub=db.auth.onAuthStateChange((_,s)=>{setSigned(s?contactAddress(s.user):"");if(s){setName(n=>n||s.user.user_metadata?.full_name||"");const m=s.user.user_metadata,p=legacyNames(m?.full_name||"");setGiven(n=>n||m?.given_name||p.given);setFamily(n=>n||m?.family_name||p.family);setPhone(n=>n||m?.contact_phone||"");}});
    return ()=>sub.data.subscription.unsubscribe();
  },[]);
  async function enter(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage("");
    try{
      const registering=signup||(join&&role==="athlete");
      if(parts&&(!given.trim()||!family.trim()||name.length>100))throw Error("Oppgi fornavn og etternavn, maksimalt 100 tegn til sammen.");
      const joinPath="/join"+(teamCode?"?team_code="+encodeURIComponent(teamCode):"");
      if((registering&&!signed||!demo&&signed&&invite)&&!validPhone(phone))throw Error("Enter a valid phone number.");
      if(teamCode&&!validTeamCode(teamCode))throw Error("Enter the six-character team code.");
      if(!demo&&!signed&&magic){
        const path=invite?"/login?new=1&invite="+encodeURIComponent(invite):registering?joinPath:"/login?role="+role+onward;
        await emailSignIn(email,path,registering,name,phone,invite?{kind:"email",token:invite,shirt,given,family}:teamCode?{kind:"athlete_code",token:teamCode,shirt,given,family}:undefined);setMail("sent");return;
      }
      if(demo){
        if(invite)joinDemo(invite,(email||phone).trim().toLowerCase(),name.trim());
        else if(join&&role==="athlete"){registerDemoAthlete((email||phone).trim().toLowerCase(),name.trim());location.assign(joinPath);return;}
        else sessionStorage.setItem("nhf-persona",account);
      }else{
        if(!db)throw Error("Both Supabase public settings are required.");
        if(!signed){
          if(signup||(join&&role==="athlete")){
            const immediate=(role==="athlete"||!!invite)&&await registerPlayer({email,password,name,phone,given,family,shirt,kind:invite?"email":teamCode?"athlete_code":"none",token:invite||teamCode});
            if(!immediate){if(!email.trim())throw Error("Oppgi e-post for trenerkontoen.");const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:clubLink(invite?"/login?new=1&invite="+encodeURIComponent(invite):joinPath),data:{full_name:name.trim(),given_name:given.trim(),family_name:family.trim(),contact_phone:phone.trim(),shirt_number:shirt||null,...(invite?{club_invite_kind:"email",club_invite_token:invite}:teamCode?{club_invite_kind:"athlete_code",club_invite_token:teamCode}:{})}}});
            if(error)throw error;
            if(!data.session){setMail(data.user?.identities?.length?"created":"sent");return;}}
          }else{
            await passwordLogin(email,password,role==="athlete"||!!invite);
          }
        }
        if(!invite){
          const user=(await db.auth.getUser()).data.user;
          const member=await db.from("beta_members").select("role").eq("id",user?.id).maybeSingle().throwOnError();
          if(member.data&&member.data.role!==role)throw Error("Choose "+member.data.role+" sign-in for this account.");
          if(!member.data){if(role==="athlete"){location.assign(joinPath);return;}throw Error("Accept a coach invitation to open the coach dashboard.");}
        }
        if(invite){
          if(signed){const {error}=await db.auth.updateUser({data:{full_name:name.trim(),given_name:given.trim(),family_name:family.trim(),contact_phone:phone.trim()}});if(error)throw error;}
          const previous=(await db.rpc("beta_signup_result",{cred:invite}).throwOnError()).data;
          const team=previous?.id||(await db.rpc("beta_join",{code:invite,display_name:name.trim()}).throwOnError()).data;
          const {data}=await db.auth.getUser();if(data.user)selectTeam(data.user.id,String(team));
        }
      }
      if(demo&&!invite&&role==="athlete"&&!demoAccounts().find(m=>m.id===account)?.squad){location.assign("/join");return;}
      location.assign(invite?"/":destination||(role==="athlete"?"/athlete":"/"));
    }catch(error){setMessage((error as Error).message||"Could not sign in.");}finally{setBusy(false);}
  }
  if(mail&&!signed)return <PublicShell><div className="entry-content"><SignupSuccess name={name} email={email} known={mail==="created"}/><button className="btn" onClick={()=>{setMail("");setJoin(false);setSignup(false);}}>Til innlogging</button></div></PublicShell>;
  const choice=!selected&&!invite;
  return <PublicShell><div className="entry-content">
    {!choice&&!invite&&<a className="entry-back" href={next?"/login?next="+next:"/login"}><ArrowLeft size={16}/>Choose another role</a>}
    <FeatureInfo topic="entry"><h1>{choice?"Team sign-in":invite?"Join your team":join?"Create an account":role==="coach"?"Coach login":"Athlete login"}</h1></FeatureInfo>
    {choice?<><p className="entry-lead">Choose your role to continue.</p><nav className="entry-roles" aria-label="Account role">
      <a className="entry-role athlete" href={"/login?role=athlete"+onward} aria-label="Athlete login"><span className="role-icon"><Activity/></span><span><strong>Athlete login</strong><small>My sessions, progress and feedback</small></span><ArrowRight size={19}/></a>
      <a className="entry-role coach" href={"/login?role=coach"+onward} aria-label="Coach login"><span className="role-icon"><ClipboardList/></span><span><strong>Coach login</strong><small>Team planning, workload and match day</small></span><ArrowRight size={19}/></a>
    </nav></>:<>
    {join&&!invite&&role==="coach"?<form className="grid" onSubmit={e=>{e.preventDefault();try{if(validTeamCode(link.trim().toUpperCase())){location.assign("/apply?coach_code="+encodeURIComponent(link.trim().toUpperCase()));return;}const url=new URL(link.trim(),location.origin);const short=url.searchParams.get("coach_code");if(short&&validTeamCode(short)){location.assign("/apply?coach_code="+encodeURIComponent(short));return;}const shared=url.searchParams.get("link");const code=shared||url.searchParams.get("invite")||link.trim();if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(code))throw Error();location.assign((shared?"/apply?link=":"/login?new=1&invite=")+encodeURIComponent(code));}catch{setMessage("Enter the invitation link from your team administrator.");}}}><label>Team invitation link or code<input required value={link} onChange={e=>setLink(e.target.value)}/></label><p className="muted">Coach accounts require an invitation from a team admin.</p><button className="btn primary">Continue with invitation</button></form>:<>
    <form className="grid" onSubmit={enter}>
    {demo&&!invite&&!join?<label>Demo account<select value={account} onChange={e=>setAccount(e.target.value)}>{accounts.filter(m=>m.role===role).map(m=><option value={m.id} key={m.id}>{m.name} · {m.role}</option>)}</select></label>:<>
      {parts?<AthleteName given={given} family={family} setGiven={setGiven} setFamily={setFamily}/>:(invite||join)&&<label>Your name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
      {(!signed&&(signup||join)||signed&&invite)&&<label>Phone number<input required type="tel" minLength={7} maxLength={30} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>}
      {(invite||join&&role==="athlete")&&<label>Draktnummer (utøver, valgfritt)<input type="text" inputMode="numeric" pattern="[1-9][0-9]{0,2}" maxLength={3} value={shirt} onChange={e=>setShirt(e.target.value.trim())}/></label>}
      {join&&role==="athlete"&&!invite&&<label>Team code (optional)<input maxLength={6} minLength={6} autoCapitalize="characters" value={teamCode} onChange={e=>setTeamCode(e.target.value.toUpperCase().trim())}/></label>}
      {signed?<p>Signed in as {signed}</p>:<><label>{role==="athlete"?(signup||join?"E-post (valgfritt)":"Telefonnummer eller e-post"):"Email"}<input required={!(role==="athlete"&&(signup||join))} type={role==="athlete"&&!signup&&!join?"text":"email"} autoComplete={signup||join?"email":"username"} value={email} onChange={e=>setEmail(e.target.value)}/></label>{role==="athlete"&&(signup||join)&&<small>Hopper du over e-post, logger du inn med telefonnummer og passord.</small>}{!demo&&!magic&&<label>Password<input required type="password" minLength={signup||join?8:1} autoComplete={signup||join?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}</>}
    </>}
    <button className="btn primary" disabled={busy}>{magic&&!signed?"Email me a sign-in link":invite?(signup&&!signed?"Create account and join":"Accept invitation"):join?"Continue to team selection":"Sign in"}</button></form>
    {role!=="athlete"&&!invite&&!demo&&!signed&&<button className="btn" onClick={()=>{setMagic(!magic);setMessage("");}}>{magic?"Use a password":"Sign in with a magic link"}</button>}
    {!demo&&invite&&!signed&&<button className="btn" onClick={()=>setSignup(!signup)}>{signup?"Use existing account":"Create invited account"}</button>}</>}
    {signed&&<button className="btn" onClick={()=>db?.auth.signOut()}>Switch account</button>}{message&&<p role="status">{message}</p>}
    {!invite&&<div className="entry-alternate">{join?"Already have an account?":"New to the platform?"} <button type="button" onClick={()=>{setJoin(!join);setMessage("");}}>{join?"Sign in":"Create account"}</button></div>}
    </>}
    {demo&&<small className="entry-demo">Browser-local demo</small>}
    <footer className="entry-footer"><a href="/documentation"><BookOpen size={17}/>Platform documentation<ArrowRight size={15}/></a></footer>
    </div></PublicShell>;
}
