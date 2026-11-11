import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {admissions,applications,teamVisibility,type Snapshot,type Application} from "@/lib/beta";
import type {Run} from "./program-builder";
export function TeamEntry({data,run,busy}:{data:Snapshot;run:Run;busy:boolean}){
  const team=data.teams.find(t=>t.id===data.me.squad)!;
  const [list,setList]=useState<Application[]>([]),[error,setError]=useState("");
  useEffect(()=>{let active=true;const update=()=>applications(team.id).then(a=>{if(active)setList(a);}).catch(e=>{if(active)setError(e.message);});
    void update();window.addEventListener("focus",update);window.addEventListener("storage",update);const timer=setInterval(update,15000);return ()=>{active=false;clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",update);};},[team.id]);
  return <div className="grid"><label className="exercise-row"><input type="checkbox" checked={Boolean(team.discoverable)} disabled={busy} onChange={e=>{const checked=e.target.checked;void run(()=>teamVisibility(team,checked));}}/>List team for athlete applications</label>
    <h3>Pending applications</h3><FeatureInfo topic="team"/>{!list.some(a=>a.status==="Pending")&&<small>No pending applications.</small>}
    {list.filter(a=>a.status==="Pending").map(a=><div className="result" key={a.person}><div><strong>{a.name} · {a.role||"athlete"}</strong>{a.email&&<p>{a.email}</p>}{a.phone&&<p>{a.phone}</p>}</div><div className="day-strip">{a.role==="coach"&&!data.admins.includes(data.me.id)?<small>Admin coach approval required</small>:["Approved","Declined"].map(value=><button className="btn" disabled={busy} key={value} onClick={()=>run(async()=>{await admissions("review",{target:team.id,applicant:a.person,value});setList(await applications(team.id));})}>{value==="Approved"?"Approve":"Decline"}</button>)}</div></div>)}{error&&<p role="alert">{error}</p>}</div>;
}
