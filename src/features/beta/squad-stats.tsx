import {useEffect,useMemo,useState} from "react";
import {ArrowDown,ArrowUp} from "lucide-react";
import {squadStatLines,type StatLine,type Fixture} from "@/lib/match-journal";

import {Volleyball} from "lucide-react";
import {seasonGoldBalls} from "@/lib/opponent-stats";
import "./squad-stats.css";

const tabs={
  Oversikt:["games","goals","average","homeGoals","awayGoals","warnings","suspensions"],
  Angrep:["goals","field_goals","penalty","homeGoals","awayGoals","average","missed","accuracy"],
  Disiplin:["games","warnings","suspensions","minutes","disqualifications"],
  Trenerdata:["games","errors","saves","rating","awards"]
} as const;
type Tab=keyof typeof tabs;
type Column=(typeof tabs)[Tab][number];
const labels:Record<Column,string>={games:"Kamper",goals:"Mål",average:"Målsnitt",homeGoals:"Mål hjemme",awayGoals:"Mål borte",warnings:"Gule kort",
  suspensions:"2-min.",minutes:"Utvisningsmin.",disqualifications:"Diskval.",field_goals:"Spillemål",penalty:"7 m-mål",missed:"Bomskudd",accuracy:"Treff %",errors:"Tekniske feil",saves:"Redninger",rating:"Vurdering",awards:"Banens beste"};
function sum(xs:(number|null)[]){const nums=xs.filter((x):x is number=>x!=null);return nums.length?nums.reduce((a,b)=>a+b,0):null;}
function metrics(rows:StatLine[]):Record<Column,number|null>{
  const played=rows.filter(x=>x.played),known=played.filter(x=>x.goals!=null),shots=played.filter(x=>x.missed!=null&&x.goals!=null);
  const goals=sum(known.map(x=>x.goals)),g=sum(shots.map(x=>x.goals)),miss=sum(shots.map(x=>x.missed));
  const sus=sum(rows.map(x=>x.suspensions)),ratings=played.flatMap(x=>x.rating==null?[]:[x.rating]);
  return {games:played.length,goals,average:goals==null?null:goals/known.length,homeGoals:sum(played.filter(x=>x.home===true).map(x=>x.goals)),
    awayGoals:sum(played.filter(x=>x.home===false).map(x=>x.goals)),field_goals:sum(played.map(x=>x.field_goals)),penalty:sum(played.map(x=>x.penalty)),
    warnings:sum(rows.map(x=>x.warnings)),suspensions:sus,minutes:sus==null?null:sus*2,disqualifications:sum(rows.map(x=>x.disqualifications)),
    missed:sum(played.map(x=>x.missed)),accuracy:g!=null&&miss!=null&&g+miss>0?100*g/(g+miss):null,errors:sum(played.map(x=>x.errors)),
    saves:sum(played.map(x=>x.saves)),rating:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,awards:sum(played.map(x=>x.awards))};
}
export function SquadStats({reg,fixtures}:{reg:string;fixtures:Fixture[]}){
  const [lines,setLines]=useState<StatLine[]>(),[error,setError]=useState(""),[tab,setTab]=useState<Tab>("Oversikt"),[venue,setVenue]=useState("Alle"),
    [sort,setSort]=useState<Column>("goals"),[desc,setDesc]=useState(true),[league,setLeague]=useState("");
  useEffect(()=>{let alive=true;setLines(undefined);setError("");squadStatLines(reg,fixtures).then(rows=>{if(alive)setLines(rows);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[reg,fixtures]);
  const allGames=fixtures.filter(x=>x.registration===reg&&x.completed),leagues=[...new Set(allGames.flatMap(x=>x.competition?[x.competition]:[]))];
  const games=allGames.filter(x=>(!league||league===x.competition)&&(venue==="Alle"||(venue==="Hjemme"?x.away===x.opponent:x.home===x.opponent)));
  const ids=new Set(games.map(x=>x.id)),filtered=useMemo(()=>lines?.filter(x=>ids.has(x.match_id)),[lines,fixtures,venue,league,reg]);
  const balls=useMemo(()=>seasonGoldBalls(lines||[]),[lines]);
  const byPlayer=new Map<string,StatLine[]>();for(const x of filtered||[])byPlayer.set(x.player,[...(byPlayer.get(x.player)||[]),x]);
  const players=[...byPlayer.values()].map(group=>{const last=group.reduce((a,b)=>b.day>a.day?b:a);return {...last,stats:metrics(group)};}).sort((a,b)=>{
    const l=a.stats[sort],r=b.stats[sort];return Number(l==null)-Number(r==null)||((l??0)-(r??0))*(desc?-1:1)||a.name.localeCompare(b.name,"nb");
  });
  return <section className="grid squad-stats"><header className="competition-heading"><div><h2>Spillerstatistikk</h2><small>{games.length} spilte kamper{filtered&&" · "+new Set(filtered.map(x=>x.match_id)).size+" med spillerdata"}</small></div>
    {leagues.length>1&&<select aria-label="Turnering" value={league} onChange={e=>setLeague(e.target.value)}><option value="">Alle turneringer</option>{leagues.map(l=><option key={l}>{l}</option>)}</select>}</header>
    <nav className="workspace-tabs" aria-label="Statistikktype">{(Object.keys(tabs) as Tab[]).map(t=><button key={t} aria-pressed={tab===t} className={tab===t?"current":""} onClick={()=>{setTab(t);setSort(t==="Disiplin"?"warnings":t==="Trenerdata"?"saves":"goals");setDesc(true);}}>{t}</button>)}</nav>
    <div className="stat-switch" role="group" aria-label="Spillested">{["Alle","Hjemme","Borte"].map(v=><button aria-pressed={venue===v} key={v} onClick={()=>setVenue(v)}>{v}</button>)}</div>
    {error?<p role="alert">{error}</p>:!lines?<p role="status">Henter spillerstatistikk …</p>:!players.length?<p>Ingen registrerte spillerdata for disse kampene.</p>:
    <div className="player-list-scroll"><table className="table player-list stat-table"><caption>{tab} · {venue==="Alle"?"Alle baner":venue+"bane"}</caption>
      <thead><tr><th scope="col">Spiller</th>{tabs[tab].map(c=><th scope="col" key={c} aria-sort={sort!==c?"none":desc?"descending":"ascending"}><button onClick={()=>{setDesc(sort===c?!desc:true);setSort(c);}}>{labels[c]}{sort===c&&(desc?<ArrowDown size={12}/>:<ArrowUp size={12}/>)}</button></th>)}</tr></thead>
      <tbody>{players.map(p=><tr key={p.player}><th scope="row"><small>#{p.shirt||"–"}</small> {p.name} {balls.has(p.player)&&<span className="season-balls" role="img" aria-label={balls.get(p.player)!.length+" gullballer denne sesongen"} title={balls.get(p.player)!.map(id=>{const g=fixtures.find(f=>f.id===id);return g?g.day+" · "+g.opponent:"Kamp";}).join("\n")}>{balls.get(p.player)!.map(id=><Volleyball size={14} key={id} aria-hidden="true"/>)}</span>}</th>{tabs[tab].map(c=><td key={c}>{p.stats[c]?.toLocaleString("nb-NO",{maximumFractionDigits:1})??"–"}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
