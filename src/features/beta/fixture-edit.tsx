import {useState} from "react";
import {Pencil} from "lucide-react";
import {correctFixture,type Fixture} from "@/lib/match-journal";

export function FixtureEdit({game:g,reload}:{game:Fixture;reload:()=>Promise<void>}){
 const [open,O]=useState(false),[busy,B]=useState(false),[msg,M]=useState("");
 const source=g.fixture_source||g;
 async function save(p:Record<string,string>|null){B(true);M("");try{await correctFixture(g,p);await reload();O(false);M(p?"Kampendringen er lagret.":"Terminlistens verdier er gjenopprettet.");}catch(e){M((e as Error).message);}finally{B(false);}}
 return <section><div className="day-strip"><button type="button" className="btn" aria-expanded={open} onClick={()=>{O(!open);M("");}}><Pencil size={15}/>Rediger kamp</button>{g.fixture_override&&<small>Endret av trener · Terminlistens resultat: {source.score||"ikke registrert"}</small>}</div>
 {open&&<form className="grid" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=(k:string)=>String(f.get(k)||"").trim(),a=v("a"),b=v("b"),patch:Record<string,string>={};
 if(!!a!==!!b){M("Oppgi mål for begge lag.");return;}const score=a?Number(a)+"-"+Number(b):"";
 if(score&&score!==source.score)patch.score=score;
 if(v("day")!==source.day)patch.day=v("day");if(v("time")!==(source.start_time||"").slice(0,5)&&v("time"))patch.start_time=v("time");if(v("venue")!==(source.venue||""))patch.venue=v("venue");void save(Object.keys(patch).length?patch:null);}}>
 <div className="km-fields"><label>Kampdato<input type="date" name="day" required defaultValue={g.day}/></label><label>Avkast<input type="time" name="time" defaultValue={g.start_time?.slice(0,5)}/></label><label>Spillested<input name="venue" maxLength={160} defaultValue={g.venue}/></label>
 {["Hjemmemål","Bortemål"].map((n,i)=><label key={n}>{n} · {i?g.away:g.home}<input type="number" name={i?"b":"a"} min={0} max={999} step={1} defaultValue={g.score?.match(/\d+/g)?.[i]}/></label>)}</div><small>Resultatet brukes i statistikk og trend. Kamprapporten og spillernes mål endres ikke.</small><div className="day-strip"><button className="btn primary" disabled={busy}>Lagre kampendringer</button><button type="button" className="btn" disabled={busy} onClick={()=>O(false)}>Avbryt</button>{g.fixture_override&&<button type="button" className="btn" disabled={busy} onClick={()=>void save(null)}>Bruk terminlistens verdier</button>}</div></form>}{msg&&<small role="status">{msg}</small>}</section>;
}
