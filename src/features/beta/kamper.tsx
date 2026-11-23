import {FixtureEdit} from "./fixture-edit";
import {TeamSeasonActions,shortSeason} from "./team-season-actions";
import {FeatureInfo} from "./feature-info";
import {useCallback,useEffect,useState} from "react";
import {ArrowLeft,CalendarDays,ChevronRight,ClipboardList,ExternalLink,Minus,Plus,RefreshCw,Save,Settings,Star,Trophy} from "lucide-react";
import {db,demo,today,type Snapshot} from "@/lib/beta";
import {handballId,leagueIds} from "@/lib/handball-id";
import {matchResult} from "@/lib/match-result";
import {playerForm,reportOverview,type ReportStatus,type PlayerForm} from "@/lib/match-journal";
import {seasonSettings,saveSeason,seasonMatches,type SeasonSettings} from "@/lib/match-journal";
import {FileCheck2,Volleyball} from "lucide-react";
import {blank,confirmed,editProfile,matchAction,metrics,refreshSeason,register,registrations,shooting,toggleRegistration,type Details,type Fixture,type Player,type Stats} from "@/lib/match-journal";
import type {LinkId} from "@/lib/club-player-stats";
import type {Registration} from "@/lib/nif";
import {ReportEditor} from "./report-editor";
import {TeamReportDownload} from "./team-report-download";
import {OpponentRegister} from "./opponent-register";
import {OpponentScouting} from "./opponent-scouting";
import {SquadStats} from "./squad-stats";
import {Attendance} from "./game-attendance";
import {CupPlanner} from "./cup-planner";
import {LiveMatches} from "./live-matches";
import {PeriodResults} from "./halftime-results";
import {SeasonMatchStatistics} from "./season-match-statistics";
import {FixtureEvents} from "./fixture-events";
import {FixtureReportReading} from "./fixture-event-stats";
import "./kamper.css";

export function Kamper({data}:{data:Snapshot}){
  const [view,setView]=useState(""),[id,setId]=useState(""),[all,setAll]=useState<Fixture[]>([]),[regs,setRegs]=useState<Registration[]>([]),[reports,setReports]=useState<Record<string,ReportStatus>>({});
  const [when,setWhen]=useState("Spilte"),[league,setLeague]=useState(""),[busy,setBusy]=useState(false),[note,setNote]=useState("");
  const [org,setOrg]=useState(""),[squadName,setSquadName]=useState(""),[cup,setCup]=useState(""),[adding,setAdding]=useState(false);
  const squad=data.me.squad,localTeam=data.teams.find(t=>t.id===squad)?.name,admin=data.admins.includes(data.me.id);
  const [seasons,setSeasons]=useState<SeasonSettings>({active:null,options:[]});
  const [mapping,setMapping]=useState<{squad:string;links:LinkId[]}>();
  useEffect(()=>{let active=true;if(!demo&&(id||view==="stats")){void db!.rpc("beta_roster_ids",{t:squad}).then(({data:links,error})=>{if(active&&!error)setMapping({squad,links:links||[]});});}return()=>{active=false;};},[squad,id,view,reports]);
  const profileOf=(player:string)=>{const key=(mapping?.squad===squad?mapping.links.find(l=>l.reg===active?.id&&l.player===player)?.athlete:undefined)||player;return data.roster.some(p=>p.role==="athlete"&&p.squad===squad&&p.id===key)?"/spillere?athlete="+encodeURIComponent(key):undefined;};
  const [profile,setProfile]=useState(""),[past,setPast]=useState(0);
  const shown=regs.filter(r=>past||!r.ended_at);
  const game=all.find(x=>x.id===id),active=shown.find(r=>r.id===(game?.registration||profile))||shown[0];
  const load=useCallback(async()=>{const settings=await seasonSettings(squad),rs=await registrations(squad,past?{...settings,active:past}:settings);const fixtures=await seasonMatches(squad,rs),overview=await reportOverview(squad,fixtures);setSeasons(settings);setRegs(rs);setAll(fixtures);setReports(overview);},[squad,past]);
  useEffect(()=>{void load().catch(e=>setNote(e.message));const url=new URLSearchParams(location.search),key="kamper-profile:"+data.me.id+":"+squad;const pointed=url.get("reg");const hist=Number(url.get("history"));if(hist>0)setPast(hist);setProfile(pointed||sessionStorage.getItem(key)||"");if(pointed)sessionStorage.setItem(key,pointed);setView(url.get("view")||"");setId(url.get("game")||"");if(url.get("view")==="add-team"||url.get("view")==="teams"&&url.get("add")==="1"){setView("add-team");setAdding(true);setOrg(url.get("lagid")||"");setCup(url.get("turnid")||"");setSquadName((url.get("name")||"").slice(0,100));}},[load]);
  // A badge can point to a fixture from an archived season or a cup.
  useEffect(()=>{if(!id||game||demo||!seasons.active)return;let live=true;
    const locate=async()=>{
      const league=(await db!.from("beta_matches").select("registration").eq("team",squad).eq("id",id).maybeSingle().throwOnError()).data;
      let reg=league?.registration;let cup=false;
      if(!league){const g=(await db!.from("beta_cup_games").select("cup").eq("team",squad).eq("id",id).maybeSingle().throwOnError()).data;
        if(!g)return;reg=(await db!.from("beta_cups").select("registration").eq("team",squad).eq("id",g.cup).maybeSingle().throwOnError()).data?.registration;cup=true;}
      if(!reg)return;
      const r=(await db!.from("beta_team_seasons").select("season").eq("team",squad).eq("id",reg).maybeSingle().throwOnError()).data;
      if(!live||!r)return;const q=new URLSearchParams({reg,history:String(r.season)});
      if(cup){q.set("view","cups");q.set("cupGame",id);}else if(past!==r.season)q.set("game",id);else return;
      location.replace("/match?"+q);
    };void locate().catch(e=>{if(live)setNote(e.message);});return()=>{live=false;};
  },[id,game,seasons.active,past,squad]);
  function choose(value:string){setProfile(value);sessionStorage.setItem("kamper-profile:"+data.me.id+":"+squad,value);setLeague("");setWhen("Spilte");setId("");setNote("");setAdding(false);const nextView=view==="add-team"?"teams":view;setView(nextView);history.replaceState(null,"","/match?"+new URLSearchParams({...nextView?{view:nextView}:{},...past?{history:String(past)}:{}}));}
  async function run(fn:()=>Promise<void>){setNote("");setBusy(true);try{await fn();await load();}catch(e){setNote((e as Error).message);}finally{setBusy(false);}}
  async function sync(r:Registration,prefix=""){try{setNote(prefix+r.org_id+": "+await refreshSeason(r));}catch(e){setNote(prefix+"Kamper ikke hentet: "+(e as Error).message);}}
  const scoped=all.filter(m=>active?m.registration===active.id:!m.registration);
  const label=(r:Registration)=>{const m=all.find(m=>m.registration===r.id&&m.home&&m.away);return (r.display_name|| (m?(m.away===m.opponent?m.home:m.away):null))||"Lag "+r.org_id;};
  const title=active?label(active):"Kampoversikt";
  const pool=scoped.filter(m=>!league||m.competition===league), played=pool.filter(m=>m.completed), coming=pool.filter(m=>!m.completed&&m.day>=today());
  const filter=(when==="Spilte"?played:coming).slice().sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||""));
  const latest=when==="Spilte"?filter.at(-1):filter[0];
  const leagues=[...new Set(scoped.map(m=>m.competition).filter((c):c is string=>!!c))];
  useEffect(()=>{const update=()=>void load().catch(e=>setNote(e.message));window.addEventListener("focus",update);return()=>window.removeEventListener("focus",update);},[load]);
  let inputId:number|undefined;try{if(org.trim())inputId=handballId(org,"lag");}catch{/* Show invalid input on submit. */}
  const registered=regs.find(r=>r.org_id===inputId);
  const aggregate=profile==="all"&&!adding&&!id;
  const logging=view==="log";
  const matchMenu=<nav className="workspace-tabs" aria-label="Kampmeny">{[["","Kamper"],["halftime","Statistikk kamper"],["cups","Turneringer"],["stats","Spillerstatistikk"],["opponents","Motstandere"],["teams","Lagprofil"],["notes","Trenernotater"],["log","Logg kamp"]].map(([v,n])=><a className={view===v?"current":""} href={"/match?"+new URLSearchParams({...v?{view:v}:{},...past?{history:String(past)}:{},...v==="log"&&active?{reg:active.id}:{}})} key={v}>{n}</a>)}</nav>;
  function add(){setOrg("");setCup("");setSquadName("");setNote("");setAdding(true);setView("add-team");setId("");history.replaceState(null,"","/match?view=add-team");}
  return <div className={"squad-space"+(id?" detail-mode":"")}>
    {!id&&<aside className="squad-rail"><h2>{localTeam}</h2><small>Treningsgruppe</small><FeatureInfo topic="matches"><h3>Lag</h3></FeatureInfo>
      <button type="button" className={aggregate?"current":""} aria-pressed={aggregate} onClick={()=>choose("all")}>Alle lag</button>
      {shown.map(r=><button className={!aggregate&&active?.id===r.id?"current":""} key={r.id} aria-pressed={!aggregate&&active?.id===r.id} onClick={()=>choose(r.id)}><span><strong>{label(r)}</strong><small>NIF {r.org_id}</small></span><ChevronRight size={16}/></button>)}
      {!past&&admin&&<button className="rail-add" onClick={add}><Plus size={16}/>Legg til NHF-lag</button>}</aside>}
    <section className="grid kamper">
    {!id&&!past&&admin&&view!=="add-team"&&<div className="squad-compact"><button type="button" className="btn" onClick={add}><Plus size={16}/>Legg til NHF-lag</button></div>}
    {!id&&!logging&&(view===""||aggregate)&&<div className="day-strip"><a className="btn primary" aria-label="Åpne Logg kamp" href={"/match?"+new URLSearchParams({view:"log",...active&&!aggregate?{reg:active.id}:{}})}><ClipboardList size={16} aria-hidden="true"/>Logg kamp</a></div>}
    {!id&&!logging&&shown.length>0&&<label className="squad-compact">Aktiv NIF-lagprofil<select value={aggregate?"all":active?.id||""} onChange={e=>choose(e.target.value)}><option value="all">Alle lag</option>{shown.map(r=><option key={r.id} value={r.id}>{label(r)} · {r.org_id}</option>)}</select></label>}
    {!id&&!logging&&<div className="season-toolbar">
      {past?<label>Historisk sesong<select value={past} onChange={e=>{history.replaceState(null,"","/match?"+new URLSearchParams({history:e.target.value,...view==="halftime"?{view}:{}}));setPast(Number(e.target.value));}}>{seasons.options.map(o=><option value={o.id} key={o.id}>{shortSeason(o.label)}</option>)}</select></label>:<SeasonPicker key={String(seasons.active)+squad} settings={seasons} admin={admin} busy={busy} onSave={(sid,label)=>run(async()=>{await saveSeason(squad,sid,label);choose("");setNote("Aktiv sesong: "+shortSeason(label));})}/>}
      {seasons.active&&<button type="button" className="btn" aria-pressed={!!past} onClick={()=>{const n=past?0:seasons.active||0;const keep=view==="halftime";const query=new URLSearchParams({...n?{history:String(n)}:{},...keep?{view}:{}});history.replaceState(null,"","/match"+(query.size?"?"+query:""));setPast(n);if(!keep)setView("");setAdding(false);}}>{past?"Til aktive lag":"Se historikk"}</button>}</div>}
    {note&&<p role="status" className="km-status">{note}</p>}
    {id?game?<MatchDetail key={game.id} data={data} game={game} report={reports[game.id]} back={past?"/match?history="+past:"/match"} reload={load} profileOf={profileOf}/>:<p>Kampen er ikke tilgjengelig. <a href="/match">Til oversikten</a></p>:view==="halftime"?<>{matchMenu}<SeasonMatchStatistics key={past||seasons.active||0} team={squad} games={all} reports={reports} teams={regs.map(r=>({id:r.id,name:label(r)}))} history={past}/></>:logging?<>{matchMenu}<LiveMatches data={data} fixtures={all} teams={[
      ...(active?[{key:"nif:"+active.id,name:label(active)}]:[]),
      ...(localTeam?[{key:"group:"+squad,name:localTeam}]:[]),
      ...data.teams.filter(team=>team.id!==squad).map(team=>({key:"group:"+team.id,name:team.name})),
      ...shown.filter(r=>r.id!==active?.id).map(r=>({key:"nif:"+r.id,name:label(r)})),
    ]}/></>:view==="add-team"?<>{matchMenu}{admin&&!past?<section className="event-panel grid"><h1>Legg til NHF-lag</h1><p>Koble et lag til den aktive sesongen for å hente terminliste og kampresultater.</p><ol><li>Åpne <a href="https://www.handball.no/system/kamper/" target="_blank" rel="noreferrer">Kampsøk hos NHF</a>, søk opp laget og åpne lagets terminliste. Kopier hele nettadressen eller tallet etter <code>lagid=</code>.</li><li>For å begrense importen, åpne serien eller turneringen i Kampsøk. Bruk nettadressen eller tallet etter <code>turnid=</code>. Skil flere lenker eller ID-er med komma.</li></ol><p>Velg først en aktiv sesong hvis ingen er valgt. Uten turneringsfilter henter appen terminlisten for laget.</p><form className="grid" onSubmit={e=>{e.preventDefault();if(registered){choose(registered.id);return;}void run(async()=>{const r=await register(squad,handballId(org,"lag"),seasons.active||0,leagueIds(cup),squadName);choose(r.id);await sync(r,"Laget "+(r.display_name||r.org_id)+" er lagret. ");setOrg("");setCup("");setSquadName("");});}}>
        <label>Laglenke eller NHF-lag-ID<input required type="text" placeholder="Lag-ID eller laglenke fra handball.no" value={org} onChange={e=>setOrg(e.target.value)}/></label><label>Lagnavn i sesongen<input value={squadName} maxLength={100} placeholder="F.eks. Hundvåg J14" onChange={e=>setSquadName(e.target.value)}/></label><label>Turneringslenker eller serie-ID-er (valgfritt)<input placeholder="Serie-ID eller turneringslenke" value={cup} onChange={e=>setCup(e.target.value)}/></label>{registered?<div className="km-existing" role="status"><strong>{inputId} er allerede registrert som {label(registered)}.</strong><span>For et annet lag: lim inn det lagets NHF-lenke i «Laglenke eller NHF-lag-ID».</span><button className="btn" type="button" onClick={()=>choose(registered.id)}>Åpne {label(registered)} <ChevronRight size={16}/></button></div>:<button disabled={busy||!seasons.active||!org.trim()} className="btn primary">Koble til lag og hent kamper</button>}</form></section>:<p>Velg aktiv sesong og bruk en lagadministratorkonto for å koble til lag.</p>}</>:aggregate&&view!=="opponents"?<>{matchMenu}<LeagueOverview regs={shown} games={all} label={label}/></>:<>
      <header className="squad-title"><div><h1>{title}</h1>{active&&admin&&!past&&<TeamSeasonActions key={active.id} team={active} name={title} season={shortSeason(seasons.options.find(o=>o.id===active.season)?.label||"")} updated={async ended=>{await load();if(ended)choose("all");setNote(ended?"Laget ligger nå i sesonghistorikken.":"Lagnavnet er oppdatert.");}}/>}{active&&<small className="id-tag">NIF {active.org_id}</small>}</div>
        <div className="day-strip">{active&&<a className="btn" href={"https://www.handball.no/system/kamper/lag/?lagid="+active.org_id} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Terminliste hos NHF</a>}<button disabled={busy||!!past||!active?.active} className="btn primary" onClick={()=>active&&run(()=>sync(active))}><RefreshCw size={16}/>Hent kamper nå</button></div></header>
      {matchMenu}
      {active&&view===""&&<TeamReportDownload key={active.id} name={label(active)} season={shortSeason(seasons.options.find(o=>o.id===active.season)?.label||"")}
        team={squad} user={data.me.id} matches={all.filter(g=>g.registration===active.id)} reports={reports}/>}
      {view==="cups"?(active?<CupPlanner data={data} reg={active.id} key={active.id}/>:<p>Legg til et lag først.</p>):view==="opponents"?<><OpponentScouting key={squad+":"+(past||seasons.active||0)} team={squad} user={data.me.id} initial={past||seasons.active||0} settings={seasons} fixtures={all} reports={reports} upcoming={all.filter(g=>g.registration===active?.id&&!g.completed&&g.day>=today()).sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||""))[0]?.opponent}/>{active&&<OpponentRegister key={active.id} reg={active.id} fixtures={all}/>}</>:view==="stats"?(active?<SquadStats profileOf={profileOf} key={active.id} reg={active.id} fixtures={all}/>:<p>Velg et lag for å se statistikk.</p>):view==="teams"||view==="notes"?<>
        {active&&<>{view==="teams"&&<div className="km-row"><div><strong>Synkronisering</strong><p>{active.sync_result||"Ikke synkronisert"}{active.synced_at&&" · "+new Date(active.synced_at).toLocaleString("nb-NO")}</p></div>{admin&&!past&&<button disabled={busy} className="btn" onClick={()=>run(()=>toggleRegistration(active))}>{active.active?"Sett på pause":"Aktiver"}</button>}</div>}
        <ProfileInfo key={active.id+view} r={active} admin={admin&&!past} busy={busy} run={run} notesOnly={view==="notes"}/></>}
      </>:<>
        <header className="competition-heading"><div><h2>{league||(leagues.length===1?leagues[0]:"Terminliste")}</h2><small>{active?.tournament?"Liga "+(active.leagues?.join(", ")||active.tournament):"Terminliste"}</small></div>
        <div className="day-strip">{leagues.length>1&&<select aria-label="Turnering" value={league} onChange={e=>setLeague(e.target.value)}><option value="">Alle turneringer</option>{leagues.map(l=><option key={l}>{l}</option>)}</select>}<div className="stat-switch" role="group" aria-label="Kampstatus">{[["Spilte",played.length],["Kommende",coming.length]].map(([v,n])=><button type="button" key={v} aria-pressed={when===v} onClick={()=>setWhen(String(v))}>{v} <b>{n}</b></button>)}</div></div></header>
        {when==="Spilte"&&<Trend games={played}/>}<div className="fixture-list">{filter.map(m=><a className={"fixture-line outcome-"+matchResult(m).kind+" "+(m.id===latest?.id?"spotlight":"")} href={"/match?"+(past?"history="+past+"&":"")+"game="+m.id} key={m.id}><time dateTime={m.day}>{new Date(m.day+"T12:00:00").toLocaleDateString("nb-NO",{weekday:"short",day:"numeric",month:"short"})}</time><small>{m.start_time?.slice(0,5)||"–"}</small><strong className="fixture-teams">{m.home||localTeam} – {m.away||m.opponent}{reports[m.id]?.revision&&<ReportMark revision={reports[m.id].revision!}/>}</strong><b>{m.score}</b><small>{m.venue}</small><span className={"badge result-"+matchResult(m).kind}>{matchResult(m).label}</span><ChevronRight size={17}/></a>)}</div>
        {!filter.length&&<p>Ingen kamper i dette utvalget.</p>}
        {latest&&<div className="match-summary"><strong>Kampdetaljer</strong><span>ResPIN {latest.nif_id||"–"}</span><small>{reports[latest.id]?.rows??0} spillerlinjer</small>{reports[latest.id]?.revision?<ReportMark revision={reports[latest.id].revision!}/>:latest.completed&&reports[latest.id]?<small>Ingen lagret rapport</small>:null}<a className="btn primary" href={"/match?"+(past?"history="+past+"&":"")+"game="+latest.id}>Åpne kamprapport <ChevronRight size={16}/></a></div>}
        {!active&&!past&&admin&&<button className="btn" onClick={add}><Plus size={16}/>Legg til NHF-lag</button>}
      </>}
    </>}</section></div>;
}
function decisions(games:Fixture[]){
 return games.filter(g=>matchResult(g).kind!=="neutral").sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||"")||a.id.localeCompare(b.id));
}
function Trend({games}:{games:Fixture[]}){
 const recent=decisions(games).slice(-10);
 return <span className="league-trend" aria-label="Trend, eldste kamp først"><small>Trend</small>{recent.length?recent.map(g=>{const r=matchResult(g);return <abbr key={g.id} className={"trend-"+r.kind} title={g.day+" · "+g.opponent+" · "+r.label+" "+g.score}>{r.kind==="win"?"W":r.kind==="loss"?"L":"D"}</abbr>}):"–"}</span>;
}
function LeagueOverview({regs,games,label}:{regs:Registration[];games:Fixture[];label:(r:Registration)=>string}){
 const selected=games.filter(g=>regs.some(r=>r.id===g.registration));
 function row(name:string,list:Fixture[],key:string){
 const rows=decisions(list),count=(kind:string)=>rows.filter(g=>matchResult(g).kind===kind).length;
 return <tr key={key}><th scope="row">{name}</th><td>{rows.length}</td><td>{count("win")}</td><td>{count("draw")}</td><td>{count("loss")}</td><td><Trend games={rows}/></td></tr>;
 }
 return <section className="grid"><h1>Alle lag</h1><h2>Serieresultater</h2><div className="player-list-scroll"><table className="table"><thead><tr>{["Lag","Kamper med resultat","Seier","Uavgjort","Tap","Siste 10"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{regs.map(r=>row(label(r),selected.filter(g=>g.registration===r.id),r.id))}</tbody><tfoot>{row("Alle lag samlet",selected,"sum")}</tfoot></table></div><small>Hvert resultat telles fra lagets perspektiv. Nyeste kamp står til høyre. W = seier, D = uavgjort, L = tap.</small></section>;
}
function ReportMark({revision}:{revision:number}){
  return <span className="report-saved-mark" title={"Lagret kamprapport · revisjon "+revision}><FileCheck2 size={14} aria-hidden="true"/> Rapport lagt til</span>;
}
function SeasonPicker({settings,admin,busy,onSave}:{settings:SeasonSettings;admin:boolean;busy:boolean;onSave:(id:number,label:string)=>void}){
  const options=settings.options.some(s=>s.id===201068)?settings.options:[{id:201068,label:"2026/27"},...settings.options];
  const [open,setOpen]=useState(!settings.active),[choice,setChoice]=useState(String(settings.active||201068)),[newId,setNewId]=useState(""),[year,setYear]=useState("");
  const value=choice==="new"?Number(newId):Number(choice),start=Number(year),validYear=/^20\d{2}$/.test(year);
  const label=choice==="new"?(validYear?year+"/"+String(start+1).slice(-2):""):options.find(s=>s.id===value)?.label||"";
  const active=options.find(s=>s.id===settings.active);
  return <><strong>{active?"Sesong "+shortSeason(active.label):"Ingen aktiv sesong"}</strong>{admin&&<button className="btn" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{active?"Bytt sesong":"Velg sesong"}</button>}
    {admin&&open&&<form className="season-picker" onSubmit={e=>{e.preventDefault();onSave(value,label);}}><label>Sesong for treningsgruppen<select aria-label="Sesong" value={choice} onChange={e=>setChoice(e.target.value)}>{options.map(s=><option key={s.id} value={s.id}>{shortSeason(s.label)}</option>)}<option value="new">Ny sesong …</option></select></label>
    {choice==="new"&&<><label>Startår<input type="number" min={2000} max={2099} required placeholder="2027" value={year} onChange={e=>setYear(e.target.value)}/></label><label>NIF sesong-ID<input required min={1} type="number" value={newId} onChange={e=>setNewId(e.target.value)}/></label></>}
    <button className="btn" disabled={busy||!value||!label||value===settings.active||(choice==="new"&&options.some(o=>o.id===value||shortSeason(o.label)===shortSeason(label)))}>Aktiver {label?shortSeason(label):"sesong"}</button></form>}</>;
}
function PlayerList({rows,form,selected,pick,day,profileOf}:{profileOf:(id:string)=>string|undefined;rows:Player[];form:Record<string,PlayerForm>;selected:string;pick:(id:string)=>void;day:string}){
  const goals=(p:Player)=>p.report_goals??p.stats?.shots_hit??null;
  const sorted=rows.filter(p=>p.report_listed||confirmed(p)||p.stats||p.discrepancy).sort((a,b)=>Number(confirmed(b))-Number(confirmed(a))||((goals(b)??-1)-(goals(a)??-1))||Number(a.shirt_number||999)-Number(b.shirt_number||999)||a.name.localeCompare(b.name,"nb"));
  const top=Math.max(0,...sorted.filter(confirmed).map(p=>goals(p)||0));
  const avg=(n:number,d:number)=>d?(n/d).toLocaleString("nb-NO",{maximumFractionDigits:1}):"–";
  if(!sorted.length)return null;
  return <div className="player-list-wrap"><p className="muted">Sesongstatistikk til og med {day}. Kun spilte kamper med registrerte mål teller i snittet.</p>
    <div className="player-list-scroll"><table className="table player-list stat-table"><thead><tr className="stat-groups"><th scope="col">Spiller</th><th scope="colgroup" colSpan={4}>Denne kampen</th><th scope="colgroup" colSpan={5}>Sesong til dato</th></tr><tr>{["Navn","Mål","Adv.","2 min","Deltakelse","Kamper","Sesongmål","Målsnitt","Adv.","2 min"].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
    {sorted.map(p=>{const href=profileOf(p.player_id),f=form[p.player_id],gold=confirmed(p)&&top>0&&goals(p)===top;
      return <tr key={p.player_id} className={selected===p.player_id?"highlight":""} onClick={()=>pick(p.player_id)}><th scope="row"><button aria-pressed={selected===p.player_id} onClick={()=>pick(p.player_id)}><small>#{p.shirt_number||"–"}</small> {href?"Velg":p.name}</button> {href&&<a href={href} onClick={e=>e.stopPropagation()}>{p.name}</a>} {gold&&<span className="gold-ball" role="img" aria-label="Kampens toppscorer" title="Kampens toppscorer"><Volleyball size={18} aria-hidden="true"/></span>}</th>
      <td><strong>{goals(p)??"–"}</strong></td><td>{p.report_warnings??"–"}</td><td title="Tominuttersutvisninger i denne kampen">{f?.game_suspensions??"–"}</td><td>{confirmed(p)?"Deltatt":p.report_listed?"Ikke avmerket":"Uavklart"}</td><td>{f?.games??"–"}</td><td>{f?.goals??"–"}</td><td title={f?.prior_games?"Før kampen: "+avg(f.prior_goals||0,f.prior_games):"Ingen tidligere registrerte kamper"}>{f?.goals!=null?avg(f.goals,f.scored_games??f.games):"–"}</td><td>{f?.season_warnings??"–"}</td><td title="Tominuttersutvisninger til og med denne kampen">{f?.season_suspensions??"–"}</td></tr>;})}</tbody></table></div></div>;
}
function ProfileInfo({r,admin,busy,run,notesOnly}:{notesOnly:boolean;r:Registration;admin:boolean;busy:boolean;run:(fn:()=>Promise<void>)=>Promise<void>}){
  const [note,setNote]=useState(r.profile_note||""),[ids,setIds]=useState((r.leagues?.length?r.leagues:r.tournament?[r.tournament]:[]).join(", ")),[saved,setSaved]=useState("");
  return <form className="grid" onSubmit={e=>{e.preventDefault();void run(async()=>{await editProfile(r,leagueIds(ids),note);setSaved("Lagprofil lagret.");});}}>
    {!notesOnly&&<label>Profilens liga-ID-er<input readOnly={!admin} value={ids} onChange={e=>setIds(e.target.value)}/></label>}<label>Lagnotat<textarea readOnly={!admin} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label>
    {admin&&<button className="btn" disabled={busy}><Save size={16}/>Lagre lagprofil</button>}{saved&&<p role="status">{saved}</p>}</form>;
}
function MatchDetail({data,game:g,report,back,reload,profileOf}:{back:string;profileOf:(id:string)=>string|undefined;data:Snapshot;game:Fixture;report?:ReportStatus;reload:()=>Promise<void>}){
  const [section,setSection]=useState("Kamprapport");
  useEffect(()=>{if(new URLSearchParams(location.search).get("section")==="events")setSection("Hendelser");},[]);
  const [d,setD]=useState<Details>(),[selected,pick]=useState(""),[source,setSource]=useState(""),[name,setName]=useState(""),[num,setNum]=useState(""),[score,setScore]=useState(g.score||"");
  const [busy,setBusy]=useState(false),[note,setNote]=useState("");
  const [form,setForm]=useState<Record<string,PlayerForm>>({});
  const read=async()=>{setD(await matchAction(data,"details",g.id));setForm(await playerForm(g));};
  useEffect(()=>{void read().catch(e=>setNote(e.message));},[g.id]);
  async function mutate(action:string,p:string|null,v:Record<string,unknown>,message:string){
    setBusy(true);setNote("");try{await matchAction(data,action,g.id,p,v);await read();await reload();setNote(message);return true;}catch(e){setNote((e as Error).message);return false;}finally{setBusy(false);}
  }
  const opts=new Map([...(d?.catalog||[]),...data.roster.filter(m=>m.role==="athlete")].map(p=>[p.id,p.name]));
  const sel=d?.rows.find(p=>p.player_id===selected);
  return <section className="grid"><a href={back}><ArrowLeft size={15}/> Kampoversikt</a><header><small>{g.day} {g.start_time?.slice(0,5)} · <span className={"badge result-"+matchResult(g).kind}>{matchResult(g).label}</span></small><h2>{g.home||data.teams.find(x=>x.id===g.team)?.name} – {g.away||g.opponent} {g.score}</h2><p>{[g.venue,g.competition,g.age_class].filter(Boolean).join(" · ")}</p>
    <div className="day-strip">{g.nif_id&&<a href={"https://www.handball.no/system/kamper/kamp/?matchid="+g.nif_id} target="_blank" rel="noreferrer">Kamp på handball.no <ExternalLink size={14}/></a>}
      {!g.completed&&g.day>=today()&&<a className="btn" href={"/match?"+new URLSearchParams({view:"opponents",opponent:g.opponent,...g.registration?{reg:g.registration}:{}})}>Forbered mot {g.opponent}</a>}</div></header>
    <FixtureEdit game={g} reload={reload}/><nav className="workspace-tabs" aria-label="Kampdetaljer">{["Kampinformasjon","Spillere","Kamprapport","Hendelser"].map(v=><button key={v} className={v===section?"current":""} aria-pressed={v===section} onClick={()=>setSection(v)}>{v}</button>)}<small className="private-mark">Kun trenere</small></nav>
    {section==="Hendelser"&&<FixtureEvents game={g} data={data} onChange={reload}/>}
    {section==="Kampinformasjon"&&<><div className="match-summary"><strong>ResPIN {g.nif_id||"–"}</strong><span>{g.day} · {g.start_time?.slice(0,5)||"–"}</span><span>{g.venue||"Ukjent hall"}</span></div><PeriodResults game={g} report={report}/></>}
    {!g.registration&&!g.completed&&g.day<=today()&&<form className="day-strip" onSubmit={e=>{e.preventDefault();void mutate("finished",null,{score},"Sluttresultat lagret.");}}><label>Sluttresultat<input required pattern="[0-9]+ *[-:] *[0-9]+" maxLength={20} placeholder="24-21" value={score} onChange={e=>setScore(e.target.value)}/></label><button disabled={busy} className="btn">Marker ferdig</button></form>}
    <div hidden={section!=="Kamprapport"}><ReportEditor game={g.fixture_source?{...g,...g.fixture_source}:g} data={data} onSaved={async()=>{await Promise.all([read(),reload()]);}}/>
    {section==="Kamprapport"&&<FixtureReportReading game={g.id} team={g.team} user={data.me.id}
      ownSide={g.opponent.trim().toLocaleLowerCase("nb-NO")===g.away?.trim().toLocaleLowerCase("nb-NO")?"home":"away"}/>}</div>
    <div hidden={section!=="Spillere"}><div className="grid">
    <div className="feature-heading"><FeatureInfo topic="stats"><h3>Spillerstatistikk</h3></FeatureInfo>{g.completed&&<a href={"/merker?game="+g.id}>Koble utøver til kampmerker</a>}</div>
    {d&&<Attendance data={data} match={g.id} names={d.rows.filter(confirmed).map(p=>p.name)} played={new Set(d.rows.filter(confirmed).map(p=>profileOf(p.player_id)?.split("athlete=")[1]||p.player_id))}/>}
    {d&&<PlayerList profileOf={profileOf} rows={d.rows} form={form} selected={selected} pick={pick} day={g.day}/>}
    {d&&!d.rows.some(p=>p.report_listed||confirmed(p)||p.stats||p.discrepancy)&&<p>Ingen spillerlinjer ennå.</p>}
    <details className="library-tools"><summary>Deltakelse og spillerutvalg</summary><div className="grid">
      {d?.rows.map(p=><label key={p.player_id} className="exercise-row"><input type="checkbox" disabled={busy} checked={confirmed(p)} onChange={e=>void mutate("participant",p.player_id,{played:e.target.checked},"Deltakelse lagret.")}/>{p.name} · {p.local_played!=null?"Manuell":p.report_listed?(p.report_played?"Rapport: spilte":"Rapport: ikke avmerket"):p.nif_played===true?"NIF: spilte":p.nif_played===false?"NIF: spilte ikke":"Ikke bekreftet"}{p.discrepancy?" · Kontroller avvik":""}</label>)}
      <form className="km-fields" onSubmit={e=>{e.preventDefault();void mutate("participant",source||null,{name,number:num,played:true},"Spiller lagt til.").then(ok=>{if(ok){setName("");setNum("");setSource("");}});}}>
        <label>Velg spiller<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Ny spiller</option>{[...opts].filter(([id])=>!d?.rows.some(p=>p.player_id===id)).map(([id,n])=><option value={id} key={id}>{n}</option>)}</select></label>
        {!source&&<label>Spillernavn<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)}/></label>}<label>Draktnummer<input maxLength={8} value={num} onChange={e=>setNum(e.target.value)}/></label><button className="btn" disabled={busy}><Plus size={16}/>Bekreft spiller</button></form>
    </div></details>
    {sel&&confirmed(sel)&&<StatEditor key={sel.player_id} p={sel} busy={busy} save={s=>mutate("stats",sel.player_id,s,"Statistikk lagret.")} erase={data.admins.includes(data.me.id)&&sel.stats?async()=>{if(window.confirm("Slette vurderingen og notatet permanent?")){await mutate("erase",sel.player_id,{},"Vurdering slettet.");pick("");}}:undefined}/>}
    {note&&<p role="status" className="km-status">{note}</p>}</div></div></section>;
}
function StatEditor({p,busy,save,erase}:{p:Player;busy:boolean;save:(s:Stats)=>Promise<boolean>;erase?:()=>Promise<void>}){
  const [s,set]=useState<Stats>({...blank,...p.stats}),shot=shooting({...s,shots_hit:p.report_goals??s.shots_hit});
  return <form className="km-editor grid" onSubmit={e=>{e.preventDefault();void save(s);}}><h3>{p.shirt_number&&"#"+p.shirt_number+" "}{p.name}</h3><div className="km-fields">
{(Object.keys(metrics) as (keyof typeof metrics)[]).map(k=><div key={k}><span>{metrics[k]}</span><span className="km-step"><button type="button" title={"Reduser "+metrics[k]} disabled={!s[k]||k==="shots_hit"&&p.report_goals!=null} onClick={()=>set({...s,[k]:s[k]-1})}><Minus size={15}/></button><input aria-label={metrics[k]} required type="number" min={0} max={2147483647} step={1} readOnly={k==="shots_hit"&&p.report_goals!=null} value={k==="shots_hit"?p.report_goals??s[k]:s[k]} onChange={e=>set({...s,[k]:Math.max(0,Number(e.target.value))})}/><button type="button" title={"Øk "+metrics[k]} disabled={k==="shots_hit"&&p.report_goals!=null} onClick={()=>set({...s,[k]:s[k]+1})}><Plus size={15}/></button></span></div>)}</div>
    <p>{shot.total} skudd · Treffprosent: {shot.percent===null?"–":shot.percent+" %"}</p>
    <div className="day-strip" aria-label="Spillervurdering">{[1,2,3,4,5].map(n=><button key={n} type="button" className="km-star" aria-label={n+" stjerner"} aria-pressed={s.rating===n} onClick={()=>set({...s,rating:n})}><Star size={22} fill={(s.rating||0)>=n?"currentColor":"none"}/></button>)}<button className="btn" type="button" disabled={!s.rating} onClick={()=>set({...s,rating:null})}>Fjern stjerner</button></div>
    <label className="exercise-row"><input type="checkbox" checked={s.is_best_player} onChange={e=>set({...s,is_best_player:e.target.checked})}/><Trophy size={16}/> Banens beste</label>{p.nif_best_player&&<small>Offisielt valgt av NIF</small>}
    <label>Privat trenernotat<textarea maxLength={500} value={s.notes||""} onChange={e=>set({...s,notes:e.target.value})}/><small>{s.notes?.length||0}/500</small></label>
    <div className="day-strip"><button className="btn primary" disabled={busy}><Save size={16}/>Lagre statistikk</button>{erase&&<button className="btn" disabled={busy} type="button" onClick={erase}>Slett vurdering</button>}</div></form>;
}
