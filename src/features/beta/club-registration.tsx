import {useEffect,useState,type FormEvent} from "react";
import type {User} from "@supabase/supabase-js";
import {db} from "@/lib/beta";
import {clubLink} from "@/lib/club-url";

export function ClubRegistration(){
  const [user,setUser]=useState<User|null>();
  const [club,setClub]=useState("");
  const [coach,setCoach]=useState("");
  const [email,setEmail]=useState("");
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  useEffect(()=>{
    const subscription=db?.auth.onAuthStateChange((_,session)=>setUser(session?.user??null));
    return ()=>subscription?.data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    let active=true;
    if(!user||!db)return;
    setClub(value=>value||String(user.user_metadata?.requested_club||""));
    setCoach(value=>value||String(user.user_metadata?.full_name||""));
    void db.rpc("beta_club_request_status").then(({data,error})=>{
      if(active){if(error)setError(error.message);else setStatus(data??"");}
    });
    return ()=>{active=false;};
  },[user]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!db||busy)return;
    setBusy(true);setError("");
    try{
      if(user){
        const {data}=await db.rpc("beta_request_club",{label:club.trim(),coach:coach.trim()}).throwOnError();
        setStatus(data);
      }else{
        const {error}=await db.auth.signInWithOtp({email:email.trim(),options:{
          shouldCreateUser:true,emailRedirectTo:clubLink("/login?role=coach&create_club=1"),
          data:{full_name:coach.trim(),requested_club:club.trim()},
        }});
        if(error)throw error;
        setSent(true);
      }
    }catch(error){setError(error instanceof Error?error.message:String((error as {message?:string})?.message||"Kunne ikke fortsette."));}
    finally{setBusy(false);}
  }
  return <>
    <a className="entry-back" href="/login?role=coach">Til trenerinnlogging</a>
    <h1>Opprett ny klubb</h1>
    <p>Send en søknad om et privat klubboppsett. Når plattformeieren godkjenner den, blir du administrator for klubben.</p>
    {user===undefined?<p role="status">Sjekker innlogging …</p>:status==="approved"?<p role="status">Klubben er godkjent. <a href="/">Åpne trenerrommet</a></p>:
      status==="pending"?<p role="status">Søknaden er sendt og venter på godkjenning. Åpne denne siden igjen for å se status.</p>:
      status==="declined"?<p role="status">Søknaden ble avslått.</p>:
      sent&&!user?<p role="status">Sjekk e-posten din. Åpne lenken i denne nettleseren for å bekrefte kontoen og sende søknaden.</p>:
      <form className="grid" onSubmit={submit}>
        <label>Klubbnavn<input required maxLength={80} value={club} onChange={event=>setClub(event.target.value)}/></label>
        <label>Ditt navn<input required autoComplete="name" maxLength={100} value={coach} onChange={event=>setCoach(event.target.value)}/></label>
        {user?<p>Innlogget som {user.email}</p>:<label>E-post<input required type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label>}
        <button className="btn primary" disabled={busy||!club.trim()||!coach.trim()}>{user?"Send klubbsøknad":"Send bekreftelseslenke"}</button>
      </form>}
    {user&&<button type="button" className="btn" onClick={()=>void db?.auth.signOut().then(()=>{setStatus("");setClub("");setCoach("");setSent(false);setError("");})}>Bytt konto</button>}
    {error&&<p role="alert">{error}</p>}
  </>;
}
