import {useEffect,useState} from "react";
import {Copy,Link as LinkIcon,ShieldCheck,UserMinus} from "lucide-react";
import {applicationLink,changeStaff,type Member,type Snapshot} from "@/lib/beta";
import type {Run} from "./program-builder";
type Props={data:Snapshot;busy:boolean;run:Run};
export function TeamStaff({data,busy,run}:Props){
  const admin=data.admins.includes(data.me.id);
  const [note,setNote]=useState("");
  return <details className="library-tools"><summary><ShieldCheck size={16}/> Staff &amp; roster permissions</summary><div className="grid">
    {data.roster.map(m=>{const elevated=data.admins.includes(m.id),last=elevated&&data.admins.length===1;
      async function change(action:"promote"|"demote"|"remove"){
        if(action==="remove"&&!window.confirm("Remove "+m.name+" from this team? Their account and training history are kept."+(m.role==="athlete"?" The team's six-character join code will expire.":"")))return;
        if(await run(()=>changeStaff(data,m,action)))setNote(action==="remove"?"Member removed from this team.":"Coach permissions saved.");
      }
      return <div className="result" key={m.id}><div><strong>{m.name}</strong><p>{elevated?"Admin coach":m.role==="coach"?"Coach":"Athlete"}</p></div><div className="day-strip">
        {admin&&m.role==="coach"&&<button className="btn" disabled={busy||last} title={last?"Promote a second admin first":undefined} onClick={()=>change(elevated?"demote":"promote")}>{elevated?"Make coach":"Make admin coach"}</button>}
        {(admin||m.role==="athlete")&&<button aria-label={"Remove "+m.name} title={last?"Promote a second admin first":"Remove from this team"} disabled={busy||last} className="btn" onClick={()=>change("remove")}><UserMinus size={16}/></button>}
      </div></div>;
    })}{note&&<p role="status">{note}</p>}
  </div></details>;
}
export function ShareLink({data,busy,run}:Props){
  const [role,setRole]=useState<Member["role"]>("athlete"),[record,setRecord]=useState<{token:string;expires:string;direct?:boolean}|null>(null),[note,setNote]=useState("");
  const team=data.me.squad,admin=data.admins.includes(data.me.id);
  useEffect(()=>{let alive=true;setRecord(null);setNote("");applicationLink(team,role,"get").then(r=>{if(alive)setRecord(r);}).catch(e=>{if(alive)setNote(e.message);});return ()=>{alive=false;};},[team,role]);
  const url=record?location.origin+"/apply?link="+record.token:"";
  return <section className="grid"><h3><LinkIcon size={17}/> Inviter med lenke</h3><p className="muted">Nye invitasjoner gir tilgang til dette laget etter e-postbekreftelse, uten manuell godkjenning. Del trenerlenker kun med personer som skal ha tilgang til utøverdata.</p>
    <label>Rolle i laget<select value={role} onChange={e=>setRole(e.target.value as Member["role"])}><option value="athlete">Athlete</option>{admin&&<option value="coach">Coach</option>}</select></label>
    <div className="day-strip"><button className="btn" disabled={busy} onClick={()=>run(async()=>{setRecord(await applicationLink(team,role,"issue"));setNote("Invitasjonen er klar.");})}>{url?"Erstatt invitasjonslenke":"Opprett invitasjonslenke"}</button>
    {url&&<button className="btn" disabled={busy} onClick={()=>run(async()=>{await applicationLink(team,role,"revoke");setRecord(null);setNote("Link revoked.");})}>Revoke link</button>}</div>
    {record&&!record.direct&&<p className="km-status">Denne gamle lenken krever godkjenning. Erstatt den for å dele en direkte invitasjon.</p>}{record&&<><label>Lagets invitasjonslenke<input readOnly value={url} onFocus={e=>e.target.select()}/></label><small>Expires {new Date(record.expires).toLocaleDateString("en-GB")}</small><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(url);setNote("Link copied.");}catch{setNote("Select the link above to copy it.");}}}><Copy size={16}/>Kopier invitasjonslenke</button></>}
    {note&&<p role="status">{note}</p>}</section>;
}
