import {useEffect,useRef,useState,type FormEvent} from "react";
import {Check,ChevronRight,Users} from "lucide-react";
import {createTeam,db,demo,selectTeam,type Snapshot} from "@/lib/beta";
import {handballId} from "@/lib/handball-id";
import {refreshSeason,register,saveSeason} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";
import "./first-team-setup.css";

type Setup={club:string;team?:string;registration?:string|null};
const steps=["Lag og sesong","Terminliste","Gjennomgå og lagre"];
const defaultSeason={id:201068,label:"2026/27"};
const errorMessage=(error:unknown)=>error&&typeof error==="object"&&"message" in error?String(error.message):"Prøv igjen.";

export function FirstTeamSetup({data}:{data:Snapshot}){
 const [setup,setSetup]=useState<Setup|null>();
 const [open,setOpen]=useState(false);
 const [step,setStep]=useState(0);
 const [name,setName]=useState("");
 const [custom,setCustom]=useState(false);
 const [startYear,setStartYear]=useState("");
 const [seasonId,setSeasonId]=useState("");
 const [link,setLink]=useState("");
 const [nhfId,setNhfId]=useState<number|null>(null);
 const [saved,setSaved]=useState<Setup>();
 const [registration,setRegistration]=useState<Registration>();
 const [busy,setBusy]=useState(false);
 const [syncing,setSyncing]=useState(false);
 const [syncMessage,setSyncMessage]=useState("");
 const [syncError,setSyncError]=useState("");
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);
 const title=useRef<HTMLHeadingElement>(null);
 const locked=useRef(false);
 const demoKey="nhf-first-team:"+data.me.id;
 const season=custom?{id:Number(seasonId),label:startYear+"/"+String(Number(startYear)+1).slice(-2)}:defaultSeason;
 useEffect(()=>{
  let active=true;
  const requested=new URLSearchParams(location.search).get("setup")==="first-team";
  async function check(){
   const result:Setup|null=demo?(requested?JSON.parse(localStorage.getItem(demoKey)||"null")??{club:"Eksempelklubb"}:null):
    (await db!.rpc("beta_first_team_setup").throwOnError()).data;
   if(active){
    setSetup(result);
    if(result&&!result.team&&requested)setOpen(true);
   }
  }
  void check().catch(()=>{if(active)setError("Kunne ikke sjekke oppsettet for første lag.");});
  return()=>{active=false;};
 },[data.me.id,demoKey,retry]);
 useEffect(()=>{if(open)title.current?.focus();},[open,step,saved]);
 async function sync(target:Registration){
  setSyncing(true);setSyncError("");setSyncMessage("");
  try{setSyncMessage(await refreshSeason(target));}
  catch(cause){setSyncError(errorMessage(cause));}
  finally{setSyncing(false);}
 }
 function forward(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(step===0){
   if(!name.trim()||name.trim().length>80){setError("Oppgi et lagnavn på opptil 80 tegn.");return;}
   if(custom&&(!/^20\d{2}$/.test(startYear)||!Number.isInteger(season.id)||season.id<1||season.id>2147483647)){
    setError("Oppgi startår og et gyldig NIF-sesong-ID.");return;
   }
  }else if(step===1){
   try{setNhfId(handballId(link,"lag"));}
   catch(cause){setError(errorMessage(cause));return;}
  }else{void save();return;}
  setStep(step+1);
 }
 async function save(){
  if(!setup||locked.current)return;
  locked.current=true;setBusy(true);
  try{
   let result:Setup;
   if(demo){
    const team=await createTeam(data.me,name.trim());
    await saveSeason(team,season.id,season.label);
    const linked=nhfId?await register(team,nhfId,season.id,[],name.trim()):null;
    result={club:setup.club,team,registration:linked?.id};
    localStorage.setItem(demoKey,JSON.stringify(result));
   }else{
    result=(await db!.rpc("beta_first_team_setup",{label:name.trim(),sid:season.id,season_label:season.label,nhf_id:nhfId}).throwOnError()).data;
   }
   if(!result.team)throw Error("Laget ble ikke bekreftet opprettet.");
   setSaved(result);
   if(result.registration&&nhfId){
    const target:Registration={id:result.registration,team:result.team,org_id:nhfId,season:season.id,tournament:null,active:true};
    setRegistration(target);
    void sync(target);
   }
  }catch(cause){setError("Kunne ikke opprette laget. "+errorMessage(cause));}
  finally{locked.current=false;setBusy(false);}
 }
 if(!setup||setup.team){
  return error&&setup===undefined?<p role="alert">{error} <button type="button" className="btn" onClick={()=>{setError("");setRetry(n=>n+1);}}>Prøv igjen</button></p>:null;
 }
 function chooseTeam(){if(saved?.team)selectTeam(data.me.id,saved.team);}
 return <section className="first-team-setup" aria-labelledby="first-team-title">
  {!open?<div className="first-team-welcome">
   <div><h2 id="first-team-title">Klubben {setup.club} er godkjent</h2><p>Opprett det første laget for å komme i gang med kamper, trening og invitasjoner.</p></div>
   <button className="btn primary" type="button" onClick={()=>setOpen(true)}><Users size={17}/> {step?"Fortsett lagoppsettet":"Sett opp første lag"}</button>
  </div>:saved?<div className="grid">
   <h2 id="first-team-title" ref={title} tabIndex={-1}><Check size={18}/> {name.trim()} er opprettet</h2>
   <p>Sesong {season.label} er aktiv for laget.</p>
   {syncing&&<p role="status">Henter terminlisten fra NHF …</p>}
   {syncMessage&&<p role="status">{syncMessage}</p>}
   {syncError&&<div role="alert"><p>Laget er lagret. Terminlisten ble ikke hentet. {syncError}</p>
    {registration&&<button type="button" className="btn" onClick={()=>void sync(registration)}>Prøv å hente terminlisten igjen</button>}</div>}
   {!registration&&<p>Terminlisten kan kobles til senere under Kamper.</p>}
   <div className="first-team-actions">
    <a className="btn primary" href="/" onClick={chooseTeam}>Åpne lagets oversikt</a>
    <a className="btn" href="/team?vis=inviter" onClick={chooseTeam}>Inviter trenere og spillere</a>
    <a className="btn" href="/team?vis=lagprofil" onClick={chooseTeam}>Legg til enda et lag</a>
   </div>
  </div>:<>
   <ol className="first-team-steps" aria-label="Steg i lagoppsettet">{steps.map((label,index)=><li key={label} aria-current={step===index?"step":undefined}>{index+1}. {label}</li>)}</ol>
   <h2 id="first-team-title" ref={title} tabIndex={-1}>{["Hvilket lag vil du legge til?","Koble til terminlisten","Se over laget"][step]}</h2>
   <form className="grid" onSubmit={forward}>
    {step===0&&<>
     <label>Lagnavn<input required maxLength={80} placeholder="F.eks. Jenter 12" value={name} onChange={event=>setName(event.target.value)}/></label>
     <label>Sesong<select value={custom?"custom":"default"} onChange={event=>setCustom(event.target.value==="custom")}>
      <option value="default">{defaultSeason.label}</option><option value="custom">Annen sesong …</option>
     </select></label>
     {custom&&<div className="first-team-fields"><label>Startår<input required inputMode="numeric" pattern="20[0-9]{2}" maxLength={4} value={startYear} onChange={event=>setStartYear(event.target.value)}/></label>
      <label>NIF-sesong-ID<input required inputMode="numeric" pattern="[0-9]+" maxLength={10} value={seasonId} onChange={event=>setSeasonId(event.target.value)}/></label></div>}
    </>}
    {step===1&&<>
     <p>Lim inn lagets lenke fra <a href="https://www.handball.no/system/kamper/" target="_blank" rel="noreferrer">Kampsøk hos NHF</a>, eller skriv inn lag-ID. Kampene hentes når laget er opprettet.</p>
     <label>Laglenke eller NHF-lag-ID<input required maxLength={300} value={link} onChange={event=>setLink(event.target.value)}/></label>
    </>}
    {step===2&&<dl className="first-team-review">
     <div><dt>Klubb</dt><dd>{setup.club}</dd></div><div><dt>Lag</dt><dd>{name.trim()}</dd></div>
     <div><dt>Sesong</dt><dd>{season.label}</dd></div><div><dt>Terminliste</dt><dd>{nhfId?<a href={"https://www.handball.no/system/kamper/lag/?lagid="+nhfId} target="_blank" rel="noreferrer">Kontroller NHF-lag {nhfId}</a>:"Kobles til senere"}</dd></div>
    </dl>}
    {error&&<p role="alert" className="first-team-error">{error}</p>}
    <div className="first-team-actions">
     {step>0&&<button className="btn" type="button" disabled={busy} onClick={()=>{setError("");setStep(step-1);}}>Tilbake</button>}
     <button className="btn primary" type="submit" disabled={busy}>{busy?"Oppretter …":step===2?"Opprett laget":step===1?(link.trim()?"Bruk dette laget":"Kontroller laglenke"):"Neste"} <ChevronRight size={16}/></button>
     {step===1&&<button className="btn" type="button" onClick={()=>{setNhfId(null);setError("");setStep(2);}}>Koble til senere</button>}
     <button className="btn" type="button" disabled={busy} onClick={()=>{setError("");setOpen(false);}}>Gjør det senere</button>
    </div>
   </form>
  </>}
 </section>;
}
