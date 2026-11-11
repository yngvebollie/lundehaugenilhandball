import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {today,type Snapshot} from "@/lib/beta";
import {createMatch,matches,outcomes,saveShot,shots,undoShot,type Match,type Outcome,type Shot} from "@/lib/matches";
type Point={x:number;y:number};
function Surface({goal,point,onPick,marks}:{goal?:boolean;point:Point|null;onPick:(p:Point)=>void;marks:Point[]}){
  const label=goal?"Goal target":"Shot origin";
  return <div><h3>{label}</h3><svg viewBox="0 0 300 180" className="pad-surface" tabIndex={0} role="button" aria-label={label+" map. Tap or use arrow keys to position."} onKeyDown={e=>{
    if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"," "].includes(e.key))return;e.preventDefault();
    onPick({x:Math.min(100,Math.max(0,(point?.x??50)+(e.key==="ArrowLeft"?-5:e.key==="ArrowRight"?5:0))),y:Math.min(100,Math.max(0,(point?.y??50)+(e.key==="ArrowUp"?-5:e.key==="ArrowDown"?5:0)))});
  }} onPointerDown={e=>{const box=e.currentTarget.getBoundingClientRect();onPick({x:Math.max(0,Math.min(100,Math.round((e.clientX-box.left)*100/box.width))),y:Math.max(0,Math.min(100,Math.round((e.clientY-box.top)*100/box.height)))});}}>
    <rect width="300" height="180" fill={goal?"#253c49":"#165664"}/>
    {goal?<g stroke="#b0c7cf" fill="none">{Array.from({length:11},(_,i)=><path key={i} d={`M${i*30} 0v180`}/>)}{Array.from({length:7},(_,i)=><path key={i} d={`M0 ${i*30}h300`}/>)}<rect x="3" y="3" width="294" height="174" strokeWidth="5"/></g>:<g stroke="#ecf1e8" strokeWidth="2" fill="none"><path fill="#264955" d="M48 0Q60 62 128 65H172Q240 62 252 0Z"/><path strokeDasharray="7 6" d="M12 0Q30 98 125 100H175Q270 98 288 0"/><path d="M138 74h24M125 3h50" strokeWidth="4"/><path d="M0 175h300"/></g>}
    {marks.map((p,i)=><circle key={i} cx={p.x*3} cy={p.y*1.8} r="4" fill="#f2ede1" opacity=".65"/>)}{point&&<circle cx={point.x*3} cy={point.y*1.8} r="7" fill="#ffcd00" stroke="#191919" strokeWidth="2"/>}
  </svg><small>{point?`${point.x}% across · ${point.y}% down`:"Tap a location"}</small></div>;
}
export function MatchPad({data}:{data:Snapshot}){
  const athletes=data.roster.filter(m=>m.role==="athlete");
  const [all,setAll]=useState<Match[]>([]),[chosen,setChosen]=useState(""),[revision,setRevision]=useState(0);
  const [title,setTitle]=useState(""),[date,setDate]=useState(today),[lineup,setLineup]=useState<string[]>([]);
  const [events,setEvents]=useState<Shot[]>([]),[shooter,setShooter]=useState(""),[assist,setAssist]=useState("");
  const [outcome,setOutcome]=useState<Outcome>("Goal"),[origin,setOrigin]=useState<Point|null>(null),[target,setTarget]=useState<Point|null>(null);
  const [busy,setBusy]=useState(false),[note,setNote]=useState(""),[eventId,setEventId]=useState(()=>crypto.randomUUID());
  const match=all.find(m=>m.id===chosen);
  const list=events.filter(s=>s.match_id===chosen);
  const player=(id:string)=>athletes.find(p=>p.id===id)?.name||"Former player";
  useEffect(()=>{let active=true;const load=async()=>{try{const m=await matches(data.me.squad);const e=chosen?await shots(chosen):[];if(active){setAll(m);setEvents(e);}}catch(err){if(active)setNote((err as Error).message);}};void load();const id=setInterval(load,15000);window.addEventListener("storage",load);return ()=>{active=false;clearInterval(id);window.removeEventListener("storage",load);};},[chosen,revision,data.me.squad]);
  function select(id:string){setChosen(id);setShooter("");setAssist("");setTarget(null);setOrigin(null);setEventId(crypto.randomUUID());setNote("");}
  async function run(fn:()=>Promise<void>){setBusy(true);try{await fn();setRevision(n=>n+1);}catch(e){setNote((e as Error).message);}finally{setBusy(false);}}
  const onGoal=outcome==="Goal"||outcome==="Saved";
  return <section className="panel panel-pad grid match-pad"><div className="feature-heading"><h2>Match recorder</h2><FeatureInfo topic="live"/><span className="badge orange">Pad mode</span></div>
    <label>Match<select disabled={busy} value={chosen} onChange={e=>select(e.target.value)}><option value="">Set up a match</option>{all.map(m=><option key={m.id} value={m.id}>{m.day} · {m.opponent}</option>)}</select></label>
    {!match?<form className="grid" onSubmit={e=>{e.preventDefault();void run(async()=>{const m={id:crypto.randomUUID(),team:data.me.squad,opponent:title.trim(),day:date,lineup};await createMatch(m);setAll([...all,m]);select(m.id);setNote("Lineup ready.");});}}>
    <div className="field-pair"><label>Opponent<input required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Match date<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    <fieldset><legend>Match lineup</legend>{athletes.map(p=><label className="exercise-row" key={p.id}><input type="checkbox" checked={lineup.includes(p.id)} onChange={e=>setLineup(e.target.checked?[...lineup,p.id]:lineup.filter(id=>id!==p.id))}/>{p.name}</label>)}</fieldset>
    <button className="btn primary" disabled={!title.trim()||!lineup.length||busy}>Start match recorder</button></form>:<>
    <header><p className="eyeline">{match.day} · Against {match.opponent}</p><h2>{list.filter(e=>e.outcome==="Goal").length} goals · {list.length} attempts</h2><p className="muted">{list.filter(s=>s.outcome==="Goal"||s.outcome==="Saved").length} on goal</p></header>
    <fieldset disabled={busy} className="grid pad-controls"><legend>Record attempt</legend><div className="field-pair"><label>Shooter<select value={shooter} onChange={e=>{setShooter(e.target.value);if(assist===e.target.value)setAssist("");}}><option value="">Choose player</option>{match.lineup.map(id=><option key={id} value={id}>{player(id)}</option>)}</select></label>{outcome==="Goal"&&<label>Assist<select value={assist} onChange={e=>setAssist(e.target.value)}><option value="">Unassisted</option>{match.lineup.filter(id=>id!==shooter).map(id=><option key={id} value={id}>{player(id)}</option>)}</select></label>}</div>
    <div className="day-strip">{outcomes.map(o=><button className={"btn "+(outcome===o?"selected":"")} aria-pressed={outcome===o} onClick={()=>setOutcome(o)} key={o}>{o}</button>)}</div>
    <div className="pad-maps"><Surface point={origin} marks={list.map(s=>({x:s.x,y:s.y}))} onPick={setOrigin}/>{onGoal&&<Surface goal point={target} marks={list.filter(s=>s.gx!=null&&s.gy!=null).map(s=>({x:s.gx!,y:s.gy!}))} onPick={setTarget}/>}</div>
    <button className="btn primary" disabled={!shooter||!origin||(onGoal&&!target)||busy} onClick={()=>run(async()=>{
      if(!origin)return;await saveShot({id:eventId,match_id:match.id,shooter,assist:outcome==="Goal"&&assist?assist:null,outcome,x:origin.x,y:origin.y,gx:onGoal?target!.x:null,gy:onGoal?target!.y:null});
      setEventId(crypto.randomUUID());setOrigin(null);setTarget(null);setAssist("");setNote(outcome+" recorded for "+player(shooter)+".");
    })}>Record {outcome.toLowerCase()}</button></fieldset>
    <div className="monitor-table"><table className="table"><thead><tr>{["Player","Attempts","On goal","Goals","Assists"].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{match.lineup.map(id=>{const own=list.filter(s=>s.shooter===id);return <tr key={id}><th>{player(id)}</th><td>{own.length}</td><td>{own.filter(s=>["Goal","Saved"].includes(s.outcome)).length}</td><td>{own.filter(s=>s.outcome==="Goal").length}</td><td>{list.filter(s=>s.assist===id).length}</td></tr>;})}</tbody></table></div>
    <details><summary>Shot log ({list.length})</summary>{[...list].reverse().map(s=><p key={s.id}>{s.outcome} · {player(s.shooter)}{s.assist?" · assist "+player(s.assist):""} · court {s.x},{s.y}{s.gx!=null?" · goal "+s.gx+","+s.gy:""}</p>)}</details>
    {list.length>0&&<button className="btn" disabled={busy} onClick={()=>run(async()=>{await undoShot(list[list.length-1].id);setNote("Last attempt removed.");})}>Undo last attempt</button>}</>}
    {note&&<p role="status">{note}</p>}</section>;
}
