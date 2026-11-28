import {useState,type FormEvent} from "react";
import {Link2,UserPlus} from "lucide-react";
import {keeperValue,type keeperDirectory} from "@/lib/live-keepers";

export function LiveKeeperPicker({value,directory,disabled,onChange,onCreate,onLink}:{
 value:string;directory:ReturnType<typeof keeperDirectory>;disabled:boolean;
 onChange:(value:string)=>void;onCreate:(name:string)=>Promise<string>;onLink:(profile:string,athlete:string)=>Promise<void>;
}){
 const [mode,setMode]=useState<"create"|"link"|null>(null);
 const [name,setName]=useState("");
 const [guest,setGuest]=useState("");
 const [athlete,setAthlete]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [status,setStatus]=useState("");
 const current=directory.identify(value);
 const known=directory.entries.has(current.id);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||disabled)return;
  setBusy(true);
  setError("");
  setStatus("");
  try{
   if(mode==="create"){
    onChange(await onCreate(name));
    setName("");
    setStatus("Keeperprofilen er opprettet og valgt.");
   }else if(mode==="link"){
    await onLink(guest.slice("guest:".length),athlete.slice("athlete:".length));
    setGuest("");
    setAthlete("");
    setStatus("Keeperprofilen og kampregistreringene er koblet til spilleren.");
   }
   setMode(null);
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Kunne ikke lagre keeperprofilen. Prøv igjen.");
  }finally{setBusy(false);}
 }
 return <div className="live-keeper-picker">
  <label>Aktiv keeper<select value={current.id} disabled={disabled||busy} onChange={event=>{
   const picked=directory.entries.get(event.target.value);
   onChange(picked?keeperValue(picked):event.target.value?value:"");
  }}>
   <option value="">Velg keeper fra stallen</option>
   {directory.players.length>0&&<optgroup label="Stallen">{directory.players.map(player=><option key={player.id} value={player.id}>{player.name}</option>)}</optgroup>}
   {directory.guests.length>0&&<optgroup label="Midlertidige keeperprofiler">{directory.guests.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</optgroup>}
   {value&&!known&&<option value={current.id}>{current.name} (tidligere registrert)</option>}
  </select></label>
  <div className="live-keeper-actions">
   <button className="btn" type="button" disabled={disabled||busy} aria-expanded={mode==="create"} onClick={()=>{setError("");setMode(mode==="create"?null:"create");}}><UserPlus size={16}/> Ny keeperprofil</button>
   {directory.guests.length>0&&directory.players.length>0&&<button className="btn" type="button" disabled={disabled||busy} aria-expanded={mode==="link"} onClick={()=>{
    setGuest(current.id.startsWith("guest:")?current.id:"");
    setError("");
    setMode(mode==="link"?null:"link");
   }}><Link2 size={16}/> Koble til spillerkonto</button>}
  </div>
  {mode&&<form className="live-keeper-form" onSubmit={submit}>
   {mode==="create"?<label>Navn på ny keeper<input required autoFocus maxLength={100} disabled={busy} value={name} onChange={event=>setName(event.target.value)}/></label>:<>
    <label>Midlertidig keeperprofil<select required autoFocus disabled={busy} value={guest} onChange={event=>setGuest(event.target.value)}><option value="">Velg profil</option>{directory.guests.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Spillerkonto<select required disabled={busy} value={athlete} onChange={event=>setAthlete(event.target.value)}><option value="">Velg spiller</option>{directory.players.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <small>Kampregistreringer fra keeperprofilen vises samlet med spillerens keeperstatistikk.</small>
   </>}
   <div className="live-keeper-actions"><button className="btn primary" disabled={busy||disabled||mode==="create"&&!name.trim()}>{busy?"Lagrer …":mode==="create"?"Opprett og velg":"Bekreft kobling"}</button>
    <button className="btn" type="button" disabled={busy} onClick={()=>{setMode(null);setError("");}}>Avbryt</button></div>
   {error&&<small role="alert">{error}</small>}
  </form>}
  {status&&<small role="status">{status}</small>}
 </div>;
}
