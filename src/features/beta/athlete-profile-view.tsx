import {FeatureInfo} from "./feature-info";
import {developmentVisible} from "@/lib/development/flags";
import {useEffect,useState} from "react";
import {Check,Link as LinkIcon,Medal} from "lucide-react";
import {today,type Member,type Snapshot} from "@/lib/beta";
import {profileInfo,type ProfileInfo} from "@/lib/coach-activity";
import {ActivityFeed} from "./activity-feed";
export function AthleteProfileView({data,player}:{data:Snapshot;player:Member}){
 const [info,setInfo]=useState<ProfileInfo>(),[note,setNote]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let ok=true;profileInfo(data,player.id).then(x=>{if(ok)setInfo(x);}).catch(e=>{if(ok)setNote(e.message);});return()=>{ok=false;};},[data.me.squad,player.id,data]);
 const plans=data.plans.filter(p=>p.athlete===player.id).sort((a,b)=>b.day.localeCompare(a.day)),done=(id:string)=>data.checks.filter(c=>c.assignment===id).length;
 const history=plans.filter(p=>p.day<=today()||done(p.id)>0);
 return <section className="grid player-profile"><header className="feature-heading">{developmentVisible&&<a href={"/utvikling?athlete="+encodeURIComponent(player.id)}>Min utvikling</a>}<div>{player.photo&&<img src={player.photo} width={54} height={54} alt=""/>}<h2>{player.shirt_number&&"#"+player.shirt_number+" "}{player.name}</h2><small>{player.position}</small></div>
 <a className="btn" href={"/merker?athlete="+player.id}><Medal size={16}/> Merker</a></header>{player.bio&&<p>{player.bio}</p>}
 <div className="merke-summary"><div><strong>{history.filter(p=>done(p.id)===p.exercises.length).length}</strong><span>Fullførte aktiviteter</span></div><div><strong>{history.reduce((n,p)=>n+done(p.id),0)}</strong><span>Avkrysninger</span></div><div><strong>{info?.games.filter(g=>g.played).length??"–"}</strong><span>Koblede kampdeltakelser</span></div></div>
 <section className="grid"><FeatureInfo topic="profile"><h3><LinkIcon size={16}/> Kobling til kamprapporter</h3></FeatureInfo><small>Treff på fornavn og draktnummer i dette lagets aktive sesong.</small>
 {!player.shirt_number?<p>Utøveren har ikke oppgitt draktnummer.</p>:<>{info?.candidates.map((c,i)=><div className="result" key={c.reg+i}><strong>#{c.shirt} {c.name}</strong><span>{c.team} · {c.linked?"Koblet":c.safe?"Entydig treff":"Krever manuell kontroll"}</span></div>)}
 {info&&!info.candidates.length&&<small>Ingen treff i lagrede rapporter ennå.</small>}{info&&!info.verified&&<button className="btn" disabled={busy} onClick={async()=>{setBusy(true);try{setInfo(await profileInfo(data,player.id,"verify"));setNote("Bekreftet. Entydige treff kobles også ved senere rapportimport.");}catch(e){setNote((e as Error).message);}finally{setBusy(false);}}}><Check size={16}/> Bekreft {player.name} · nr. {player.shirt_number}</button>}{info?.verified&&<small>Spilleridentiteten er bekreftet av trener.</small>}</>}
 {note&&<p role="status">{note}</p>}</section>
 {!!info?.games.length&&<section><h3>Kamper i aktiv sesong</h3>{info.games.map(g=><a className="opponent-fixture" key={g.id} href={"/match?game="+g.id}><time>{g.day}</time><span>{g.squad} · {g.home} – {g.away}</span><b>{g.goals??"–"} mål</b></a>)}</section>}
 <section className="grid"><h3>Treningshistorikk</h3>{history.slice(0,50).map(p=>{const review=data.reviews.find(r=>r.assignment===p.id),effort=data.feedback.find(f=>f.assignment===p.id)?.effort;
 return <details className="library-tools" key={p.id}><summary>{p.day} · {p.title} · {done(p.id)} / {p.exercises.length}</summary>{p.exercises.map((e,i)=><p key={i}>{data.checks.some(c=>c.assignment===p.id&&c.step===i)?"✓":"–"} {e}{!!review?.exercise_stars[i]&&" · "+review.exercise_stars[i]+"/5"}</p>)}{effort&&<p>Opplevd belastning: {effort}</p>}{review&&<p>Økt: {review.stars}/5 {review.comment}</p>}</details>;})}{!history.length&&<small>Ingen tidligere økter.</small>}</section>
 <ActivityFeed data={data} person={player.id}/></section>;
}
