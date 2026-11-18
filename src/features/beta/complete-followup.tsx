import {useEffect,useRef,useState} from "react";
import {Check,Save,X} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import type {Suggestion} from "@/lib/coach-suggestions";
import {completeFollowup,type FollowupLog} from "@/lib/followup-log";

export function CompleteFollowup({data,suggestion,close,saved}:{data:Snapshot;suggestion:Suggestion;close:()=>void;saved:(row:FollowupLog,conflict:boolean)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),alive=useRef(true),[note,N]=useState(""),[busy,B]=useState(false),[error,E]=useState("");
 useEffect(()=>{alive.current=true;dialog.current?.showModal();return()=>{alive.current=false;dialog.current?.close();};},[]);
 return <dialog ref={dialog} className="followup-dialog" aria-labelledby="followup-title" onCancel={e=>{e.preventDefault();if(!lock.current)close();}}><form onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;B(true);E("");try{const row=await completeFollowup(data,suggestion,note);if(alive.current){const conflict=row.actor!==data.me.id||row.followup.note!==note.trim();saved(row,conflict);window.dispatchEvent(new Event("player-log-changed"));if(conflict)E("Forslaget var allerede fulgt opp. Det første notatet er beholdt; teksten din er ikke lagret. Du kan lukke vinduet og se trenerloggen.");else close();}}catch(e){if(alive.current)E((e as Error).message||"Kunne ikke lagre. Prøv igjen.");}finally{lock.current=false;if(alive.current)B(false);}}}>
 <header><h3 id="followup-title"><Check size={18}/> Marker som fulgt opp</h3><button type="button" className="btn" title="Lukk" aria-label="Lukk oppfølgingsnotat" disabled={busy} onClick={close}><X size={18}/></button></header>
 <strong>{data.roster.find(p=>p.id===suggestion.athlete)?.name}</strong><p>{suggestion.title}</p><small>{suggestion.evidence}</small>
 <label>Kort notat til trenerloggen<textarea aria-label="Kort notat til trenerloggen" autoFocus required maxLength={1000} rows={4} value={note} disabled={busy} onChange={e=>N(e.target.value)} placeholder="Hva ble avklart, og hva er neste steg?"/></label><small>{note.length}/1000 · Kun trenere på laget</small>
 {error&&<p role="alert">{error}</p>}<footer><button type="button" className="btn" disabled={busy} onClick={close}>Avbryt</button><button type="submit" className="btn primary" disabled={busy||!note.trim()}><Save size={16}/>{busy?"Lagrer …":"Lagre oppfølging"}</button></footer>
 </form></dialog>;
}
