"use client";
import {useCallback,useEffect,useState} from "react";
import {admissions,applications,db,demo,demoAccounts,type Team,type Application} from "@/lib/beta";
import {ClubCrest} from "@/features/beta/club-crest";

export default function JoinTeam(){
  const [teams,setTeams]=useState<Team[]>([]),[requests,setRequests]=useState<Application[]>([]);
  const [name,setName]=useState(""),[code,setCode]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{setCode((new URLSearchParams(location.search).get("team_code")||"").trim().toUpperCase().slice(0,6));},[]);
  const refresh=useCallback(async()=>{
    if(demo){
      const me=demoAccounts().find(m=>m.id===sessionStorage.getItem("nhf-persona"));
      if(!me){location.replace("/login");return;}if(me.squad){location.replace("/");return;}
      setName(n=>n||me.name);
    }else{
      const user=(await db?.auth.getUser())?.data.user;
      if(!user){location.replace("/login");return;}
      const member=await db!.from("beta_members").select("id").eq("id",user.id).maybeSingle().throwOnError();
      if(member.data){location.replace("/");return;}
      setName(n=>n||user.user_metadata?.full_name||"");
    }
    setTeams(await admissions("list"));setRequests(await applications());
  },[]);
  useEffect(()=>{const update=()=>{refresh().catch(e=>setNotice(e.message));};update();window.addEventListener("focus",update);window.addEventListener("storage",update);const timer=setInterval(update,20000);return ()=>{clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",update);};},[refresh]);
  async function act(team?:string){
    setBusy(true);setNotice("");try{
      const result=await admissions(team?"apply":"code",{label:name.trim(),...(team?{target:team}:{value:code})});
      if(result!==true)throw Error(String(result));if(!team){location.assign("/athlete");return;}await refresh();setNotice("Application sent to the coaching staff.");
    }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
  }
  return <main className="login grid"><div className="brand"><ClubCrest/><span>Lundehaugen IL</span></div><h1>Join a team</h1>
    <label>Your name<input maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
    <form className="grid" onSubmit={e=>{e.preventDefault();void act();}}><label>Six-character team code<input required minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label><button disabled={!name.trim()||busy} className="btn primary">Join with code</button></form>
    <h2>Teams accepting applications</h2>{teams.map(t=><div className="result" key={t.id}><strong>{t.name}</strong><button className="btn" disabled={!name.trim()||busy||requests.some(r=>r.team===t.id)} onClick={()=>act(t.id)}>{requests.find(r=>r.team===t.id)?.status||"Apply to team"}</button></div>)}{!teams.length&&<p>No teams are listed. Ask your coach for a code or invitation.</p>}
    {notice&&<p role="status">{notice}</p>}<button className="btn" onClick={async()=>{await db?.auth.signOut();sessionStorage.removeItem("nhf-persona");location.assign("/login");}}>Return to sign-in</button></main>;
}
