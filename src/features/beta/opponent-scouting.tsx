import {useEffect,useMemo,useState} from "react";
import {Plus,RefreshCw} from "lucide-react";
import {db} from "@/lib/beta";
import {handballId,leagueIds} from "@/lib/handball-id";
import {registrations,reportOverview,seasonMatches,type Fixture,type ReportStatus,type SeasonSettings} from "@/lib/match-journal";
import {readReportLogs} from "@/lib/match-report-data";
import {opponentPacket,type OpponentWatch} from "@/lib/opponent-watch";
import {normalizeName} from "@/lib/opponent-stats";
import type {SeasonLog} from "@/lib/season-match-statistics";
import {SeasonMatchStatistics} from "./season-match-statistics";

type Preview={name:string;existing:boolean;total:number;competitions:string[];org:number;leagues:number[]};
export function OpponentScouting({team,user,initial,settings,fixtures,reports,upcoming}:{team:string;user:string;initial:number;settings:SeasonSettings;fixtures:Fixture[];reports:Record<string,ReportStatus>;upcoming?:string}){
  const [season,setSeason]=useState(initial);
  const [watches,setWatches]=useState<OpponentWatch[]>();
  const [selected,select]=useState(0);
  const [adding,add]=useState(false);
  const [org,setOrg]=useState("");
  const [leagues,setLeagues]=useState("");
  const [preview,setPreview]=useState<Preview>();
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [ownLogs,setOwnLogs]=useState<Record<string,SeasonLog>>({});
  const [ownLogState,setOwnLogState]=useState<"loading"|"ready"|"error">("loading");
  const [historical,setHistorical]=useState<{season:number;games:Fixture[];reports:Record<string,ReportStatus>}>();
  const [headToHead,setHeadToHead]=useState(false);
  const requested=new URLSearchParams(location.search).get("opponent");
  const suggested=requested&&watches?.find(item=>normalizeName(item.name)===normalizeName(requested));
  const watch=watches?.find(item=>item.org_id===selected)||(suggested||watches?.[0]);
  const ownGames=season===initial?fixtures:historical?.season===season?historical.games:undefined;
  const ownReports=season===initial?reports:historical?.season===season?historical.reports:undefined;
  useEffect(()=>{
    if(!db||!season)return;
    let active=true;
    void db.from("beta_opponent_watches").select("*").eq("team",team).eq("season",season).order("name").throwOnError()
      .then(({data})=>{if(active)setWatches(data as OpponentWatch[]);}).then(undefined,e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[team,season]);
  useEffect(()=>{
    if(!db||!season||season===initial)return;
    let active=true;
    void registrations(team,{...settings,active:season}).then(regs=>seasonMatches(team,regs)).then(async games=>{
      const reports=await reportOverview(team,games);
      if(active)setHistorical({season,games,reports});
    }).catch(e=>{if(active){setError(e.message);setOwnLogState("error");}});
    return ()=>{active=false;};
  },[team,initial,season,settings]);
  useEffect(()=>{
    let active=true;
    setOwnLogs({});setOwnLogState("loading");
    if(!watch||!ownGames)return;
    const watchedIds=new Set(watch.fixtures.map(item=>item.game.nif_id));
    void readReportLogs(team,ownGames.filter(g=>g.nif_id&&watchedIds.has(g.nif_id)).map(g=>g.id),user)
      .then(logs=>{if(active){setOwnLogs(Object.fromEntries(logs));setOwnLogState("ready");}})
      .catch(()=>{if(active)setOwnLogState("error");});
    return ()=>{active=false;};
  },[watch,team,ownGames,user]);
  const packet=useMemo(()=>watch&&ownGames&&ownReports?opponentPacket(watch,ownGames,ownReports,ownLogs,headToHead,season!==settings.active):null,
    [watch,ownGames,ownReports,ownLogs,headToHead,season,settings.active]);
  function chooseHistory(value:number){
    setSeason(value);setWatches(undefined);setPreview(undefined);select(0);setHeadToHead(false);setError("");setStatus("");
  }
  async function run(action:"preview"|"save"|"sync"){
    if(!db||busy)return;
    setBusy(true);setError("");setStatus("");
    try{
      const params=action==="sync"&&watch?{org:watch.org_id,leagues:watch.leagues}:action==="save"&&preview?preview:
        {org:handballId(org,"lag"),leagues:leagueIds(leagues)};
      const existing=watches?.find(row=>row.org_id===params.org);
      if(action==="preview"&&existing){
        select(existing.org_id);add(false);setStatus(existing.name+" er allerede fulgt i denne sesongen.");return;
      }
      const {data:{session}}=await db.auth.getSession();
      if(!session)throw Error("Logg inn på nytt.");
      const response=await fetch("/api/matches/opponents",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},
        body:JSON.stringify({action,team,season,org:params.org,leagues:params.leagues})});
      const body=await response.json();
      if(!response.ok)throw Error(body.message||"Kunne ikke oppdatere motstanderen.");
      if(action==="preview"){setPreview({...body,org:params.org,leagues:params.leagues});return;}
      const saved=body as OpponentWatch;
      setWatches(rows=>[...(rows??[]).filter(row=>row.org_id!==saved.org_id),saved].sort((a,b)=>a.name.localeCompare(b.name,"nb")));
      select(saved.org_id);add(false);setPreview(undefined);
      setStatus(saved.name+" er oppdatert. "+saved.fixtures.length+" oppgjør i terminlisten.");
    }catch(e){setError((e as {message?:string})?.message||"Kunne ikke hente kampdata.");}
    finally{setBusy(false);}
  }
  if(!db)return <p>NHF er ikke tilkoblet i demomodus.</p>;
  if(!season)return <p>Velg en aktiv sesong før du legger til en motstander.</p>;
  return <section className="grid opponent-scouting" aria-label="Motstanderanalyse">
    <header className="competition-heading"><div><h2>Motstanderanalyse</h2><p>Se hvordan motstanderen spiller på tvers av oppgjør.</p></div>
      <button type="button" className="btn primary" aria-expanded={adding} disabled={busy} onClick={()=>{add(!adding);setPreview(undefined);}}>
        <Plus size={16} aria-hidden="true"/>{adding?"Lukk skjema":"Legg til motstander"}</button></header>
    <div className="event-panel season-filters">
      <label>Sesong<select disabled={busy} value={season} onChange={e=>chooseHistory(Number(e.target.value))}>
        {settings.options.some(option=>option.id===season)?null:<option value={season}>{season}</option>}
        {settings.options.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      {watch&&<label>Fulgt motstander<select disabled={busy} value={watch.org_id} onChange={e=>{select(Number(e.target.value));setHeadToHead(false);}}>
        {watches!.map(item=><option key={item.org_id} value={item.org_id}>{item.name}</option>)}
      </select></label>}
      {watch&&<button type="button" className="btn" disabled={busy} onClick={()=>void run("sync")}><RefreshCw size={16} aria-hidden="true"/>Hent kamper og hendelser</button>}
    </div>
    {(requested||upcoming)&&<p>Neste motstander: <strong>{requested||upcoming}</strong>. Søk opp laget hos NHF hvis du vil følge det.</p>}
    {adding&&<form className="event-panel grid" onSubmit={e=>{e.preventDefault();void run(preview?"save":"preview");}}>
      <p>Åpne <a href="https://www.handball.no/system/kamper/" target="_blank" rel="noreferrer">Kampsøk hos NHF</a>. Lim inn lagets terminlistelenke eller tallet etter <code>lagid=</code>. Du kan avgrense til bestemte turneringer med lenker eller <code>turnid=</code>.</p>
      <label>NHF-laglenke eller lag-ID<input required value={org} disabled={busy} onChange={e=>{setOrg(e.target.value);setPreview(undefined);}}/></label>
      <label>Turneringslenker eller ID-er, valgfritt<input value={leagues} disabled={busy} onChange={e=>{setLeagues(e.target.value);setPreview(undefined);}}/></label>
      {preview&&<div><strong>{preview.name}</strong><p>{preview.total} kamper · {preview.competitions.join(", ")||"Turnering ikke oppgitt"}</p></div>}
      <button className="btn primary" disabled={busy}>{preview?"Følg motstander og hent data":"Kontroller lag"}</button>
    </form>}
    {busy&&<p role="status">Henter fra NHF …</p>}
    {status&&<p role="status">{status}</p>}
    {error&&<p role="alert">{error}</p>}
    {watch?<><div className="day-strip">
      <small>Sist synkronisert {new Date(watch.synced_at).toLocaleString("nb-NO")} · NHF {watch.org_id}</small>
      <label><input type="checkbox" checked={headToHead} onChange={e=>setHeadToHead(e.target.checked)}/> Bare møter mot egne lag</label>
      </div>
      {ownLogState==="error"?<p role="alert">Kunne ikke kontrollere egne kamplogger. Last siden på nytt for å prøve igjen.</p>:ownLogState==="loading"||!packet?<p role="status">Sjekker egne kamplogger …</p>:
        <SeasonMatchStatistics key={season+":"+watch.org_id} team={team} games={packet.games} reports={packet.reports} teams={[]} history={season}
          comparison={{name:watch.name,logs:packet.logs,links:packet.links}}/>}
      </>:watches?.length===0&&!adding?<p>Ingen motstandere fulgt i denne sesongen.</p>:null}
  </section>;
}
