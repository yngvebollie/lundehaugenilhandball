import {useState} from "react";
import {Eye} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
export function AdminAthleteView({data,exit}:{data:Snapshot;exit:()=>void}){
 const people=data.roster.filter(p=>p.role==="athlete"&&p.squad===data.me.squad).sort((a,b)=>a.name.localeCompare(b.name,"nb"));
 const [id,I]=useState(""),[tab,T]=useState("Min plan");const p=people.find(p=>p.id===id)||people[0];
 if(!data.club?.active||data.me.role!=="coach")return null;
 const plans=data.plans.filter(a=>a.athlete===p?.id).sort((a,b)=>b.day.localeCompare(a.day)),notices=data.notices.filter(n=>n.athlete===p?.id&&n.starts_on<=today());
 return <section className="grid"><header className="feature-heading"><h2><Eye size={19}/> Utøvervisning · skrivebeskyttet</h2><button className="btn" onClick={exit}>Avslutt forhåndsvisning</button></header>
 {p?<><label>Utøver<select value={p.id} onChange={e=>I(e.target.value)}>{people.map(a=><option key={a.id} value={a.id}>{a.name}{a.shirt_number?" · #"+a.shirt_number:""}</option>)}</select></label>
 <section className="mobile-main grid"><h2>{p.name}</h2><small>{data.teams.find(t=>t.id===p.squad)?.name}{p.shirt_number&&" · #"+p.shirt_number}</small><nav className="workspace-tabs">{["Min plan","Meldinger","Min profil"].map(t=><button key={t} aria-pressed={t===tab} className={t===tab?"current":""} onClick={()=>T(t)}>{t}</button>)}</nav>
 {tab==="Min plan"?<>{!plans.length&&<p>Ingen tildelte økter.</p>}{plans.map(a=><article key={a.id}><time>{a.day===today()?"I dag":a.day} {a.start_time?.slice(0,5)}</time><h3>{a.title}</h3><ul>{a.exercises.map((x,i)=><li key={i}>{data.checks.some(c=>c.assignment===a.id&&c.step===i)?"✓ ":""}{x}</li>)}</ul></article>)}</>:tab==="Meldinger"?<>{notices.map(n=><article key={n.id}><small>{n.starts_on} · {n.read_at?"Lest":"Ulest"}</small><p>{n.body}</p></article>)}{!notices.length&&<p>Ingen lagmeldinger.</p>}</>:<><h3>Min profil</h3>{p.photo&&<img src={p.photo} width="80" height="80" alt={p.name}/>}<p>{p.name} · {p.position||"Ingen posisjon oppgitt"}</p><p>{p.bio}</p></>}</section></>:<p>Ingen registrerte utøvere på dette laget. Velg et annet lag øverst.</p>}</section>;
}
