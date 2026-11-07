import {useEffect,useState} from "react";
import {CalendarDays,ChevronRight,Volleyball} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {registrations,seasonMatches,type Fixture} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";
import {weekLabel} from "@/lib/workload";
import {trainingDay} from "@/lib/programs";
import {ActivityFeed} from "./activity-feed";
import "./squad-stats.css";
const dateLabel=(d:string,full=false)=>new Date(d+"T12:00:00").toLocaleDateString("nb-NO",{weekday:full?"long":"short",day:"numeric",month:full?"long":"short"});
export function CoachAgenda({data}:{data:Snapshot}){
 const [regs,setRegs]=useState<Registration[]>([]),[games,setGames]=useState<Fixture[]>([]),[error,setError]=useState("");
 useEffect(()=>{let alive=true;const load=async()=>{const r=await registrations(data.me.squad),g=await seasonMatches(data.me.squad,r);if(alive){setRegs(r);setGames(g);setError("");}};
 void load().catch(()=>{if(alive)setError("Kampoversikten kunne ikke lastes.");});return()=>{alive=false;};},[data]);
 const day=today(),end=trainingDay(day,7),players=data.roster.filter(p=>p.role==="athlete");
 const training=data.plans.filter(p=>p.day>=day&&p.day<=end&&p.kind!=="Game"),group=new Map<string,{d:string;time:string;title:string;ids:Set<string>}>();
 for(const p of training){const key=JSON.stringify([p.day,p.start_time,p.title,p.kind]),row=group.get(key)||{d:p.day,time:p.start_time?.slice(0,5)||"",title:p.title,ids:new Set<string>()};row.ids.add(p.athlete);group.set(key,row);}
 const sessions=[...group.values()].sort((a,b)=>a.d.localeCompare(b.d)||a.time.localeCompare(b.time)),now=sessions.filter(p=>p.d===day);
 const next=games.filter(g=>!g.completed&&g.day>=day&&!/avlyst|utsatt|cancel/i.test(g.status||"")).sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||""));
 const session=(p:typeof sessions[number])=><a className="agenda-entry" key={p.d+p.time+p.title} href="/#weekly"><time>{p.d===day?"I dag":dateLabel(p.d)} · {p.time||"Tid ikke satt"}</time><strong>{p.title}</strong><small>{p.ids.size} utøvere</small><ChevronRight size={15}/></a>;
 return <section className="coach-agenda"><header className="agenda-heading"><div><small>{data.teams.find(t=>t.id===data.me.squad)?.name} · {weekLabel(day)}</small><h2>{dateLabel(day,true)}</h2></div><a className="btn" href="/#weekly"><CalendarDays size={16}/>Ukeplan</a></header>
 <div className="agenda-columns"><section><h3>I dag</h3>{now.map(session)}{games.filter(g=>g.day===day).map(g=><a className="agenda-entry" key={g.id} href={"/match?game="+g.id}><time>{g.start_time?.slice(0,5)||"–"}</time><strong>{g.home} – {g.away}</strong><small>{g.score||g.status}</small></a>)}
 {!now.length&&!games.some(g=>g.day===day)&&<p>Ingen planlagte økter eller kamper i dag.</p>}<h3>Trening de neste sju dagene</h3>{sessions.filter(p=>p.d!==day).slice(0,10).map(session)}{!sessions.some(p=>p.d!==day)&&<p>Ingen kommende økter i ukeplanen.</p>}</section>
 <section><h3><Volleyball size={17}/> Neste kamp per spillelag</h3>{regs.map(r=>{const g=next.find(m=>m.registration===r.id);return <div className="next-fixture" key={r.id}><small>{r.display_name||"NIF "+r.org_id}</small>{g?<a href={"/match?reg="+r.id+"&game="+g.id}><strong>{g.home} – {g.away}</strong><span>{dateLabel(g.day)} · {g.start_time?.slice(0,5)||"Tid ikke satt"} · {g.venue||"Hall ikke satt"}</span></a>:<p>Ingen kommende kamp registrert.</p>}</div>;})}{error?<p role="alert">{error}</p>:!regs.length&&<a href="/match?view=teams">Åpne lagprofiler</a>}</section></div>
 <ActivityFeed data={data}/><section><header className="feature-heading"><h3>Utøvere</h3><a href="/spillerstats">Alle spillerstats</a></header><div className="profile-index">{players.map(p=><a href={"/spillerstats?athlete="+p.id} key={p.id}>{p.shirt_number&&"#"+p.shirt_number+" "}{p.name}<ChevronRight size={14}/></a>)}</div>{!players.length&&<a href="/team">Inviter en utøver</a>}</section></section>;
}
