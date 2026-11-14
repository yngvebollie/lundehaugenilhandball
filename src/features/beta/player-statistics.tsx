import {FeatureInfo} from "./feature-info";
import {useEffect,useMemo,useState} from "react";
import {ChevronDown,ChevronRight,Volleyball} from "lucide-react";
import {db,demo,type Snapshot} from "@/lib/beta";
import {registrations,seasonMatches,squadStatLines,seasonSettings} from "@/lib/match-journal";
import {groupPlayers,uniqueGames,type ClubLine,type LinkId} from "@/lib/club-player-stats";
import {seasonGoldBalls} from "@/lib/opponent-stats";
import {metrics,labels,tabs,type Column} from "@/lib/stat-metrics";
import {positionBoard,positions,type BoardPlayer} from "@/lib/athlete-wizard";
import {today} from "@/lib/beta";
import {monday} from "@/lib/workload";
import {plusDay} from "@/lib/regular";
import "./squad-stats.css";
function levelName(name:string,competition?:string){
 const age=competition?.match(/(?:jenter|j)\s*(\d+)/i)?.[1],series=competition?.match(/\b(A-serie|Breddeserie)/i)?.[1];
 return age&&series?"J"+age+" "+(series.toLowerCase()==="a-serie"?"A-serie":"Bredde"):name;
}
type Level={id:string;label:string;games:number};
const views={Samlet:["games","goals","average","homeGoals","awayGoals"],Nivåfordeling:["games","goals","average","warnings","suspensions"],Angrep:tabs.Angrep,Disiplin:tabs.Disiplin,Trenerdata:tabs.Trenerdata} as const;
const fmt=(n:number|null)=>n==null?"–":n.toLocaleString("nb-NO",{maximumFractionDigits:1});
export function PlayerStatistics({data,overview=false}:{data:Snapshot;overview?:boolean}){
 const [lines,setLines]=useState<ClubLine[]>(),[aliases,setAliases]=useState<LinkId[]>([]),[season,setSeason]=useState(""),[games,setGames]=useState(0),[levels,setLevels]=useState<Level[]>([]);
 const [view,setView]=useState<keyof typeof views>("Samlet"),[search,setSearch]=useState(""),[level,setLevel]=useState(""),[expand,setExpand]=useState(""),[error,setError]=useState("");
 const [board,B]=useState<BoardPlayer[]>([]);
 useEffect(()=>{let live=true;if(overview)positionBoard(data).then(r=>{if(live)B(r);}).catch(()=>{if(live)B([]);});return()=>{live=false;};},[overview,data]);
 useEffect(()=>{let ok=true;const run=async()=>{
   const ss=await seasonSettings(data.me.squad),regs=await registrations(data.me.squad,ss),fixtures=await seasonMatches(data.me.squad,regs),byId=new Map(fixtures.map(g=>[g.id,g]));
   const results=(await Promise.all(regs.map(async reg=>(await squadStatLines(reg.id,fixtures)).map(row=>{const g=byId.get(row.match_id);return {...row,reg:reg.id,fixtureKey:g?.nif_id?"nif:"+g.nif_id:"local:"+row.match_id,level:reg.display_name||"Lag "+reg.org_id};})))).flat();
   const mappings:LinkId[]=demo?[]:(await db!.rpc("beta_roster_ids",{t:data.me.squad}).throwOnError()).data;
   if(ok){setLines(results);setAliases(mappings);setSeason(ss.options.find(o=>o.id===ss.active)?.label||"–");setLevels(regs.map(reg=>{const gs=fixtures.filter(g=>g.registration===reg.id);return {id:reg.id,label:levelName(reg.display_name||"Lag "+reg.org_id,gs.find(g=>g.competition)?.competition),games:new Set(gs.filter(g=>g.completed).map(g=>g.nif_id||g.id)).size};}).sort((a,b)=>b.label.localeCompare(a.label,"nb")));
    setGames(new Set(fixtures.filter(g=>g.completed).map(g=>g.nif_id||g.id)).size);setError("");}
 };void run().catch(e=>{if(ok)setError(e.message);});return()=>{ok=false;};},[data.me.squad,data]);
 const groups=useMemo(()=>groupPlayers(lines||[],data.roster.filter(p=>p.squad===data.me.squad),aliases),[lines,data.roster,data.me.squad,aliases]);
 const active=levels.find(l=>l.id===level);
 const visible=groups.map(p=>({...p,filtered:p.rows.filter(r=>!active||r.reg===active.id)}));
 const awards=seasonGoldBalls(visible.flatMap(p=>uniqueGames(p.filtered).rows.map(r=>({...r,match_id:r.fixtureKey,player:p.key}))));
 const players=visible.map(g=>{const u=uniqueGames(g.filtered);return {...g,balls:awards.get(g.key)?.length||0,conflicts:u.conflicts,m:metrics(u.rows)};})
   .filter(p=>p.name.toLocaleLowerCase("nb").includes(search.toLocaleLowerCase("nb").trim())&&(!active||p.filtered.length>0))
   .sort((a,b)=>(b.m.goals??-1)-(a.m.goals??-1)||(b.m.games??0)-(a.m.games??0)||a.name.localeCompare(b.name,"nb"));
 if(overview){
  const from=monday(today()),until=plusDay(from,7),people=data.roster.filter(a=>a.squad===data.me.squad&&a.role==="athlete").sort((a,b)=>Number(a.shirt_number||999)-Number(b.shirt_number||999)||a.name.localeCompare(b.name,"nb"));
  const byAthlete=new Map(groups.filter(g=>g.athlete).map(g=>[g.athlete,g.rows]));
  const filtered=people.filter(p=>(p.name+" "+(p.shirt_number||"")).toLocaleLowerCase("nb").includes(search.trim().toLocaleLowerCase("nb")));
  return <section className="grid squad-stats"><header className="competition-heading"><div><h2>Spilleroversikt</h2><small>{data.teams.find(t=>t.id===data.me.squad)?.name} · {people.length} registrerte spillere · Sesong {season||"…"}</small></div><label>Søk etter spiller<input type="search" value={search} placeholder="Navn eller draktnummer" onChange={e=>setSearch(e.target.value)}/></label></header>
  {error&&<p role="alert">Kampstatistikken kunne ikke hentes: {error}</p>}<div className="player-list-scroll"><table className="table stat-table"><thead><tr>{["Nr.","Spiller","Posisjon / ønsker","Kamper","Mål","Mål/kamp","Fullførte / tildelte økter denne uken"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{filtered.map(p=>{
   const b=board.find(x=>x.id===p.id),pos=p.position||b?.positions.map(k=>positions[k as keyof typeof positions]).filter(Boolean).join(", ");
   const own=byAthlete.get(p.id)||[],stats=metrics(uniqueGames(own).rows);
   const plans=data.plans.filter(a=>a.athlete===p.id&&!a.personal&&a.day>=from&&a.day<until),done=plans.filter(a=>a.exercises.length&&a.exercises.every((_,i)=>data.checks.some(c=>c.assignment===a.id&&c.step===i))).length;
   return <tr key={p.id}><td>{p.shirt_number||"–"}</td><th scope="row"><a href={"/spillere?athlete="+p.id}>{p.name}</a></th><td>{pos||"Ikke oppgitt"}</td>{(["games","goals","average"] as const).map(k=><td key={k}>{lines&&!error&&own.length?fmt(stats[k]):"–"}</td>)}<td>{done} / {plans.length}</td></tr>;})}</tbody></table></div>
  {!filtered.length&&<p>{people.length?"Ingen treff.":"Ingen registrerte spillere på laget ennå."}</p>}<small>Kampene telles én gang på tvers av spillelag i aktiv sesong. En strek betyr at koblede kampdata mangler.</small></section>;
 }
 const cols=views[view] as readonly Column[];
 return <section className="grid squad-stats"><header className="competition-heading"><div><FeatureInfo topic="stats"><h2>Spillerstats · {season}</h2></FeatureInfo><small>{active?.games??games} unike spilte kamper · {new Set(visible.flatMap(p=>p.filtered.map(r=>r.fixtureKey))).size} med spillerdata</small></div>
 {view!=="Nivåfordeling"&&<label>Spillelag og nivå<select value={level} onChange={e=>setLevel(e.target.value)}><option value="">Alle nivåer</option>{levels.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>}</header>
 <nav className="workspace-tabs" aria-label="Samlet spillerstatistikk">{(Object.keys(views) as (keyof typeof views)[]).map(v=><button key={v} aria-pressed={view===v} className={view===v?"current":""} onClick={()=>{if(view==="Nivåfordeling"&&v!==view)setLevel("");setExpand("");setView(v);}}>{v}</button>)}</nav>
 {view==="Nivåfordeling"&&<nav className="workspace-tabs" aria-label="Velg spillelag"><button aria-pressed={!active} className={!active?"current":""} onClick={()=>{setLevel("");setExpand("");}}>Alle</button>{levels.map(n=><button key={n.id} aria-pressed={active?.id===n.id} className={active?.id===n.id?"current":""} onClick={()=>{setLevel(n.id);setExpand("");}}>{n.label}</button>)}</nav>}
 <label>Søk etter spiller<input type="search" placeholder="Spillernavn" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {error?<p role="alert">{error}</p>:!lines?<p>Laster sesongstatistikk …</p>:<div className="player-list-scroll"><table className="table stat-table"><thead><tr><th>Spiller</th>{view==="Nivåfordeling"&&<th>Nivå / serie</th>}{cols.map(c=><th key={c}>{labels[c]}</th>)}<th title="Flest registrerte mål på laget i en kamp. Ved likt antall får begge gullball.">Gullballer</th></tr></thead>
 <tbody>{players.map(p=>{const used=[...new Set(p.filtered.map(r=>r.level))].sort(),byLevel=used.map(l=>({l,m:metrics(uniqueGames(p.filtered.filter(r=>r.level===l)).rows)}));
 const rows=view==="Nivåfordeling"?(active&&byLevel.length?byLevel:[{l:active?.label||"Alle",m:p.m}]):[{l:"",m:p.m}];
 return rows.map(({l,m},i)=><PlayerStatRow key={p.key+":"+l} p={p} l={l} m={m} cols={cols} split={view==="Nivåfordeling"} expanded={expand===p.key&&i===0} toggle={()=>setExpand(expand===p.key?"":p.key)} levels={byLevel}/>);})}</tbody></table></div>}
 {!error&&lines&&!players.length&&<p>Ingen spillere i dette utvalget.</p>}</section>;
}
function PlayerStatRow({p,l,m,cols,split,expanded,toggle,levels}:{p:{name:string;balls:number;athlete?:string;shirt?:string|null;conflicts:number;filtered:ClubLine[]};l:string;m:ReturnType<typeof metrics>;cols:readonly Column[];split:boolean;expanded:boolean;toggle:()=>void;levels:{l:string;m:ReturnType<typeof metrics>}[]}){
 return <><tr><th><button className="stat-player-name" onClick={toggle} aria-label={"Kampdetaljer for "+p.name} aria-expanded={expanded}>{expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button> {p.shirt&&"#"+p.shirt+" "}{p.athlete?<a href={"/spillere?athlete="+encodeURIComponent(p.athlete)}>{p.name}</a>:<button onClick={toggle} aria-expanded={expanded}>{p.name}</button>}{p.balls>0&&<> <span className="season-balls" role="img" aria-label={`${p.balls} ${p.balls===1?"gullball":"gullballer"}`} title={p.balls+" "+(p.balls===1?"kamp":"kamper")+" som toppscorer i utvalget"}>{Array.from({length:p.balls},(_,i)=><Volleyball size={14} key={i} aria-hidden="true"/>)}</span></>}</th>{split&&<td>{l}</td>}{cols.map(c=><td key={c}>{fmt(m[c])}</td>)}<td>{p.balls}</td></tr>
 {expanded&&<tr><td colSpan={cols.length+(split?3:2)}><div className="stat-player-details"><strong>{p.name}</strong>{p.athlete&&<a href={"/spillere?athlete="+encodeURIComponent(p.athlete)}>Åpne utøverprofil</a>}
 {levels.map(v=><p key={v.l}>{v.l} · {v.m.games} kamper · {fmt(v.m.goals)} mål · {fmt(v.m.average)} mål/kamp</p>)}
 {!!p.conflicts&&<small>Ulike registreringer i {p.conflicts} kamp(er). Motstridende verdier er holdt utenfor summen.</small>}
 {[...p.filtered].sort((a,b)=>b.day.localeCompare(a.day)).map(r=><a key={r.reg+r.match_id+r.player} href={"/match?game="+r.match_id}>{r.day} · {r.level} · {fmt(r.goals)} mål</a>)}</div></td></tr>}</>;
}
