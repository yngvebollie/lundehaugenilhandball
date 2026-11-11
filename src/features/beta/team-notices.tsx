import {FeatureInfo} from "./feature-info";
import { useState } from "react";
import { Bell, CheckCheck, Send } from "lucide-react";
import { acceptNotice, postNotices, today, type Notice, type Snapshot } from "@/lib/beta";
import { monday, weekLabel } from "@/lib/workload";
import { focuses } from "@/lib/focus";
import type { Run } from "./program-builder";

const period=(n:Notice)=>n.cadence==="Weekly"?weekLabel(n.starts_on):n.starts_on;
const timestamp=(s:string)=>new Intl.DateTimeFormat("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Oslo"}).format(new Date(s));
function ordered(rows:Notice[]){return [...rows].sort((a,b)=>b.starts_on.localeCompare(a.starts_on)||b.posted_at.localeCompare(a.posted_at));}
type Props={data:Snapshot;run:Run;busy:boolean};
export function CoachNotices({data,run,busy}:Props){
  const players=data.roster.filter(p=>p.role==="athlete");
  const [cadence,setCadence]=useState<Notice["cadence"]>("Daily"),[date,setDate]=useState(today);
  const [scope,setScope]=useState("team"),[selected,setSelected]=useState<string[]>([]),[body,setBody]=useState(""),[note,setNote]=useState("");
  const recipients=players.filter(p=>scope==="team"||(scope==="selected"?selected.includes(p.id):data.focusMembers.some(r=>r.focus===scope&&r.athlete===p.id)));
  const groups=new Map<string,Notice[]>();
  for(const n of ordered(data.notices))groups.set(n.batch,[...(groups.get(n.batch)||[]),n]);
  return <details className="panel panel-pad grid" id="notices"><summary><Bell size={18}/> Team notices &amp; read receipts</summary><div className="grid">
    <form className="grid" onSubmit={async e=>{e.preventDefault();setNote("");if(await run(()=>postNotices(data,recipients.map(p=>p.id),cadence,cadence==="Weekly"?monday(date):date,body))){setBody("");setNote("Notice posted for "+recipients.length+" athlete(s).");}}}>
      <div className="field-pair"><label>Notice period<select value={cadence} onChange={e=>setCadence(e.target.value as Notice["cadence"])}><option>Daily</option><option>Weekly</option></select></label><label>{cadence==="Daily"?"Notice date":"Week containing"}<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      {cadence==="Weekly"&&date&&<p>{weekLabel(date)}</p>}
      <label>Notice recipients<select value={scope} onChange={e=>setScope(e.target.value)}><option value="team">Entire team</option><option value="selected">Selected athletes</option>{focuses.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select></label>
      {scope==="selected"&&<fieldset className="notice-people"><legend>Select athletes</legend>{players.map(p=><label key={p.id}><input type="checkbox" checked={selected.includes(p.id)} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/>{p.name}</label>)}</fieldset>}
      <label>Message for athletes<textarea required maxLength={2000} rows={3} value={body} onChange={e=>setBody(e.target.value)}/></label>
      <button className="btn primary" disabled={busy||!recipients.length||!body.trim()||!date}><Send size={16}/>Post to {recipients.length} athlete(s)</button>
      {!players.length&&<a href="/team">Invite athletes to post your first notice</a>}{note&&<p role="status">{note}</p>}
    </form>
    {[...groups].map(([id,rows])=><details key={id} className="library-tools"><summary>{rows[0].cadence} · {period(rows[0])} · {rows.filter(n=>n.read_at).length}/{rows.length} read</summary><p className="notice-body">{rows[0].body}</p>{rows.map(n=><div className="result" key={n.id}><strong>{players.find(p=>p.id===n.athlete)?.name||"Athlete"}</strong><span>{n.read_at?"Read "+timestamp(n.read_at):"Awaiting acceptance"}</span></div>)}</details>)}
  </div></details>;
}
export function AthleteNotices({data,run,busy}:Props){
  const rows=ordered(data.notices);
  return <section className="panel panel-pad grid"><FeatureInfo topic="notice"><h2><Bell/> Team notices</h2></FeatureInfo>
    {!rows.length&&<p className="muted">No team notices yet.</p>}
    {rows.filter(n=>!n.read_at).map(n=><article className="notice-entry" key={n.id}><strong>{n.cadence} · {period(n)}</strong><p className="notice-body">{n.body}</p><button className="btn primary" disabled={busy} onClick={()=>void run(()=>acceptNotice(n.id))}><CheckCheck size={16}/>Accept · I've read it</button></article>)}
    {rows.some(n=>n.read_at)&&<details className="library-tools"><summary>Accepted notices ({rows.filter(n=>n.read_at).length})</summary>{rows.filter(n=>n.read_at).map(n=><article key={n.id} className="notice-entry"><strong>{period(n)}</strong><p className="notice-body">{n.body}</p><small>Accepted {timestamp(n.read_at!)}</small></article>)}</details>}
  </section>;
}
