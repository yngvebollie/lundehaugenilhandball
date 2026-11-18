import {useEffect,useRef,useState} from "react";
import {RotateCcw,X} from "lucide-react";
import type {Snapshot} from "@/lib/beta";
import {reopenFollowup,type FollowupLog} from "@/lib/followup-log";

export function ReopenFollowup({data,row,close,saved}:{data:Snapshot;row:FollowupLog;close:()=>void;saved:(row:FollowupLog)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),alive=useRef(true),[busy,B]=useState(false),[error,E]=useState("");
 useEffect(()=>{alive.current=true;dialog.current?.showModal();return()=>{alive.current=false;dialog.current?.close();};},[]);
 return <dialog ref={dialog} className="followup-dialog" aria-labelledby="reopen-title" onCancel={e=>{e.preventDefault();if(!lock.current)close();}}><form onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;B(true);E("");try{const event=await reopenFollowup(data,row);if(alive.current){saved(event);window.dispatchEvent(new Event("player-log-changed"));close();}}catch(e){if(alive.current)E((e as Error).message||"Kunne ikke gjenåpne. Prøv igjen.");}finally{lock.current=false;if(alive.current)B(false);}}}>
 <header><h3 id="reopen-title"><RotateCcw size={18}/>Gjenåpne oppfølging?</h3><button type="button" className="btn" title="Lukk" aria-label="Lukk gjenåpning" disabled={busy} onClick={close}><X size={18}/></button></header>
 <strong>{data.roster.find(p=>p.id===row.athlete)?.name}</strong><p>{row.followup.title}</p><p>Det opprinnelige notatet beholdes i trenerloggen. Gjenåpningen loggføres med navnet ditt og tidspunktet.</p>
 {error&&<p role="alert">{error}</p>}<footer><button type="button" className="btn" disabled={busy} onClick={close}>Avbryt</button><button type="submit" className="btn primary" disabled={busy}><RotateCcw size={16}/>{busy?"Gjenåpner …":"Gjenåpne"}</button></footer>
 </form></dialog>;
}
