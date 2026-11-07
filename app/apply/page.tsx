"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {PublicShell} from "@/features/beta/public-shell";
import {SignupSuccess} from "@/features/beta/signup-success";
import {applications,applyWithLink,db,demo,linkInfo,selectTeam,type LinkInfo,type Application} from "@/lib/beta";
import {clubLink} from "@/lib/club-url";
import {emailSignIn,validPhone} from "@/lib/invite-auth";

export default function Apply(){
  const [code,setCode]=useState(""),[info,setInfo]=useState<LinkInfo|null>(null),[ready,setReady]=useState(false);
  const [existing,setExisting]=useState(false),[signed,setSigned]=useState(""),[name,setName]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState(""),[password,setPassword]=useState("");
  const [request,setRequest]=useState<Application>(),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[mail,setMail]=useState<"created"|"sent"|"">("");
  const [magic,setMagic]=useState(false),[returning,setReturning]=useState(false),auto=useRef("");
  useEffect(()=>{
    const query=new URLSearchParams(location.search),token=query.get("link")||"";setCode(token);setReturning(query.get("finish")==="1");
    linkInfo(token).then(setInfo).catch(e=>setNote(e.message)).finally(()=>setReady(true));
    const listener=db?.auth.onAuthStateChange((_,session)=>{setSigned(session?.user.email||"");if(session){setName(n=>n||session.user.user_metadata?.full_name||"");setPhone(n=>n||session.user.user_metadata?.contact_phone||"");}});
    return ()=>listener?.data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!info||(!signed&&!demo))return;
    let active=true;const read=()=>applications().then(rows=>{if(active)setRequest(rows.find(r=>r.team===info.id&&(r.role||"athlete")===info.role));}).catch(e=>{if(active)setNote(e.message);});
    void read();window.addEventListener("focus",read);return ()=>{active=false;window.removeEventListener("focus",read);};
  },[info,signed]);
  async function join(address:string){
    if(!info)return;
    await applyWithLink(code,name.trim(),phone.trim(),address.trim().toLowerCase());
    const rows=await applications();setRequest(rows.find(r=>r.team===info.id&&(r.role||"athlete")===info.role));setMail("");setNote("");
  }
  useEffect(()=>{
    if(!returning||!signed||!info||!name.trim()||!validPhone(phone)||auto.current===signed+code)return;
    auto.current=signed+code;setBusy(true);void join(signed).catch(e=>setNote(e.message)).finally(()=>setBusy(false));
  },[returning,signed,info,name,phone,code]);
  async function submit(e:FormEvent){
    e.preventDefault();if(!info)return;
    setBusy(true);setNote("");try{
      if(!name.trim()||!validPhone(phone))throw Error("Oppgi navn og gyldig telefonnummer.");
      if(!demo&&!signed){
        const path="/apply?link="+encodeURIComponent(code)+"&finish=1";
        if(magic){await emailSignIn(email,path,!existing,name,phone);setMail("sent");return;}
        if(existing){const {error}=await db!.auth.signInWithPassword({email,password});if(error)throw error;}
        else{const {data,error}=await db!.auth.signUp({email:email.trim(),password,options:{data:{full_name:name.trim(),contact_phone:phone.trim()},emailRedirectTo:clubLink(path)}});if(error)throw error;if(!data.session){setMail(data.user?.identities?.length?"created":"sent");return;}}
      }
      await join(signed||email);
    }catch(err){setNote((err as Error).message||"Registrering mislyktes.");}finally{setBusy(false);}
  }
  async function openTeam(){if(!info)return;const id=demo?sessionStorage.getItem("nhf-persona"):(await db?.auth.getUser())?.data.user?.id;if(id)selectTeam(id,info.id);location.assign(info.role==="coach"?"/":"/athlete");}
  const success=info&&(mail||request?.status==="Approved");
  return <PublicShell><section className="entry-content grid">
    {success?<><SignupSuccess name={name} email={email||signed} team={info.name} role={info.role} known={mail==="created"} joined={request?.status==="Approved"} onOpen={request?.status==="Approved"?openTeam:undefined}/>{mail&&!request&&<button className="btn" type="button" disabled={busy} onClick={()=>{setMail("");setExisting(true);setMagic(false);setReturning(true);setNote(signed?"":"Logg inn med passordet ditt for å bli med på laget.");}}>Jeg har bekreftet e-posten</button>}</>:<>
    <h1>{info?"Bli med i "+info.name:"Laginvitasjon"}</h1>
    {!ready?<p>Kontrollerer invitasjonen …</p>:!info?<p>Lenken har utløpt eller er erstattet. Be om en ny invitasjon.</p>:<>
    <strong>{info.role==="coach"?"Invitasjon som trener":"Invitasjon som utøver"}</strong>
    {request&&!info.direct?<p role="status">{request.status==="Declined"?"Søknaden ble avslått.":"Søknaden er registrert med en eldre søknadslenke. Be om en ny direkte invitasjon for å komme inn uten godkjenning."}</p>:<form className="grid" onSubmit={submit}>
      <label>Fullt navn<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Telefonnummer<input type="tel" required maxLength={30} autoComplete="tel" placeholder="+47" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label>E-post<input type="email" required readOnly={!!signed} autoComplete="email" value={signed||email} onChange={e=>setEmail(e.target.value)}/></label>
      {!demo&&!signed&&!magic&&<label>Passord<input required type="password" minLength={existing?1:8} autoComplete={existing?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
      <small>{info.direct?"Bekreft e-postadressen din én gang. Invitasjonen gir deg deretter tilgang til laget.":"Dette er en eldre søknadslenke. Be treneren om en direkte invitasjon for å slippe godkjenning."}</small>
      <button className="btn primary" disabled={busy}>{busy?"Et øyeblikk …":signed||demo?"Bli med på laget":magic?"Send innloggingslenke":existing?"Logg inn og fortsett":"Opprett konto"}</button>
      {!signed&&!demo&&<button className="btn" type="button" onClick={()=>setMagic(!magic)}>{magic?"Bruk passord":"Bruk innloggingslenke"}</button>}
      {!signed&&!demo&&<button className="btn" type="button" onClick={()=>{setExisting(!existing);setNote("");}}>{existing?"Opprett ny konto":"Jeg har allerede en konto"}</button>}
    </form>}</>}</>}
    {note&&<p role="alert">{note}</p>}<a className="entry-back" href="/login">Til innlogging</a>
  </section></PublicShell>;
}
