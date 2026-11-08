import {useCallback,useEffect,useRef,useState} from "react";
import {Pause,Play,Square,Undo2} from "lucide-react";
import {db,demo,today,type Snapshot} from "@/lib/beta";
import {registrations,seasonMatches,type Fixture} from "@/lib/match-journal";
import type {Registration} from "@/lib/nif";
import {clock,elapsed,kinds,liveMatch,origins,phases,totals,type Command,type Entry,type Kind,type Logged,type Session} from "@/lib/live-analysis";
import {LiveGoal} from "./live-goal";
import {LiveSummary} from "./live-summary";
import "./live-analysis.css";
type GameLog={match:string;events:Logged[]};
export function LiveAnalysis({data}:{data:Snapshot}){
 const [regs,setRegs]=useState<Registration[]>([]),[games,setGames]=useState<Fixture[]>([]),[reg,R]=useState(""),[game,G]=useState(""),[mode,M]=useState("Kamp"),[note,N]=useState(""),[loaded,L]=useState(false);
 const team=data.me.squad;
 useEffect(()=>{let alive=true;(async()=>{const rs=await registrations(team),gs=await seasonMatches(team,rs);if(alive){setRegs(rs);setGames(gs);const q=new URLSearchParams(location.search),target=gs.find(g=>g.id===q.get("game"));R(target?.registration||rs.find(r=>r.id===q.get("reg"))?.id||rs[0]?.id||"");G(target?.id||"");L(true);}})().catch(e=>{if(alive)N(e.message)});return()=>{alive=false};},[team]);
 const pool=games.filter(g=>g.registration===reg).sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||""));
 const selected=pool.find(g=>g.id===game)||pool.find(g=>!g.completed&&g.day>=today())||pool.at(-1);
 useEffect(()=>{if(loaded&&reg){const q=new URLSearchParams({reg});if(selected)q.set("game",selected.id);history.replaceState(null,"","/liveanalyse?"+q.toString());}},[loaded,reg,selected?.id]);
 return <section className="live-analysis"><header className="live-select"><label>Spillelag<select value={reg} onChange={e=>{R(e.target.value);G("");}}>{regs.map(r=><option value={r.id} key={r.id}>{r.display_name||r.org_id}</option>)}</select></label>
 <label>Kamp<select value={selected?.id||""} onChange={e=>{G(e.target.value);M("Kamp");}}>{pool.map(g=><option key={g.id} value={g.id}>{g.day} · {g.home||"Eget lag"} – {g.away||g.opponent}</option>)}</select></label></header>
 <nav className="workspace-tabs" aria-label="Analyseperiode">{["Kamp","Sesonganalyse"].map(m=><button className={mode===m?"current":""} aria-pressed={mode===m} key={m} onClick={()=>M(m)}>{m}</button>)}</nav>
 {note?<p role="alert">{note}</p>:!loaded?<p>Laster terminlisten …</p>:!selected?<p>Ingen kamper i valgt spillelag og sesong.</p>:mode==="Kamp"?<Recorder key={selected.id} g={selected} data={data}/>:<Season key={reg} team={team} reg={reg} games={pool}/>}</section>;
}
function Season({team,reg,games}:{team:string;reg:string;games:Fixture[]}){
 const [logs,set]=useState<GameLog[]>(),[error,E]=useState(""),[opponent,OP]=useState("");
 useEffect(()=>{let alive=true;(async()=>{const rows:GameLog[]=demo?(await Promise.all(games.map(async g=>({match:g.id,session:await liveMatch(g.id)})))).filter(g=>g.session.version).map(g=>({match:g.match,events:g.session.events})):(await db!.rpc("beta_live_season",{t:team,reg}).throwOnError()).data;if(alive)set(rows)})().catch(e=>{if(alive)E(e.message)});return()=>{alive=false};},[reg,team]);
 const byId=new Map(games.map(g=>[g.id,g.opponent])),filtered=logs?.filter(l=>!opponent||byId.get(l.match)===opponent)||[];
 return error?<p role="alert">{error}</p>:!logs?<p>Laster analyse …</p>:<><h2>Sesonganalyse</h2><label>Motstander<select value={opponent} onChange={e=>OP(e.target.value)}><option value="">Alle motstandere</option>{[...new Set(logs.map(l=>byId.get(l.match)).filter((v):v is string=>!!v))].sort().map(n=><option key={n}>{n}</option>)}</select></label><p>{filtered.length} {filtered.length===1?"kamp":"kamper"} med egen registrering</p><LiveSummary events={filtered.flatMap(r=>r.events)}/></>;
}
function Recorder({g,data}:{g:Fixture;data:Snapshot}){
 const [s,S]=useState<Session>(),[tick,T]=useState(Date.now()),[tab,A]=useState("Keeper"),[choice,C]=useState<Kind>("save"),[keeper,K]=useState(""),[player,P]=useState(""),[assist,H]=useState(""),[origin,O]=useState("Ukjent"),[phase,F]=useState("Etablert"),[busy,B]=useState(false),[note,N]=useState(""),[finish,V]=useState(false),[filter,Q]=useState("Alle");
 const offset=useRef(0),lock=useRef(false),initialized=useRef(false);
 const accept=useCallback((n:Session)=>{if(!initialized.current){initialized.current=true;K([...n.events].reverse().find(e=>e.side==="opp"&&e.keeper)?.keeper||"");}S(old=>old&&old.version>n.version?old:n);offset.current=n.now-Date.now();T(Date.now());},[]);
 const read=useCallback(async()=>accept(await liveMatch(g.id)),[accept,g.id]);
 useEffect(()=>{let live=true;const update=()=>liveMatch(g.id).then(n=>{if(live)accept(n)}).catch(e=>{if(live)N(e.message)});void update();const timer=setInterval(update,7000),ticker=setInterval(()=>T(Date.now()),300);window.addEventListener("focus",update);return()=>{live=false;clearInterval(timer);clearInterval(ticker);window.removeEventListener("focus",update);};},[g.id,accept]);
 async function send(cmd:Command,v?:Entry){
  if(!s||lock.current)return;lock.current=true;B(true);N("");
  try{const n=await liveMatch(g.id,cmd,s.version,v);accept(n);V(false);if(cmd==="event")N(kinds[v!.kind]+" registrert · "+clock(n.events.at(-1)!.ms));if(cmd==="undo")N("Siste hendelse angret.");}
  catch(e){N((e as Error).message||"Kunne ikke lagre. Sjekk forbindelsen.");await read().catch(()=>{});}finally{lock.current=false;B(false);}
 }
 if(!s)return <p role="status">{note||"Henter kampklokka …"}</p>;
 const opp=tab==="Keeper",side=opp?"opp":"own",on=s.status==="running",own=s.events.filter(e=>e.side==="own"),against=s.events.filter(e=>e.side==="opp"),keeperShots=against.filter(e=>!keeper||e.keeper===keeper),shotRows=opp?keeperShots:own,stats=totals(shotRows);
 function event(kind:Kind,x:number|null=null,y:number|null=null){
  if(opp&&["save","goal","wide","block"].includes(kind)&&!keeper.trim()){N("Velg eller skriv inn keeper først.");return}
  void send("event",{kind,side,player:player.trim(),keeper:opp?keeper.trim():"",assist:kind==="goal"?assist.trim():null,origin,phase,x,y});
 }
 const actors=data.roster.filter(m=>m.role==="athlete").map(m=>m.name);
 return <><div className="live-clock"><div><small>{g.home} – {g.away}</small><h2>{clock(elapsed(s,tick+offset.current))}</h2><span>{s.period}. omgang · {{idle:"Ikke startet",running:"Pågår",paused:"Pause",finished:"Avsluttet"}[s.status]}</span></div><div className="live-clock-actions">
 {s.status==="idle"?<button className="btn primary" disabled={busy} onClick={()=>send("start")}><Play size={17}/> Start kampen</button>:on?<button className="btn" disabled={busy} onClick={()=>send("pause")}><Pause size={17}/> Pause klokka</button>:s.status==="paused"?<><button className="btn primary" disabled={busy} onClick={()=>send("resume")}><Play size={16}/> Fortsett</button>{s.period<6&&<button className="btn" disabled={busy} onClick={()=>send("period")}>Start {s.period+1}. omgang</button>}</>:null}
 {["running","paused"].includes(s.status)&&<button className="btn" onClick={()=>V(!finish)} disabled={busy}><Square size={15}/> Avslutt</button>}</div></div>
 {finish&&<div className="live-confirm"><strong>Avslutte registreringen? Kampen blir skrivebeskyttet.</strong><button className="btn" onClick={()=>V(false)}>Avbryt</button><button className="btn primary" disabled={busy} onClick={()=>send("finish")}>Avslutt kampen</button></div>}
 <nav className="workspace-tabs" aria-label="Liveanalyse">{["Keeper","Angrep","Oversikt","Hendelser"].map(n=><button aria-pressed={tab===n} className={tab===n?"current":""} key={n} onClick={()=>{A(n);C(n==="Keeper"?"save":"goal");P("");H("");}}>{n}</button>)}</nav>
 {tab==="Oversikt"?<><label>Omgang<select value={filter} onChange={e=>Q(e.target.value)}><option>Alle</option>{Array.from({length:s.period},(_,i)=><option key={i}>{i+1}</option>)}</select></label><LiveSummary events={s.events.filter(e=>filter==="Alle"||e.period===Number(filter))}/></>:tab==="Hendelser"?<><h3>Kampforløp</h3>{!s.events.length&&<p>Ingen registrerte hendelser.</p>}<ol className="live-timeline">{[...s.events].reverse().map(e=><li key={e.seq}><time>{clock(e.ms)}</time><b>{kinds[e.kind]}</b><span>{e.side==="own"?"Eget lag":"Motstander"} · {e.period}. omg. · {[e.player,e.keeper].filter(Boolean).join(" / ")||"Lag"}{e.assist&&" · assist: "+e.assist}</span></li>)}</ol></>:<>
 <datalist id="live-team-players">{[...new Set([...actors,...s.events.flatMap(e=>[e.keeper,e.side==="own"?e.player:""]).filter(Boolean)])].map(n=><option key={n} value={n}/>)}</datalist>
 <div className="live-layout"><section className="live-controls"><h3>{opp?"Skudd mot eget mål":"Egne avslutninger"}</h3>
 {opp&&<label>Aktiv keeper<input list="live-team-players" maxLength={100} value={keeper} placeholder="Velg eller skriv keeper" onChange={e=>K(e.target.value)}/></label>}
 <label>{opp?"Skytter hos motstander":"Skytter / spiller"}<input list={opp?undefined:"live-team-players"} maxLength={100} placeholder="Navn eller draktnummer" value={player} onChange={e=>P(e.target.value)}/></label>
 <label>Skuddposisjon<select value={origin} onChange={e=>O(e.target.value)}>{origins.map(o=><option key={o}>{o}</option>)}</select></label>
 <label>Spillfase<select value={phase} onChange={e=>F(e.target.value)}>{phases.map(p=><option key={p}>{p}</option>)}</select></label>
 {!opp&&choice==="goal"&&<label>Assist (valgfritt)<input list="live-team-players" maxLength={100} value={assist} onChange={e=>H(e.target.value)}/></label>}</section>
 <section className="live-board"><div className="live-numbers">{(opp?[["Skudd mot",stats.attempts],["Redninger",stats.save],["Baklengs",stats.goal],["Redningsprosent",stats.rate]]:[["Skudd",stats.attempts],["Mål",stats.goal],["Uttelling",stats.eff]]).map(([l,n])=><div key={l}><small>{l}</small><b>{n}</b></div>)}</div>
 <div className="day-strip">{(["save","goal"] as const).map(k=><button key={k} className={"btn "+(choice===k?"primary":"")} aria-pressed={choice===k} onClick={()=>C(k)}>{k==="save"?(opp?"Redning":"Reddet av motstander"):(opp?"Baklengsmål":"Mål")}</button>)}</div>
 <LiveGoal shots={shotRows} disabled={!on||busy||opp&&!keeper.trim()} onPick={(x,y)=>event(choice,x,y)}/>
 <small>{s.status==="idle"?"Start kampen for å registrere skudd.":on&&opp&&!keeper.trim()?"Velg keeper for å registrere skudd.":on?"Trykk i målet der skuddet traff.":"Klokka står."}</small>
 <div className="day-strip">{(["wide","block"] as const).map(k=><button className="btn" key={k} disabled={!on||busy||opp&&!keeper.trim()} onClick={()=>event(k)}>{kinds[k]}</button>)}</div></section></div>
 <details><summary>Andre hendelser · {opp?"motstander":"eget lag"}</summary><div className="day-strip">{(["turnover","steal","warning","two","red"] as const).map(k=><button className="btn" disabled={!on||busy} key={k} onClick={()=>event(k)}>{kinds[k]}</button>)}</div></details></>}
 {s.events.length>0&&s.status!=="finished"&&<button className="btn live-undo" disabled={busy} onClick={()=>send("undo")}><Undo2 size={16}/> Angre siste hendelse · {clock(s.events.at(-1)!.ms)}</button>}
 <p role="status" className="live-note">{note}</p></>;
}
