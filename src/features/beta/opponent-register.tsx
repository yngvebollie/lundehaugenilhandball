import {FeatureInfo} from "./feature-info";
import {useEffect,useMemo,useState} from "react";
import {CalendarDays,ChevronRight} from "lucide-react";
import {db,demo,today} from "@/lib/beta";
import type {Fixture} from "@/lib/match-journal";
import type {Report} from "@/lib/report-text";
import {matchResult} from "@/lib/match-result";
import {normalizeName,oppositionScorers,type OpponentLine} from "@/lib/opponent-stats";

export function OpponentRegister({reg,fixtures}:{reg:string;fixtures:Fixture[]}){
  const games=useMemo(()=>fixtures.filter(g=>g.registration===reg&&g.opponent).sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||"")),[reg,fixtures]);
  const next=games.find(g=>!g.completed&&g.day>=today()),names=[...new Map(games.map(g=>[normalizeName(g.opponent),g.opponent])).values()].sort((a,b)=>a.localeCompare(b,"nb"));
  const [selection,select]=useState(""),[lines,setLines]=useState<OpponentLine[]>(),[error,setError]=useState("");
  useEffect(()=>{let live=true;setError("");async function read(){
    if(!demo)return (await db!.rpc("beta_opponent_lines",{reg}).throwOnError()).data as OpponentLine[];
    return games.filter(g=>g.completed).flatMap(g=>{const doc:Report|undefined=JSON.parse(sessionStorage.getItem("kamper-private-report:"+g.team+":"+g.id)||"null")?.reviewed;
      const side=g.away===g.opponent?"B":g.home===g.opponent?"A":null;
      return (doc?.players||[]).filter(p=>p.side===side).map(p=>({match_id:g.id,day:g.day,opponent:g.opponent,name:p.name,shirt:p.shirt,played:p.played,goals:p.total,penalty:p.penalty}));});
  }void read().then(r=>{if(live)setLines(r);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[reg,games]);
  const opponent=names.find(n=>normalizeName(n)===selection)||next?.opponent||names[0],matches=games.filter(g=>normalizeName(g.opponent)===normalizeName(opponent||""));
  const past=matches.filter(m=>m.completed),upcoming=matches.filter(m=>!m.completed&&m.day>=today()),filtered=lines?.filter(r=>normalizeName(r.opponent)===normalizeName(opponent||""))||[];
  const scorers=oppositionScorers(filtered);
  function fixture(g:Fixture){return <a key={g.id} className="opponent-fixture" href={"/match?game="+g.id}><time>{new Date(g.day+"T12:00:00").toLocaleDateString("nb-NO")}</time><span>{g.home} – {g.away}</span><strong>{g.score||g.start_time?.slice(0,5)||"–"}</strong><span className={"badge result-"+matchResult(g).kind}>{matchResult(g).label}</span><ChevronRight size={16}/></a>;}
  return <section className="grid squad-stats"><header className="competition-heading"><div><FeatureInfo topic="opponents"><h2>Motstanderregister</h2></FeatureInfo><small>{names.length} motstandere denne sesongen</small></div>{names.length>0&&<label>Motstander<select value={normalizeName(opponent||"")} onChange={e=>select(e.target.value)}>{names.map(n=><option key={n} value={normalizeName(n)}>{n}</option>)}</select></label>}</header>
    {!opponent?<p>Ingen motstandere i terminlisten.</p>:<><section className="grid"><h3><CalendarDays size={16}/> Kommende møter · {opponent}</h3>{upcoming.length?upcoming.map(fixture):<p>Ingen nye møter i terminlisten.</p>}</section>
    <section className="grid"><h3>Spilte møter · {opponent}</h3>{past.length?past.map(fixture):<p>Lagene har ikke møttes denne sesongen.</p>}</section>
    <section className="grid"><h3>Målscorere mot oss</h3>{error?<p role="alert">{error}</p>:!lines?<p role="status">Henter kamprapporter …</p>:!scorers.length?<p>Ingen registrerte motstanderspillere fra disse møtene.</p>:<><small>{new Set(filtered.map(x=>x.match_id)).size} av {past.length} spilte møter med rapport</small>
    <div className="player-list-scroll"><table className="table stat-table"><thead><tr>{["Spiller","Kamper","Mål","7 m-mål","Målsnitt"].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{scorers.map(p=><tr key={p.key}><th>#{p.shirt} {p.name}</th><td>{p.games}</td><td>{p.goals??"–"}</td><td>{p.penalty??"–"}</td><td>{p.avg?.toLocaleString("nb-NO",{maximumFractionDigits:1})??"–"}</td></tr>)}</tbody></table></div></>}</section></>}
  </section>;
}
