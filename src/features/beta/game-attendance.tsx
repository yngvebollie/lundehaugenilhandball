import {useEffect,useState} from "react";
import {declines,recordDecline} from "@/lib/game-attendance";
import type {Snapshot} from "@/lib/beta";
export function Attendance({data,match,played,names}:{data:Snapshot;match:string;played:Set<string>;names:string[]}){
 const [ids,I]=useState<string[]>([]),[choice,C]=useState(""),[busy,B]=useState(false),[error,E]=useState("");
 const team=data.me.squad,roster=data.roster.filter(p=>p.role==="athlete"&&p.squad===team);
 useEffect(()=>{let live=true;declines(team).then(r=>{if(live)I(r.filter(v=>v.match_id===match).map(v=>v.athlete));}).catch(e=>{if(live)E(e.message);});return()=>{live=false};},[team,match]);
 async function apply(id:string,add:boolean){B(true);E("");try{await recordDecline(team,match,id,add);I(old=>add?[...old,id]:old.filter(x=>x!==id));C("");}catch(e){E((e as Error).message);}finally{B(false);}}
 return <section className="grid"><h3>Kampoppmøte</h3><div className="agenda-columns"><section><h4>Spilte · {names.length}</h4>{names.length?<ul>{names.map((n,i)=><li key={i}>{n}</li>)}</ul>:<small>Ingen bekreftede deltakere.</small>}</section><section><h4>Takket nei · {ids.filter(id=>!played.has(id)).length}</h4>{ids.map(id=><div className="day-strip" key={id}>{roster.find(p=>p.id===id)?.name||"Tidligere spiller"}{played.has(id)&&" · Registrert som spilt, avslaget telles ikke"}<button className="btn" disabled={busy} onClick={()=>apply(id,false)}>Angre avslag</button></div>)}</section></div>
 <form className="day-strip" onSubmit={e=>{e.preventDefault();if(choice)void apply(choice,true);}}><label>Invitert spiller som takket nei<select value={choice} onChange={e=>C(e.target.value)}><option value="">Velg fra troppen</option>{roster.filter(p=>!played.has(p.id)&&!ids.includes(p.id)).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><button className="btn" disabled={!choice||busy}>Registrer avslag</button></form>{error&&<p role="alert">{error}</p>}</section>;
}
