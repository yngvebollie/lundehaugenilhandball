import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {clubDirectory,db,type Directory,type Snapshot} from "@/lib/beta";
import "./squad-stats.css";
export function DirectoryPanel({data}:{data:Snapshot}){
  const [rows,setRows]=useState<Directory>(),[error,setError]=useState(""),[team,setTeam]=useState(""),[tab,setTab]=useState("Alle brukere"),[query,setQuery]=useState("");
  useEffect(()=>{let alive=true;clubDirectory(data).then(r=>{if(alive){setRows(r);setError("");}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[data]);
  if(error)return <p role="alert">{error}</p>;if(!rows)return <p role="status">Henter brukeroversikt …</p>;
  const teams=rows.teams.filter(t=>!team||t.id===team), ids=new Set(teams.map(t=>t.id)),members=rows.members.filter(m=>ids.has(m.team)),invites=rows.invitations.filter(i=>ids.has(i.team));
  const by=(s:string)=>s.toLocaleLowerCase("nb").includes(query.trim().toLocaleLowerCase("nb"));
  const groups=new Map<string,{name:string;role:string;teams:string[]}>(),teamLabel=(id:string)=>rows.teams.find(t=>t.id===id)?.name||"";
  for(const m of members){const p=groups.get(m.id)||{name:m.name,role:m.role,teams:[]};p.teams.push(teamLabel(m.team)+(m.admin?" (admintrener)":""));groups.set(m.id,p);}
  const list=[...groups].filter(([,p])=>(tab==="Alle brukere"||p.role===(tab==="Trenere"?"coach":"athlete"))&&by(p.name+" "+p.teams.join(" "))).sort(([,a],[,b])=>a.name.localeCompare(b.name,"nb"));
  return <section className="grid squad-stats"><header className="competition-heading"><div><FeatureInfo topic="directory"><h2>{data.club?.active?"Hele klubben":"Mine lag"}</h2></FeatureInfo><small>{teams.length} lag · {groups.size} unike brukere</small></div><select aria-label="Filtrer på lag" value={team} onChange={e=>setTeam(e.target.value)}><option value="">Alle lag</option>{rows.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></header>
    {data.club?.active&&db&&<ClubRequests onApproved={()=>void clubDirectory(data).then(setRows).catch(e=>setError(e.message))}/>}
    <nav className="workspace-tabs" aria-label="Brukeroversikt">{["Alle brukere","Trenere","Utøvere","Invitasjoner","Lag"].map(t=><button key={t} className={tab===t?"current":""} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    <label>Søk<input type="search" placeholder="Navn, lag eller invitasjon" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="player-list-scroll"><table className="table stat-table"><thead><tr>{(tab==="Lag"?["Lag","Trenere","Utøvere"]:tab==="Invitasjoner"?["Invitasjon","Rolle","Lag","Status","Utløper"]:["Navn","Rolle","Lag"]).map(c=><th key={c}>{c}</th>)}</tr></thead>
      <tbody>{tab==="Lag"?teams.filter(t=>by(t.name)).map(t=><tr key={t.id}><th>{t.name}</th><td>{members.filter(m=>m.team===t.id&&m.role==="coach").length}</td><td>{members.filter(m=>m.team===t.id&&m.role==="athlete").length}</td></tr>):
        tab==="Invitasjoner"?invites.filter(i=>by((i.email||i.kind)+" "+teamLabel(i.team)+" "+(i.role==="coach"?"Trener":"Utøver"))).map((i,n)=><tr key={n}><th>{i.email||i.kind}</th><td>{i.role==="coach"?"Trener":"Utøver"}</td><td>{teamLabel(i.team)}</td><td>{i.expired?"Utløpt":"Åpen"}</td><td>{new Date(i.expires).toLocaleDateString("nb-NO")}</td></tr>):
        list.map(([id,p])=><tr key={id}><th>{p.role==="athlete"&&data.roster.some(m=>m.id===id)?<a href={"/spillerstats?athlete="+id}>{p.name}</a>:p.name}</th><td>{p.role==="coach"?"Trener":"Utøver"}</td><td>{p.teams.join(" · ")}</td></tr>)}</tbody></table></div>
    {tab==="Invitasjoner"&&!invites.length&&<p>Ingen invitasjoner i dette utvalget.</p>}{!["Lag","Invitasjoner"].includes(tab)&&!list.length&&<p>Ingen brukere i dette utvalget.</p>}
  </section>;
}

type ClubRequest={id:string;club:string;coach:string;email:string;created:string};

function ClubRequests({onApproved}:{onApproved:()=>void}){
  const [allowed,setAllowed]=useState(false);
  const [requests,setRequests]=useState<ClubRequest[]>([]);
  const [busy,setBusy]=useState("");
  const [confirm,setConfirm]=useState<{id:string;approve:boolean}|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    const read=async()=>{
      const {data}=await db!.rpc("beta_can_approve_clubs").throwOnError();
      if(!active||!data)return;
      setAllowed(true);
      const pending=await db!.rpc("beta_pending_club_requests").throwOnError();
      if(active)setRequests(pending.data);
    };
    void read().catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[]);
  async function decide(request:ClubRequest,approve:boolean){
    setBusy(request.id);setError("");setMessage("");
    try{
      await db!.rpc("beta_decide_club_request",{applicant_id:request.id,approve}).throwOnError();
      setRequests(rows=>rows.filter(row=>row.id!==request.id));setConfirm(null);
      setMessage(request.club+(approve?" er godkjent.":" ble avslått."));
      if(approve)onApproved();
    }catch(e){setError((e as Error).message);}
    finally{setBusy("");}
  }
  if(!allowed)return error?<p role="alert">{error}</p>:null;
  return <section className="grid" aria-label="Klubbsøknader">
    <h3>Klubbsøknader</h3>
    {message&&<p role="status">{message}</p>}
    {error&&<p role="alert">{error}</p>}
    {requests.length===0?<p>Ingen klubbsøknader til behandling.</p>:
      <div className="player-list-scroll"><table className="table stat-table">
        <thead><tr><th scope="col">Klubb</th><th scope="col">Søker</th><th scope="col">Mottatt</th><th scope="col">Behandle</th></tr></thead>
        <tbody>{requests.map(request=><tr key={request.id}>
          <th scope="row">{request.club}</th><td>{request.coach}<br/>{request.email}</td><td>{new Date(request.created).toLocaleDateString("nb-NO")}</td>
          <td><div className="day-strip">{confirm?.id===request.id?<>
            <button type="button" className="btn primary" disabled={!!busy} onClick={()=>void decide(request,confirm.approve)}>{confirm.approve?"Bekreft godkjenning":"Bekreft avslag"}</button>
            <button type="button" className="btn" disabled={!!busy} onClick={()=>setConfirm(null)}>Avbryt</button>
          </>:<>
            <button type="button" className="btn" disabled={!!busy} onClick={()=>setConfirm({id:request.id,approve:true})}>Godkjenn</button>
            <button type="button" className="btn" disabled={!!busy} onClick={()=>setConfirm({id:request.id,approve:false})}>Avslå</button>
          </>}</div></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
