import {useState,type Dispatch,type FormEvent,type SetStateAction} from "react";
import {Link2,Plus} from "lucide-react";
import type {Member} from "@/lib/beta";
import {shirtNumber,type FixturePlayer} from "@/lib/live-match";
import {importMatchPlayers,updateMatchPlayer,type MatchPlayerProfile} from "@/lib/match-player-profiles";
import {parseSpondRoster,playerNameKey} from "@/lib/spond-roster";

function errorText(error:unknown){
 return error&&typeof error==="object"&&"message" in error?String(error.message):"Prøv igjen.";
}
export function fixturePlayer(id:string,members:Member[],profiles:MatchPlayerProfile[]):FixturePlayer|undefined{
 const profile=profiles.find(row=>row.id===id);
 const account=members.find(row=>row.id===(profile?.athlete??id));
 if(account)return {id:account.id,name:account.name,number:shirtNumber(account.shirt_number??"")??undefined};
 if(profile)return {id:profile.id,name:profile.name,number:profile.number??undefined};
}

export function FixtureRoster({team,members,profiles,players,disabled,onProfiles,onAdd,onNumber,onRemove}:{
 team:string;members:Member[];profiles:MatchPlayerProfile[];players:FixturePlayer[];disabled:boolean;
 onProfiles:Dispatch<SetStateAction<MatchPlayerProfile[]|undefined>>;onAdd:(players:FixturePlayer[])=>boolean;
 onNumber:(id:string,number:number|undefined)=>boolean;onRemove:(id:string)=>boolean;
}){
 const [raw,setRaw]=useState("");
 const [sort,setSort]=useState("name");
 const [selected,setSelected]=useState("");
 const [linked,setLinked]=useState("");
 const [athlete,setAthlete]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [excluded,setExcluded]=useState<string[]>([]);
 const parsed=parseSpondRoster(raw);
 const names=parsed.filter(name=>!excluded.includes(name));
 const available=[...members,...profiles.filter(profile=>!profile.athlete)]
  .map(row=>fixturePlayer(row.id,members,profiles)!).filter(row=>!players.some(player=>player.id===row.id))
  .sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 const ordered=[...players].sort((a,b)=>(sort==="number"?(a.number??100)-(b.number??100):0)||a.name.localeCompare(b.name,"nb"));
 const unlinked=profiles.filter(profile=>!profile.athlete).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 const explicitAccount=(name:string)=>{
  const same=members.filter(row=>playerNameKey(row.name)===playerNameKey(name));
  return same.length===1?same[0]:undefined;
 };
 async function importRoster(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||disabled||!names.length)return;
  if(names.length>100){setError("Importer maksimalt 100 spillere om gangen.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const existing=new Map(profiles.map(row=>[playerNameKey(row.name),row]));
   const missing=names.filter(name=>!existing.has(playerNameKey(name))&&!explicitAccount(name));
   const updated=await importMatchPlayers(team,missing);
   onProfiles(updated);
   const byName=new Map(updated.map(row=>[playerNameKey(row.name),row]));
   const additions=names.flatMap(name=>{
    const profile=byName.get(playerNameKey(name));
    const id=profile?.athlete?profile.id:explicitAccount(name)?.id??profile?.id;
    const player=id?fixturePlayer(id,members,updated):undefined;
    return player?[player]:[];
   });
   if(additions.length!==names.length)throw Error("Noen profiler kunne ikke hentes. Forsøk importen igjen.");
   if(onAdd(additions)){
    setRaw("");setExcluded([]);
    setNotice(names.length+" spillere funnet eller opprettet og lagt til i kamptroppen.");
   }else setError("Profilene er lagret. Prøv igjen for å legge dem til i kampen.");
  }catch(e){setError("Kunne ikke importere spillerne. "+errorText(e));}
  finally{setBusy(false);}
 }
 async function link(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy||disabled||!linked||!members.some(row=>row.id===athlete))return;
  setBusy(true);setError("");setNotice("");
  try{
   const updated=await updateMatchPlayer(team,linked,{athlete});
   onProfiles(rows=>rows?.map(row=>row.id===updated.id?updated:row));
   setLinked("");setAthlete("");
   setNotice("Profilen er koblet. Spillerkontoens navn og standardnummer brukes videre.");
  }catch(e){setError("Kunne ikke koble profilen. "+errorText(e));}
  finally{setBusy(false);}
 }
 async function rememberNumber(player:FixturePlayer,number:number|undefined){
  if(!onNumber(player.id,number)){setError("Kunne ikke lagre nummeret for kampen.");return;}
  if(!profiles.some(row=>row.id===player.id&&!row.athlete))return;
  setError("");
  try{
   const updated=await updateMatchPlayer(team,player.id,{number:number??null});
   onProfiles(rows=>rows?.map(row=>row.id===updated.id?updated:row));
  }catch(e){setError("Nummeret er lagret for kampen, men kunne ikke lagres på spillerprofilen. "+errorText(e));}
 }

 return <section className="live-panel grid fixture-roster">
  <div><h3>Kamptropp</h3><p>Lim inn deltakerlisten fra Spond eller legg til spillere fra stallen. Troppen brukes til hurtiglogging på draktnummer.</p></div>
  {disabled&&<p role="status">Henter kamptroppen og spillerprofilene …</p>}
  <details className="library-tools"><summary>Lim inn fra Spond</summary>
   <form className="grid" onSubmit={importRoster}>
    <label>Deltakerliste fra Spond<textarea rows={5} value={raw} maxLength={65536} disabled={busy} onChange={e=>{setRaw(e.target.value);setExcluded([]);setError("");}}/></label>
    {raw.trim()&&<p>{names.length?names.length+" spillere klare for import.":"Ingen spillernavn funnet."}</p>}
    {parsed.length>0&&<fieldset className="fixture-import-preview"><legend>Velg hvem som skal legges til</legend>
     {parsed.map(name=><label key={name}><input type="checkbox" checked={!excluded.includes(name)} disabled={busy} onChange={e=>setExcluded(list=>e.target.checked?list.filter(row=>row!==name):[...list,name])}/>{name}</label>)}
    </fieldset>}
    <button type="submit" className="btn primary" disabled={disabled||busy||!names.length}>{busy?"Lagrer …":"Opprett profiler og legg til"}</button>
   </form>
  </details>
  <form className="day-strip" onSubmit={e=>{
   e.preventDefault();
   const player=available.find(row=>row.id===selected);
   if(player&&onAdd([player]))setSelected("");
  }}>
   <label>Spiller fra stallen eller import<select value={selected} disabled={disabled||busy} onChange={e=>setSelected(e.target.value)}>
    <option value="">Velg spiller</option>{available.map(player=><option key={player.id} value={player.id}>{player.name}</option>)}
   </select></label>
   <button type="submit" className="btn" disabled={disabled||busy||!selected}><Plus size={16}/> Legg til i troppen</button>
  </form>
  {ordered.length>0&&<>
   <label>Sorter troppen<select value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Navn</option><option value="number">Draktnummer</option></select></label>
   <ul className="fixture-roster-list">{ordered.map(player=><RosterRow key={player.id+":"+player.number} player={player} disabled={disabled||busy} onSave={number=>{
    if(number!==undefined&&players.some(row=>row.id!==player.id&&row.number===number))return "Draktnummeret er allerede i bruk i denne kampen.";
    void rememberNumber(player,number);
   }} onRemove={()=>onRemove(player.id)}/>)}</ul>
  </>}
  {!!unlinked.length&&!!members.length&&<details className="library-tools"><summary>Koble importert profil til spillerkonto</summary>
   <form className="grid" onSubmit={link}>
    <label>Importert profil<select value={linked} required disabled={busy} onChange={e=>setLinked(e.target.value)}><option value="">Velg profil</option>{unlinked.map(profile=><option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
    <label>Registrert spillerkonto<select value={athlete} required disabled={busy} onChange={e=>setAthlete(e.target.value)}><option value="">Velg spiller</option>{members.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <small>Spillerkontoen blir hovedprofil. Tidligere hendelser beholdes.</small>
    <button type="submit" className="btn primary" disabled={disabled||busy||!linked||!athlete}><Link2 size={16}/> Bekreft kobling</button>
   </form>
  </details>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}

function RosterRow({player,disabled,onSave,onRemove}:{player:FixturePlayer;disabled:boolean;onSave:(number:number|undefined)=>string|void;onRemove:()=>void}){
 const [value,setValue]=useState(String(player.number??""));
 const [error,setError]=useState("");
 return <li><form className="day-strip" onSubmit={e=>{
  e.preventDefault();
  const number=value.trim()?shirtNumber(value):undefined;
  if(number===null){setError("Bruk et draktnummer fra 0 til 99.");return;}
  setError(onSave(number)||"");
 }}>
  <strong>{player.name}</strong>
  <label>Draktnummer<input inputMode="numeric" maxLength={2} value={value} disabled={disabled} onChange={e=>{setValue(e.target.value);setError("");}}/></label>
  <button type="submit" className="btn" disabled={disabled||value===String(player.number??"")}>Lagre nummer</button>
  <button type="button" className="btn" disabled={disabled} onClick={onRemove}>Fjern fra tropp</button>
  {error&&<small role="alert">{error}</small>}
 </form></li>;
}
