import {useEffect,useState} from "react";
import {ClipboardPaste,Download,FileText,Save,Upload} from "lucide-react";
import {db,demo,type Snapshot} from "@/lib/beta";
import type {Fixture} from "@/lib/match-journal";
import {parsePaste,validateReport,type Report,type ReportPlayer,type ReportMatch} from "@/lib/report-text";

type Saved={digest:string;original:Report;reviewed:Report;revision:number};
const digestText=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,"0")).join("");
const numbers=["goals","penalty","total","suspensions"] as const;
const props={goals:"Spillemål",penalty:"7 m",total:"Totalt",suspensions:"2 min"};
const marks={played:"Deltatt",disqualification:"Diskvalifikasjon"};
function privatePath(g:Fixture,digest:string){return g.team+"/"+g.id+"/"+digest+".pdf";}
export function ReportEditor({game:g,data,onSaved}:{game:Fixture;data:Snapshot;onSaved:()=>Promise<void>}){
  const [text,setText]=useState(""),[draft,setDraft]=useState<Report>(),[orig,setOrig]=useState<Report>(),[saved,setSaved]=useState<Saved|null>(null);
  const [hash,setHash]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[editing,setEditing]=useState(false);
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[side,setSide]=useState<"A"|"B">("A");
  const [source,setSource]=useState<"paste"|"pdf">("paste"),[picked,pick]=useState(0);
  const key="kamper-private-report:"+g.team+":"+g.id;
  async function read(){const r=demo?JSON.parse(sessionStorage.getItem(key)||"null"):(await db!.rpc("beta_report",{action:"read",t:g.team,m:g.id}).throwOnError()).data;
    setSaved(r);setReady(true);return r as Saved|null;}
  useEffect(()=>{void read().catch(e=>setNote(e.message));},[g.id]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const act=async(fn:()=>Promise<void>)=>{setBusy(true);setNote("");try{await fn();}catch(e){setNote((e as Error).message);}finally{setBusy(false);}};
  function open(r:Report,source:Report,d:string){setDraft(structuredClone(r));setOrig(source);setHash(d);setEditing(true);setSide("A");pick(0);}
  function change(i:number,p:Partial<ReportPlayer>){if(draft)setDraft({...draft,players:draft.players.map((x,n)=>i===n?{...x,...p}:x)});}
  async function pdf(f:File){
    if(f.size>4_000_000)throw Error("Maksimalt 4 MB.");
    const token=(await db?.auth.getSession())?.data.session?.access_token;
    const res=await fetch("/api/matches/report?match="+encodeURIComponent(g.id),{method:"POST",body:f,headers:{"Content-Type":"application/pdf",...(token?{Authorization:"Bearer "+token}:{})}});
    const result=await res.json();if(!res.ok)throw Error(result.error);setFile(f);setPreview(URL.createObjectURL(f));open(result.report,result.report,result.digest);
  }
  async function save(){
    if(!draft||!orig||!ready)return;
    const issues=validateReport(draft,g.nif_id);if(issues.length)throw Error(issues.join(" "));
    if(g.nif_id!==orig.match.nif_id)throw Error("Originalrapporten tilhører en annen kamp.");
    if(!demo&&file){const result=await db!.storage.from("kamprapporter").upload(privatePath(g,hash),file,{contentType:"application/pdf",upsert:false});
      if(result.error&&!/duplicate|already exists/i.test(result.error.message))throw result.error;}
    if(demo){const latest=JSON.parse(sessionStorage.getItem(key)||"null");if((latest?.revision||0)!==(saved?.revision||0))throw Error("Last inn siste revisjon.");
      sessionStorage.setItem(key,JSON.stringify({digest:hash,reviewed:draft,original:orig,revision:(saved?.revision||0)+1}));}
    else await db!.rpc("beta_report",{action:"save",t:g.team,m:g.id,digest:hash,original:orig,reviewed:draft,expected:saved?.revision||0}).throwOnError();
    await read();await onSaved();setEditing(false);setText("");setFile(null);setNote("Rapport lagret. Du kan redigere den senere.");
  }
  const issues=draft?validateReport(draft,g.nif_id):[];
  const report=editing?draft:saved?.reviewed;
  const index=report?.players[picked]?.side===side?picked:(report?.players.findIndex(p=>p.side===side)??-1),player=report?.players[index];
  return <section className="grid review-work"><header className="feature-heading"><h3><FileText size={17}/> Kamprapport</h3>
    {g.nif_id&&<a href={"https://www.handball.no/system/kamper/kamprapport/?matchid="+g.nif_id} target="_blank" rel="noreferrer"><Download size={15}/> Åpne NHF-rapport</a>}</header>
    {saved&&<div className="day-strip"><small>Lagret · revisjon {saved.revision}</small><button className="btn" disabled={busy} onClick={()=>act(async()=>{const {downloadReport}=await import("@/lib/report-export");await downloadReport(saved.reviewed,saved.revision);setNote("PDF eksportert.");})}><Download size={16}/>Last ned PDF</button><button className="btn" onClick={()=>{setFile(null);open(saved.reviewed,saved.original,saved.digest);}}>Rediger lagret rapport</button>
      {!demo&&saved.original.method!=="paste"&&<button className="btn" onClick={()=>act(async()=>{const result=await db!.storage.from("kamprapporter").download(privatePath(g,saved.digest));if(result.error)throw result.error;setPreview(URL.createObjectURL(result.data));})}>Vis original PDF</button>}</div>}
    {preview&&<object data={preview} type="application/pdf" width="100%" height="340"><a href={preview} target="_blank" rel="noreferrer">Åpne privat forhåndsvisning</a></object>}
    {report&&<><div className="review-check"><span>Kilde: {report.method==="paste"?"innlimt NHF-rapport":"PDF"}</span><strong>{report.match.nif_id===g.nif_id?"✓ Kamp-ID stemmer":"Kontroller ResPIN"}</strong></div><details className="report-meta" open={editing&&!!saved||undefined}><summary>Kampinformasjon</summary><div className="km-fields">{(Object.keys(report.match) as (keyof ReportMatch)[]).map(k=><label key={k}>{{nif_id:"ResPIN",number:"Kampnummer",day:"Dato",time:"Klokkeslett",home:"Hjemmelag",away:"Bortelag",home_score:"Hjemmemål",away_score:"Bortemål",competition:"Turnering",venue:"Hall",half_home:"Pause hjemme",half_away:"Pause borte"}[k]}
      <input readOnly={!editing||k==="nif_id"} value={report.match[k]??""} onChange={e=>{const v=e.target.value;setDraft({...report,match:{...report.match,[k]:["home_score","away_score","half_home","half_away"].includes(k)?v===""?null:Number(v):v}});}}/></label>)}</div></details>
    <div className="day-strip">{(["A","B"] as const).map(s=><button className={"btn "+(s===side?"selected":"")} key={s} onClick={()=>setSide(s)}>{s==="A"?report.match.home:report.match.away} · {report.players.filter(p=>p.side===s).length} spillere</button>)}</div>
    <div className="review-layout"><div className="review-rows"><h3>{side==="A"?report.match.home:report.match.away} · Spillerlinjer</h3><div className="review-scroll"><table className="table"><thead><tr>{["Nr.","Deltatt","Spillemål","7 m","Totalt"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{report.players.map((p,i)=>p.side!==side?null:<tr key={i} className={i===index?"highlight":""} onClick={()=>pick(i)}><th><button type="button" aria-label={"Velg spiller "+p.shirt+" "+p.name} onClick={()=>pick(i)}>#{p.shirt} <small>{p.name}</small></button></th><td>{p.played===true?"✓":p.played===false?"Nei":"?"}</td><td>{p.goals??"?"}</td><td>{p.penalty??"?"}</td><td>{p.total??"?"}</td></tr>)}</tbody></table></div></div>
    {player&&<aside className="review-player"><h3>Spiller #{player.shirt}</h3><label>Navn<input readOnly={!editing} value={player.name} onChange={e=>change(index,{name:e.target.value})}/></label><label>Nr.<input readOnly={!editing} value={player.shirt} onChange={e=>change(index,{shirt:e.target.value})}/></label>
      {(Object.keys(marks) as (keyof typeof marks)[]).map(k=><label key={k}>{marks[k]}<select disabled={!editing} value={String(player[k])} onChange={e=>change(index,{[k]:e.target.value==="null"?null:e.target.value==="true"})}><option value="null">Ukjent</option><option value="false">Nei</option><option value="true">Ja</option></select></label>)}
      <label>Advarsler<select value={player.warning==null?"":String(Number(player.warning))} disabled={!editing} onChange={e=>change(index,{warning:e.target.value===""?null:Number(e.target.value)})}><option value="">Ukjent</option>{[0,1,2,3].map(n=><option key={n}>{n}</option>)}</select></label>
      {numbers.map(k=><label key={k}>{props[k]}<input type="number" readOnly={!editing} min={0} max={999} value={player[k]??""} onChange={e=>change(index,{[k]:e.target.value===""?null:Number(e.target.value)})}/></label>)}</aside>}
    </div><div className="report-totals">{(["A","B"] as const).map(s=><span key={s}>Lag {s}: <strong>{report.players.filter(p=>p.side===s).reduce((n,p)=>n+(p.total??0),0)} mål</strong></span>)}</div>
    {editing&&<>{[...report.issues,...issues].map((msg,i)=><small key={i}>{msg}</small>)}<div className="day-strip">
      <button disabled={!ready||busy||!!issues.length||orig?.match.nif_id!==g.nif_id} className="btn primary" onClick={()=>act(save)}><Save size={16}/>{saved?"Lagre rapportendringer":"Importer rapport"}</button>
      <button className="btn" onClick={()=>{setDraft({...report,players:[...report.players,{side,shirt:"",name:"",played:null,goals:0,penalty:0,total:0,warning:null,suspensions:0,disqualification:null}]});}}>Legg til rad</button>
      <button className="btn" onClick={()=>setEditing(false)}>Avbryt</button></div></>}</>}
    <details className="library-tools" key={saved?"replace":"initial"} open={!saved||undefined}><summary>{saved?"Importer ny kamprapport":"Importer kamprapport"}</summary><div className="grid">
    <div className="source-tabs"><strong>Kilde</strong><button className={"btn "+(source==="paste"?"selected":"")} onClick={()=>setSource("paste")}><ClipboardPaste size={16}/>Lim inn tekst</button><button className={"btn "+(source==="pdf"?"selected":"")} onClick={()=>setSource("pdf")}><Upload size={16}/>PDF</button></div>
    {source==="paste"&&<label>Lim inn NHF-kamprapport<textarea rows={4} maxLength={120000} placeholder="Kopier kamprapporten med tabellkolonnene …" value={text} onChange={e=>setText(e.target.value)}/></label>}
    <div className="day-strip">{source==="paste"?<button className="btn" disabled={!text.trim()||busy} onClick={()=>act(async()=>{const r=parsePaste(text);setFile(null);setPreview("");open(r,r,await digestText(text));setText("");})}><ClipboardPaste size={16}/>Les inn tekst</button>:
      <label className="btn"><Upload size={16}/>Last opp kamprapport<input type="file" accept="application/pdf" aria-label="Velg PDF" onChange={e=>{const f=e.target.files?.[0];if(f)void act(()=>pdf(f));e.target.value="";}}/></label>}</div>
</div></details>
    {note&&<p role="status">{note}</p>}</section>;
}
