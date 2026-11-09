import {useCallback,useEffect,useRef,useState} from "react";
import {Award as Medal,Plus,ShieldCheck,Trophy,HelpCircle,X} from "lucide-react";
import {today,type Snapshot} from "@/lib/beta";
import {trainingDay} from "@/lib/programs";
import {strength} from "@/lib/strength";
import {badges as catalog,badgeAction,reach} from "@/lib/badges";
import {achievements,mySets,type SetLog,challenges,createChallenge,logSet,phase,scoreboard,type Award,type Challenge,type Score} from "@/lib/challenges";

export function AchievementBar({data}:{data:Snapshot}){
  const [awards,setAwards]=useState<Award[]>([]),[earned,setEarned]=useState(0),[error,setError]=useState("");
  useEffect(()=>{let ok=true;Promise.all([achievements(data),badgeAction(data,data.me.id)]).then(([a,v])=>{if(ok){setAwards(a);setEarned(catalog.filter(b=>reach({...b,levels:v.targets?.[b.key]||b.levels},v.counts[b.key]||0)>0).length);setError("");}}).catch(e=>{if(ok)setError(e.message);});return()=>{ok=false;};},[data]);
  return <details className="achievement-bar"><summary><Medal size={19}/><strong>Mine prestasjoner</strong><span>{earned} merker · {awards.length} utfordringer</span></summary>
    <a href="/merker">Se alle mine merker</a>{error?<p role="alert">{error}</p>:!awards.length?<p>Ingen avsluttede utfordringer ennå.</p>:awards.map(a=><div key={a.id}><Medal size={16}/><span><strong>{a.winner?"Vinner":"Deltaker"} · {a.title}</strong><small>{a.total} {a.unit} · {a.ends}</small></span></div>)}</details>;
}
import {AssignedRating} from "./court-rating";
export function Challenges({data,startWith}:{data:Snapshot;startWith?:{id:string;exercise:string}}){
  const coach=data.me.role==="coach";
  const [all,setAll]=useState<Challenge[]>([]),[id,setId]=useState(startWith?.id||""),[board,setBoard]=useState<Score[]>([]),[busy,setBusy]=useState(false),[note,setNote]=useState("");
  const [name,setName]=useState(""),[unit,setUnit]=useState("repetisjoner"),[start,setStart]=useState(today),[end,setEnd]=useState(()=>trainingDay(today(),13)),[anonymous,setAnon]=useState(true);
  const [selectedExercises,setExercises]=useState<string[]>([]),[pick,setPick]=useState(""),[instructions,setInstructions]=useState(""),[badge,setBadge]=useState("");
  const [exercise,setExercise]=useState(startWith?.exercise||""),[history,setHistory]=useState<SetLog[]>([]);
  const library=[...new Set([...data.library.map(e=>e.name),...strength.map(e=>e.name)])];
  const [amount,setAmount]=useState(""),entry=useRef(""),lock=useRef(false);
  const current=all.find(c=>c.id===id)||all[0];
  const refresh=useCallback(async()=>{
    const list=await challenges(data);const c=list.find(c=>c.id===id)||list[0];
    return {list,board:c?await scoreboard(data,c):[],history:c&&!coach?await mySets(data,c):[]};
  },[data,id,coach]);
  useEffect(()=>{let active=true;const update=()=>refresh().then(r=>{if(active){setAll(r.list);setBoard(r.board);setHistory(r.history);}}).catch(e=>{if(active)setNote(e.message);});
    void update();window.addEventListener("focus",update);window.addEventListener("storage",update);const timer=setInterval(update,15000);
    return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",update);};},[refresh]);
  async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setNote("");try{await fn();}catch(e){setNote((e as Error).message);}finally{lock.current=false;setBusy(false);}}
  return <section className="challenge-work grid"><header><span className="eyeline">{data.teams.find(t=>t.id===data.me.squad)?.name}</span><h2><Trophy size={22}/> Utfordringer</h2></header>
    <details className="library-tools"><summary><HelpCircle size={16}/> Slik fungerer en utfordring</summary><p>Treneren velger øvelser, måleenhet og periode. Utøveren åpner Utfordringer, velger øvelse og registrerer ett sett om gangen. Flere sett samme dag legges sammen. For eksempel: 10 armhevinger om morgenen og 8 om kvelden gir 18 repetisjoner.</p><p>En avkrysset øvelse i en vanlig treningsøkt gir ikke poeng automatisk. Før settet én gang her. Når perioden er over, får deltakerne et merke; høyeste total vinner, også ved delt førsteplass.</p></details>
    {coach&&<details className="library-tools"><summary>Opprett utfordring</summary><form className="grid" onSubmit={e=>{e.preventDefault();void run(async()=>{const next=await createChallenge(data,{title:name.trim(),unit:unit.trim(),starts:start,ends:end,anonymous,exercises:selectedExercises,instructions,badge_key:badge||null});setId(next);setBoard([]);setHistory([]);setName("");setExercises([]);setPick("");setBadge("");setInstructions("");setNote("Utfordring opprettet.");});}}>
      <div className="field-pair"><label>Navn på utfordringen<input required maxLength={100} placeholder="Pushup challenge" value={name} onChange={e=>setName(e.target.value)}/></label><label>Enhet<input required maxLength={24} value={unit} onChange={e=>setUnit(e.target.value)}/></label></div>
      <fieldset className="challenge-exercises"><legend>Øvelser som teller</legend><div className="day-strip"><label>Bibliotek eller egen øvelse<input list="challenge-exercise-options" maxLength={100} value={pick} onChange={e=>setPick(e.target.value)} placeholder="Søk etter en vanlig øvelse"/></label><datalist id="challenge-exercise-options">{library.map(n=><option key={n} value={n}/>)}</datalist>
        <button type="button" className="btn" disabled={!pick.trim()||selectedExercises.length>=12||selectedExercises.some(x=>x.toLowerCase()===pick.trim().toLowerCase())} onClick={()=>{setExercises([...selectedExercises,pick.trim()]);setPick("");}}><Plus size={16}/>Legg til øvelse</button></div>
        {selectedExercises.map(x=><div className="challenge-ex-row" key={x}><span>{x}</span><button type="button" className="btn" aria-label={"Fjern "+x} title={"Fjern "+x} onClick={()=>setExercises(selectedExercises.filter(n=>n!==x))}><X size={15}/></button></div>)}
        {!selectedExercises.length&&<small>Uten valgte øvelser registrerer utøveren bare antallet.</small>}</fieldset>
      <label>Instruks til utøverne<textarea rows={3} maxLength={1500} value={instructions} placeholder="F.eks. tell hver fullførte armheving. Registrer etter hvert sett." onChange={e=>setInstructions(e.target.value)}/></label>
      <label>Utviklingsmerke (valgfritt)<select value={badge} onChange={e=>setBadge(e.target.value)}><option value="">Ingen kobling</option>{catalog.filter(b=>["precision_builder","one_more_rep","footwork_wizard","mission_complete","game_iq","body_guardian"].includes(b.key)).map(b=><option key={b.key} value={b.key}>{b.title}</option>)}</select></label>
      <div className="field-pair"><label>Startdato<input required type="date" min={today()} value={start} onChange={e=>{setStart(e.target.value);if(e.target.value)setEnd(trainingDay(e.target.value,13));}}/></label><label>Sluttdato (inkludert)<input required type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
      <label>Resultatliste<select value={anonymous?"anonymous":"named"} onChange={e=>setAnon(e.target.value==="anonymous")}><option value="anonymous">Anonym · bare egen rad er gjenkjennelig</option><option value="named">Vis navn til laget</option></select></label><small>{anonymous?"Alle deltakere ser sin plass og poengsum. Egen rad heter «Du»; andre vises med et alias.":"Deltakerne ser navn, plass og poengsum for de andre på laget."}</small><button className="btn primary" disabled={busy||!!pick.trim()}><Plus size={16}/>Publiser utfordring</button>
    </form></details>}
    {all.length>0?<label>Velg utfordring<select value={current?.id||""} onChange={e=>{setId(e.target.value);setExercise("");setHistory([]);setAmount("");entry.current="";setBoard([]);setNote("");}}>{all.map(c=><option key={c.id} value={c.id}>{c.title} · {phase(c)}</option>)}</select></label>:<p className="muted">Ingen utfordringer ennå.</p>}
    {current&&<><div className="challenge-head"><div><h3>{current.title}</h3><small>{current.starts} – {current.ends}</small></div><span className="badge blue">{phase(current)}</span></div>
      {current.instructions&&<div className="challenge-instruction"><strong>Trenerens instruks</strong><p>{current.instructions}</p></div>}
      {coach&&<div className="challenge-instruction"><strong>Slik registrerer utøverne</strong><p>Åpne Utfordringer → {current.title}. {current.exercises?.length?"Velg "+current.exercises.join(" eller ")+". ":""}Skriv antall {current.unit} i settet og trykk «Registrer sett». Resultatlisten summerer alle registreringer i perioden.</p></div>}
      {!coach&&phase(current)==="Aktiv"&&<form className="challenge-log" onSubmit={e=>{e.preventDefault();void run(async()=>{entry.current||=crypto.randomUUID();await logSet(data,current,Number(amount),entry.current,exercise||current.exercises?.[0]);entry.current="";setAmount("");setBoard(await scoreboard(data,current));setHistory(await mySets(data,current));setNote("Sett registrert: "+amount+" "+current.unit+".");});}}>
        {!!current.exercises?.length&&<label>Øvelse<select value={exercise||current.exercises[0]} onChange={e=>{setExercise(e.target.value);entry.current="";}}>{current.exercises.map(n=><option key={n}>{n}</option>)}</select></label>}
        <label>{current.unit} i dette settet<input type="number" inputMode="numeric" min={1} max={100000} step={1} required value={amount} onChange={e=>{entry.current="";setAmount(e.target.value);}}/></label>
        <button disabled={busy||!amount} className="btn primary"><Plus size={16}/>Registrer sett</button></form>}
      {!coach&&(current.exercises?.length?current.exercises.map((name,i)=><AssignedRating key={current.id+":"+i} data={data} kind="challenge" activity={current.id} item={String(i)} caption={name}/>):<AssignedRating data={data} kind="challenge" activity={current.id} item="activity" caption={current.title}/>)}
      {!coach&&<details className="library-tools" open><summary>Mine registreringer · {board.find(x=>x.mine)?.total||0} {current.unit}</summary>{history.length?history.map(h=><div className="challenge-ex-row" key={h.entry}><span>{h.logged_at?new Date(h.logged_at).toLocaleString("nb-NO",{timeZone:"Europe/Oslo",dateStyle:"short",timeStyle:"short"}):""} · {h.exercise||current.title}</span><strong>{h.amount} {current.unit}</strong></div>):<p>Ingen egne sett registrert.</p>}</details>}
      <header className="feature-heading"><h3>Resultatliste</h3><small>{current.anonymous?<><ShieldCheck size={14}/> Anonym</>:"Synlig for laget"}</small></header>
      {!coach&&<small>{board.some(r=>r.mine)?"Din plass: "+board.find(r=>r.mine)!.place+" av "+board.length:"Din plass vises etter ditt første sett."}</small>}
      {board.length?<table className="table score-table"><thead><tr><th>Plass</th><th>Spiller</th><th>{current.unit}</th></tr></thead><tbody>{board.map(r=><tr key={r.label+":"+r.place+":"+r.total} className={r.mine?"my-score":""}><td>{r.place}</td><th>{r.label}</th><td>{r.total}</td></tr>)}</tbody></table>:<p className="muted">Ingen sett registrert.</p>}</>}
    {note&&<p role="status" className="km-status">{note}</p>}</section>;
}
