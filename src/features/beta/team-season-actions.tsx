import {useRef,useState} from "react";
import {Archive,Pencil} from "lucide-react";
import {archiveRegistration,renameRegistration} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";

export function shortSeason(label:string){
  return label.replace(/^(?:19|20)(\d{2})\s*\/\s*(?:(?:19|20))?(\d{2})$/,"$1/$2");
}

export function TeamSeasonActions({team,name,season,updated}:{team:Registration;name:string;season:string;updated:(archived:boolean)=>Promise<void>}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [mode,setMode]=useState<"name"|"end">("name"),[value,setValue]=useState(name),[busy,setBusy]=useState(false),[error,setError]=useState("");
  function open(next:typeof mode){setMode(next);setValue(name);setError("");dialog.current?.showModal();}
  async function save(){setBusy(true);setError("");try{
    if(mode==="name")await renameRegistration(team,value.trim());else await archiveRegistration(team);
    await updated(mode==="end");dialog.current?.close();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <><button type="button" className="btn" aria-label="Rediger lagnavn" title="Rediger lagnavn" onClick={()=>open("name")}><Pencil size={16}/></button><button type="button" className="btn" onClick={()=>open("end")}><Archive size={16}/>Avslutt sesong</button>
    <dialog ref={dialog} className="team-season-dialog" aria-labelledby="team-season-title" onCancel={e=>{if(busy)e.preventDefault();}}>
    <form className="grid" onSubmit={e=>{e.preventDefault();void save();}}>
    <small>Sesong {season} · NIF {team.org_id}</small><h2 id="team-season-title">{mode==="name"?"Rediger lagnavn":"Avslutt sesong for "+name+"?"}</h2>
    {mode==="name"?<label>Lagnavn<input required maxLength={100} value={value} onChange={e=>setValue(e.target.value)}/></label>:<p>{name} fjernes fra aktive lag i {season}. Kampene, rapportene og spillerstatistikken beholdes under «Se historikk». Andre lag fortsetter som før.</p>}
    {error&&<p role="alert">{error}</p>}<div className="day-strip"><button type="button" className="btn" disabled={busy} onClick={()=>dialog.current?.close()}>Avbryt</button><button className="btn primary" disabled={busy||(mode==="name"&&!value.trim())}>{mode==="name"?"Lagre lagnavn":"Ja, avslutt sesongen"}</button></div>
    </form></dialog></>;
}
