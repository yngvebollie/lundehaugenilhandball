import {useCallback,useEffect,useRef,useState} from "react";
import {Award as Medal,Plus,ShieldCheck,Trophy} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {trainingDay} from "@/lib/programs";
import {achievements,challenges,createChallenge,logSet,phase,scoreboard,type Award,type Challenge,type Score} from "@/lib/challenges";

export function AchievementBar({data}:{data:Snapshot}){
  const [awards,setAwards]=useState<Award[]>([]),[error,setError]=useState("");
  useEffect(()=>{let ok=true;achievements(data).then(a=>{if(ok){setAwards(a);setError("");}}).catch(e=>{if(ok)setError(e.message);});return()=>{ok=false;};},[data]);
  return <details className="achievement-bar"><summary><Medal size={19}/><strong>Mine prestasjoner</strong><span>{awards.length}</span></summary>
    {error?<p role="alert">{error}</p>:!awards.length?<p>Ingen merker ennå. Delta i en utfordring for å få ditt første.</p>:awards.map(a=><div key={a.id}><Medal size={16}/><span><strong>{a.winner?"Vinner":"Deltaker"} · {a.title}</strong><small>{a.total} {a.unit} · {a.ends}</small></span></div>)}</details>;
}
export function Challenges({data}:{data:Snapshot}){
  const coach=data.me.role==="coach";
  const [all,setAll]=useState<Challenge[]>([]),[id,setId]=useState(""),[board,setBoard]=useState<Score[]>([]),[busy,setBusy]=useState(false),[note,setNote]=useState("");
  const [name,setName]=useState(""),[unit,setUnit]=useState("repetisjoner"),[start,setStart]=useState(today),[end,setEnd]=useState(()=>trainingDay(today(),13)),[anonymous,setAnon]=useState(true);
  const [amount,setAmount]=useState(""),entry=useRef(""),lock=useRef(false);
  const current=all.find(c=>c.id===id)||all[0];
  const refresh=useCallback(async()=>{
    const list=await challenges(data);const c=list.find(c=>c.id===id)||list[0];
    return {list,board:c?await scoreboard(data,c):[]};
  },[data,id]);
  useEffect(()=>{let active=true;const update=()=>refresh().then(r=>{if(active){setAll(r.list);setBoard(r.board);}}).catch(e=>{if(active)setNote(e.message);});
    void update();window.addEventListener("focus",update);window.addEventListener("storage",update);const timer=setInterval(update,15000);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",update);};},[refresh]);
  async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setNote("");try{await fn();}catch(e){setNote((e as Error).message);}finally{lock.current=false;setBusy(false);}}
  return <section className="challenge-work grid"><header><span className="eyeline">{data.teams.find(t=>t.id===data.me.squad)?.name}</span><h2><Trophy size={22}/> Utfordringer</h2></header>
    {coach&&<details className="library-tools"><summary>Opprett utfordring</summary><form className="grid" onSubmit={e=>{e.preventDefault();void run(async()=>{const next=await createChallenge(data,{title:name.trim(),unit:unit.trim(),starts:start,ends:end,anonymous});setId(next);setBoard([]);setName("");setNote("Utfordring opprettet.");});}}>
      <div className="field-pair"><label>Navn på utfordringen<input required maxLength={100} placeholder="Pushup challenge" value={name} onChange={e=>setName(e.target.value)}/></label><label>Enhet<input required maxLength={24} value={unit} onChange={e=>setUnit(e.target.value)}/></label></div>
      <div className="field-pair"><label>Startdato<input required type="date" min={today()} value={start} onChange={e=>{setStart(e.target.value);if(e.target.value)setEnd(trainingDay(e.target.value,13));}}/></label><label>Sluttdato (inkludert)<input required type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
      <label>Resultatliste<select value={anonymous?"anonymous":"named"} onChange={e=>setAnon(e.target.value==="anonymous")}><option value="anonymous">Anonym · bare egen rad er gjenkjennelig</option><option value="named">Vis navn til laget</option></select></label><button className="btn primary" disabled={busy}><Plus size={16}/>Publiser utfordring</button>
    </form></details>}
    {all.length>0?<label>Velg utfordring<select value={current?.id||""} onChange={e=>{setId(e.target.value);setAmount("");entry.current="";setBoard([]);setNote("");}}>{all.map(c=><option key={c.id} value={c.id}>{c.title} · {phase(c)}</option>)}</select></label>:<p className="muted">Ingen utfordringer ennå.</p>}
    {current&&<><div className="challenge-head"><div><h3>{current.title}</h3><small>{current.starts} – {current.ends}</small></div><span className="badge blue">{phase(current)}</span></div>
      {!coach&&phase(current)==="Aktiv"&&<form className="challenge-log" onSubmit={e=>{e.preventDefault();void run(async()=>{entry.current||=crypto.randomUUID();await logSet(data,current,Number(amount),entry.current);entry.current="";setAmount("");setBoard(await scoreboard(data,current));setNote("Sett registrert.");});}}>
        <label>{current.unit} i dette settet<input type="number" inputMode="numeric" min={1} max={100000} step={1} required value={amount} onChange={e=>{entry.current="";setAmount(e.target.value);}}/></label>
        <button disabled={busy||!amount} className="btn primary"><Plus size={16}/>Registrer sett</button></form>}
      <header className="feature-heading"><h3>Resultatliste</h3><small>{current.anonymous?<><ShieldCheck size={14}/> Anonym</>:"Synlig for laget"}</small></header>
      {board.length?<table className="table score-table"><thead><tr><th>Plass</th><th>Spiller</th><th>{current.unit}</th></tr></thead><tbody>{board.map(r=><tr key={r.label+":"+r.place+":"+r.total} className={r.mine?"my-score":""}><td>{r.place}</td><th>{r.label}</th><td>{r.total}</td></tr>)}</tbody></table>:<p className="muted">Ingen sett registrert.</p>}</>}
    {note&&<p role="status" className="km-status">{note}</p>}</section>;
}
