import {FeatureInfo} from "./feature-info";
import {useEffect,useState} from "react";
import {sendTeamMessage,teamDirectory,thread,type Snapshot,type TeamMessage,type Teammate} from "@/lib/beta";
export function AthleteTeam({data}:{data:Snapshot}){
  const [people,setPeople]=useState<Teammate[]>([]),[error,setError]=useState("");
  useEffect(()=>{let active=true;teamDirectory(data.me.squad).then(list=>{if(active)setPeople(list);}).catch(e=>{if(active)setError(e.message);});return ()=>{active=false;};},[data.me.squad]);
  return <section className="panel panel-pad grid"><h2>{data.teams.find(t=>t.id===data.me.squad)?.name}</h2>{people.map(p=><div className="result" key={p.id}>{p.photo&&<img width={36} height={36} src={p.photo} alt=""/>}<strong>{p.name}</strong><span>{p.playing_position||p.role}</span></div>)}{error&&<p>{error}</p>}</section>;
}
export function Conversation({data}:{data:Snapshot}){
  const coach=data.me.role==="coach";
  const players=data.roster.filter(m=>m.role==="athlete");
  const [selected,setSelected]=useState(coach?players[0]?.id||"":data.me.id);
  const athlete=coach?(players.find(p=>p.id===selected)?.id||players[0]?.id):data.me.id;
  const [rows,setRows]=useState<TeamMessage[]>([]),[body,setBody]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{if(!athlete)return;let active=true;const update=()=>thread(data.me.squad,athlete).then(list=>{if(active)setRows(list);}).catch(e=>{if(active)setError(e.message);});
    void update();window.addEventListener("storage",update);const id=setInterval(update,10000);return ()=>{active=false;clearInterval(id);window.removeEventListener("storage",update);};},[athlete,data.me.squad,revision]);
  return <section className="panel panel-pad grid"><FeatureInfo topic="chat"><h2>{coach?"Athlete conversations":"Message coaching staff"}</h2></FeatureInfo>{coach&&<label>Conversation with<select value={athlete||""} onChange={e=>{setSelected(e.target.value);setBody("");}}>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    {rows.filter(r=>r.athlete===athlete).map(m=><div className="result" key={m.id}><strong>{m.sender===data.me.id?"You":coach?data.roster.find(p=>p.id===m.sender)?.name||"Coach":"Coach"}</strong><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{m.body}</p></div>)}
    <form className="grid" onSubmit={async e=>{e.preventDefault();if(!athlete||!body.trim()||busy)return;setBusy(true);try{await sendTeamMessage(data.me,athlete,body.trim());setBody("");setRevision(r=>r+1);setError("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label>Message<textarea maxLength={2000} required value={body} onChange={e=>setBody(e.target.value)}/></label><button className="btn primary" disabled={!athlete||busy||!body.trim()}>Send message</button></form>{error&&<p role="alert">{error}</p>}</section>;
}
