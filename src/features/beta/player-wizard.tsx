import {useEffect,useRef,useState,type ReactNode} from "react";
import {Check,ChevronLeft,ChevronRight} from "lucide-react";
import {demo,type Snapshot} from "@/lib/beta";
import {playerWizard,positionBoard,positions,physical,skills,type Wishes,type BoardPlayer} from "@/lib/athlete-wizard";
import {legacyNames} from "./athlete-name";
import "./player-wizard.css";

function Kit({number}:{number:string}){return <svg className="pw-kit" viewBox="0 0 140 192" role="img" aria-label={"Hotpink drakt "+number+" med svart shorts"}><path fill="#ff1493" d="M41 12 56 7q14 13 28 0l15 5 30 20-14 29-16-9 3 62q-32 7-64 0l3-62-16 9-14-29z"/><path fill="none" stroke="white" strokeWidth="4" d="M56 9q14 18 28 0M14 51l11 5M115 56l11-5"/><text x="70" y="83" textAnchor="middle" fontSize={number.length>2?34:43} fontWeight="800" fill="white">{number||"–"}</text><path fill="#171719" d="M39 121h62l9 56-35 5-5-28-5 28-35-5z"/><path stroke="#ddd" fill="none" strokeWidth="2" d="M42 129l-7 43m64-43 7 43"/></svg>;}
function Court({render}:{render:(id:string,label:string)=>ReactNode}){return <div className="pw-court"><svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="currentColor" strokeWidth=".65" fill="none"><path d="M17 100C17 72 30 65 42 65H58C70 65 83 72 83 100"/><path strokeDasharray="2 2" d="M3 100C3 56 22 49 40 49H60C78 49 97 56 97 100"/><path d="M42 100V97H58V100"/></g></svg>{Object.entries(positions).map(([id,label])=><div className={"pw-zone "+id} key={id}>{render(id,label)}</div>)}</div>;}
export function CoachPositions({data}:{data:Snapshot}){
 const [rows,S]=useState<BoardPlayer[]>(),[err,E]=useState(""),[retry,R]=useState(0);
 useEffect(()=>{let alive=true;positionBoard(data).then(x=>{if(alive){S(x);E("");}}).catch(e=>{if(alive)E(e.message);});return()=>{alive=false;};},[data,retry]);
 return <section className="panel panel-pad grid" id="posisjoner"><header><h2>Posisjonsønsker</h2><small>Spillernes egne ønsker, ikke et laguttak.</small></header>{err?<p role="alert">{err} <button className="btn" onClick={()=>R(retry+1)}>Prøv igjen</button></p>:!rows?<p role="status">Henter spillere …</p>:<><Court render={(id,label)=><><strong>{label}</strong>{rows.filter(p=>p.positions.includes(id)).map(p=><span key={p.id}>{p.shirt&&"#"+p.shirt+" "}{p.name}</span>)}</>}/>{rows.some(p=>!p.positions.length)&&<small>Uten posisjonsønske: {rows.filter(p=>!p.positions.length).map(p=>p.name).join(", ")}</small>}</>}</section>;
}
const titles=["Din spillerprofil","Når har du skolegym?","Hva vil du bli bedre på?","Hva vil du utvikle fysisk?","Hvor spiller du?"];
const toggle=<T,>(list:T[],item:T)=>list.includes(item)?list.filter(x=>x!==item):[...list,item];
function Form({initial,onDone,onCancel}:{initial:Wishes;onDone:(v:Wishes)=>Promise<void>;onCancel:()=>void}){
 const [v,V]=useState(initial),[step,S]=useState(0),[custom,C]=useState(![45,90].includes(initial.minutes)),[busy,B]=useState(false),[err,E]=useState("");
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
 function field<K extends keyof Wishes>(key:K,val:Wishes[K]){V(x=>({...x,[key]:val}));E("");}
 const select=(k:"skills"|"physical"|"positions",id:string,label:string)=><button type="button" className="btn" key={id} aria-pressed={v[k].includes(id)} onClick={()=>field(k,toggle(v[k],id))}>{label}</button>;
 async function next(){
  if(step===0&&(!v.given.trim()||!v.family.trim()||v.given.trim().length+v.family.trim().length>99||!!v.shirt&&!/^[1-9][0-9]{0,2}$/.test(v.shirt))){E("Oppgi fornavn og etternavn. Draktnummer kan være tomt eller fra 1 til 999.");return;}
  if(step===1&&v.days.length&&(!Number.isInteger(v.minutes)||v.minutes<1||v.minutes>600)){E("Velg mellom 1 og 600 minutter.");return;}
  if(step<4){S(step+1);return;}B(true);E("");try{await onDone({...v,given:v.given.trim(),family:v.family.trim(),minutes:v.days.length?v.minutes:45});}catch(x){E((x as Error).message);}finally{B(false);}
 }
 return <section className="pw-form panel panel-pad grid"><header><small>Min profil · Steg {step+1} av 5</small><progress value={step+1} max={5} aria-label="Profilsteg"/><h1 tabIndex={-1} ref={heading}>{titles[step]}</h1></header>
 {step===0?<div className="pw-profile"><Kit number={v.shirt}/><div className="grid"><label>Fornavn<input autoComplete="given-name" value={v.given} onChange={e=>field("given",e.target.value)}/></label><label>Etternavn<input autoComplete="family-name" value={v.family} onChange={e=>field("family",e.target.value)}/></label><label>{v.email?.startsWith("+")?"Telefonnummer for innlogging":"E-post for innlogging"}<input type="text" value={v.email||""} readOnly/></label><label>Draktnummer<input inputMode="numeric" maxLength={3} value={v.shirt} onChange={e=>field("shirt",e.target.value.replace(/\D/g,""))}/></label></div></div>:
 step===1?<><p>Velg dagene som gjentar seg hver uke, eller gå videre uten skolegym.</p><div className="pw-options">{["Man","Tir","Ons","Tor","Fre"].map((x,i)=><button key={x} className="btn" aria-pressed={v.days.includes(i+1)} onClick={()=>field("days",toggle(v.days,i+1).sort())}>{x}</button>)}</div><strong>Varighet per gang</strong><div className="pw-options">{[45,90].map(n=><button key={n} className="btn" aria-pressed={!custom&&n===v.minutes} onClick={()=>{C(false);field("minutes",n);}}>{n} min</button>)}<button className="btn" aria-pressed={custom} onClick={()=>C(true)}>Egen tid</button></div>{custom&&<label>Antall minutter<input type="number" min="1" max="600" value={v.minutes||""} onChange={e=>field("minutes",Number(e.target.value))}/></label>}</>:
 step===2||step===3?<><p>Velg ett eller flere områder.</p><div className="pw-options">{Object.entries(step===2?skills:physical).map(([id,label])=>select(step===2?"skills":"physical",id,label))}</div></>:
 <><p>Velg en eller flere</p><Court render={(id,label)=>select("positions",id,label)}/></>}
 {err&&<p role="alert">{err}</p>}<footer><div className="pw-options">{step>0&&<button className="btn" disabled={busy} onClick={()=>{S(step-1);E("");}}><ChevronLeft size={16}/>Tilbake</button>}<button className="btn primary" disabled={busy} onClick={next}>{busy?"Lagrer …":step===4?"Fullfør":"Neste"}{step===4?<Check size={16}/>:<ChevronRight size={16}/>}</button></div><small>Valgene kan endres i Min profil.</small>{initial.completed&&<button className="btn" disabled={busy} onClick={onCancel}>Avbryt endringer</button>}</footer></section>;
}
export function WizardGate({data,reload,children}:{data:Snapshot;reload:()=>Promise<void>;children:ReactNode}){
 const [open,O]=useState(false),[p,P]=useState<Wishes>(),[err,E]=useState(""),[retry,R]=useState(0),[msg,M]=useState("");
 const context=useRef(data);context.current=data;
 useEffect(()=>{let active=true;const d=context.current;playerWizard(d).then(raw=>{if(!active)return;const names=legacyNames(raw.name||d.me.name);P({...raw,given:raw.given||names.given,family:raw.family||names.family});E("");const param=new URLSearchParams(location.search).get("profil");O(param==="rediger"||!raw.completed&&(!demo||!["liv","ida"].includes(d.me.id)||param==="ny"));}).catch(e=>{if(active)E(e.message);});return()=>{active=false;};},[data.me.id,data.me.squad,retry]);
 function close(){O(false);if(new URLSearchParams(location.search).has("profil"))history.replaceState(null,"",location.pathname);}
 if(err)return <p role="alert">{err} <button className="btn" onClick={()=>R(retry+1)}>Prøv igjen</button></p>;
 if(!p)return <p role="status">Henter spillerprofil …</p>;
 if(open)return <Form initial={p} onCancel={close} onDone={async v=>{const result=await playerWizard(data,v);P(result);await reload();M("Spillerprofilen din er lagret.");close();}}/>;
 return <>{msg&&<p role="status">{msg}</p>}{children}</>;
}
