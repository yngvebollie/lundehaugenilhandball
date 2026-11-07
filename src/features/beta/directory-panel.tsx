import {useEffect,useState} from "react";
import {clubDirectory,type Directory,type Snapshot} from "@/lib/beta";
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
  return <section className="grid squad-stats"><header className="competition-heading"><div><h2>{data.club?.active?"Hele klubben":"Mine lag"}</h2><small>{teams.length} lag · {groups.size} unike brukere</small></div><select aria-label="Filtrer på lag" value={team} onChange={e=>setTeam(e.target.value)}><option value="">Alle lag</option>{rows.teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></header>
    <nav className="workspace-tabs" aria-label="Brukeroversikt">{["Alle brukere","Trenere","Utøvere","Invitasjoner","Lag"].map(t=><button key={t} className={tab===t?"current":""} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
    <label>Søk<input type="search" placeholder="Navn, lag eller invitasjon" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="player-list-scroll"><table className="table stat-table"><thead><tr>{(tab==="Lag"?["Lag","Trenere","Utøvere"]:tab==="Invitasjoner"?["Invitasjon","Rolle","Lag","Status","Utløper"]:["Navn","Rolle","Lag"]).map(c=><th key={c}>{c}</th>)}</tr></thead>
      <tbody>{tab==="Lag"?teams.filter(t=>by(t.name)).map(t=><tr key={t.id}><th>{t.name}</th><td>{members.filter(m=>m.team===t.id&&m.role==="coach").length}</td><td>{members.filter(m=>m.team===t.id&&m.role==="athlete").length}</td></tr>):
        tab==="Invitasjoner"?invites.filter(i=>by((i.email||i.kind)+" "+teamLabel(i.team)+" "+(i.role==="coach"?"Trener":"Utøver"))).map((i,n)=><tr key={n}><th>{i.email||i.kind}</th><td>{i.role==="coach"?"Trener":"Utøver"}</td><td>{teamLabel(i.team)}</td><td>{i.expired?"Utløpt":"Åpen"}</td><td>{new Date(i.expires).toLocaleDateString("nb-NO")}</td></tr>):
        list.map(([id,p])=><tr key={id}><th>{p.role==="athlete"&&data.roster.some(m=>m.id===id)?<a href={"/spillerstats?athlete="+id}>{p.name}</a>:p.name}</th><td>{p.role==="coach"?"Trener":"Utøver"}</td><td>{p.teams.join(" · ")}</td></tr>)}</tbody></table></div>
    {tab==="Invitasjoner"&&!invites.length&&<p>Ingen invitasjoner i dette utvalget.</p>}{!["Lag","Invitasjoner"].includes(tab)&&!list.length&&<p>Ingen brukere i dette utvalget.</p>}
  </section>;
}
