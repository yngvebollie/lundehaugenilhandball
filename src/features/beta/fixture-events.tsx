import {useEffect, useRef, useState, type FormEvent} from "react";
import {Volleyball, Square, Timer, Pencil} from "lucide-react";
import {db, demo, type Snapshot} from "@/lib/beta";
import {applyFixtureImport, fixtureEventDocument, parseFixtureEvents} from "@/lib/fixture-events";
import {clockSeconds,eventNames, formatMatchTime, liveScore, matchTimeline, newMatchEvent, parseMatchTime, penaltyNames, shirtNumber, type FixturePlayer, type LiveMatch, type MatchClock, type MatchEvent, type MatchSide, type PenaltyOutcome} from "@/lib/live-match";
import {matchPlayerProfiles,type MatchPlayerProfile} from "@/lib/match-player-profiles";
import type {Fixture} from "@/lib/match-journal";
import type {Report} from "@/lib/report-text";
import {useLiveMatchStorage} from "./live-match-storage";
import {FixtureEventStats} from "./fixture-event-stats";
import {ReportDownload} from "./report-download";
import {fixturePlayer,FixtureRoster} from "./fixture-roster";

type Props={game:Fixture;data:Snapshot;onChange:()=>Promise<void>;rosterOnly?:boolean;onOpenEvents?:()=>void};
const quickActions = [
 ["goal","Mål"],["suspension","2 min"],["warning","Gult kort"],["red","Rødt kort"],["penalty-goal","7 m mål"],
 ["penalty-miss","7 m bom"],["penalty-saved","7 m reddet"],
] as const;
type QuickAction=typeof quickActions[number][0];

export function FixtureEvents({game,data,onChange,rosterOnly,onOpenEvents}:Props) {
  const storage=useLiveMatchStorage(game.team,data.me.id,game.id);
  const row=storage.rows.find(row=>row.id===game.id);
  const stored=row?.document;
  const match=stored??fixtureEventDocument(game);
  const [draft,setDraft]=useState<MatchEvent|null>(null);
  const [raw,setRaw]=useState("");
  const [side,setSide]=useState<MatchSide>("home");
  const [origin,setOrigin]=useState<"manual"|"api">("manual");
  const [preview,setPreview]=useState<ReturnType<typeof parseFixtureEvents>|null>(null);
  const [error,setError]=useState("");
  const [tab,setTab]=useState<"events"|"stats">("events");
  const [profiles,setProfiles]=useState<MatchPlayerProfile[]>();
  const [profileError,setProfileError]=useState("");
  const [profileRetry,retryProfiles]=useState(0);
  const [action,setAction]=useState<QuickAction>("goal");
  const [quickSide,setQuickSide]=useState<"own"|"opponent">("own");
  const [quickNumber,setQuickNumber]=useState("");
  const [quickError,setQuickError]=useState("");
  const [fullscreen,setFullscreen]=useState(false);
  const [receipt,setReceipt]=useState<MatchEvent>();
  const screen=useRef<HTMLDialogElement>(null);
  const statistics=useRef<HTMLDivElement>(null);
  const endedClock=useRef<number|null>(null);
  const refreshAfterSave=useRef(false);
  const now=useFixtureClock(match.clock);
  const periodMinutes=fixtureEventDocument(game).periodMinutes??match.periodMinutes;
  const periodLimit=periodMinutes?periodMinutes*60:Infinity;
  const clockTime=Math.min(clockSeconds(match.clock,now),periodLimit);
  const roster=data.roster.filter(p=>p.role==="athlete"&&p.squad===game.team);
  const ownSide=game.opponent.trim().toLocaleLowerCase("nb-NO")===game.away?.trim().toLocaleLowerCase("nb-NO")?"home":"away";
  const opponentSide=ownSide==="home"?"away":"home";
  useEffect(()=>{
    let live=true;
    matchPlayerProfiles(game.team).then(rows=>{if(live){setProfiles(rows);setProfileError("");}})
     .catch(()=>{if(live)setProfileError("Kunne ikke laste de importerte spillerprofilene.");});
    return()=>{live=false;};
  },[game.team,profileRetry]);
  useEffect(()=>{
    const dialog=screen.current;
    if(fullscreen&&dialog&&!dialog.open)dialog.showModal();
    if(!fullscreen&&dialog?.open)dialog.close();
  },[fullscreen]);
  useEffect(()=>{
    const since=match.clock.since;
    if(rosterOnly||storage.loading||storage.loadError||match.clock.status!=="running"||since===null||clockTime<periodLimit||since===endedClock.current)return;
    endedClock.current=since;
    clockAction("end");
  },[clockTime,match.clock.status,match.clock.since,periodLimit,rosterOnly,storage.loading,storage.loadError]);
  const resolve=(id:string)=>fixturePlayer(id,roster,profiles??[]);
  const playersByIdentity=new Map<string,FixturePlayer>();
  for(const player of match.fixtureRoster??[]){
    const identity=resolve(player.id);
    const key=identity?.id??player.id;
    const previous=playersByIdentity.get(key);
    if(!previous||previous.number===undefined&&player.number!==undefined)
      playersByIdentity.set(key,{...player,name:identity?.name??player.name});
  }
  const players=[...playersByIdentity.values()];
  const logPlayers=match.fixtureRoster?players:roster.map(member=>resolve(member.id)!);
  const choices=[...logPlayers].filter(p=>p.number!==undefined).sort((a,b)=>a.number!-b.number!);
  const forEditor=[...new Map([...roster.map(member=>resolve(member.id)!),...logPlayers].map(player=>[player.id,player])).values()];
  const displayMatch={...match,events:match.events.map(event=>{
    const account=event.side===ownSide&&event.playerId?resolve(event.playerId):undefined;
    return account?{...event,playerId:account.id,playerName:account.name}:event;
  })};
  const timeline=matchTimeline(match.events);
  const manualProtected=origin==="api"&&(match.eventOrigin==="manual"||(!match.eventOrigin&&match.events.length>0));
  useEffect(()=>{
    if(!refreshAfterSave.current||storage.pending||storage.syncing||storage.saveError)return;
    refreshAfterSave.current=false;
    void onChange().catch(()=>setError("Kunne ikke oppdatere kampoversikten."));
  },[row,storage.pending,storage.syncing,storage.saveError,onChange]);

  async function validateImport() {
    setError("");
    setPreview(null);
    try{
      const key="kamper-private-report:"+game.team+":"+game.id;
      const report=(demo?JSON.parse(sessionStorage.getItem(key)||"null"):(await db!.rpc("beta_report",{action:"read",t:game.team,m:game.id}).throwOnError()).data) as {reviewed?:Report}|null;
      setPreview(parseFixtureEvents(raw,game,side,roster,report?.reviewed?.players??[]));
    }catch(e){setError(e instanceof Error?e.message:"Kunne ikke forhåndsvise importen.");}
  }

  function save(update:(previous:LiveMatch)=>LiveMatch) {
    const saved=storage.save(game.id,previous=>update(previous??fixtureEventDocument(game)));
    if(saved)refreshAfterSave.current=true;
    return saved;
  }

  function keep(event:MatchEvent) {
    const saved=save(previous=>({...previous,eventOrigin:"manual",events:previous.events.some(e=>e.id===event.id)?
      previous.events.map(e=>e.id===event.id?event:e):[...previous.events,event]}));
    if(saved)setDraft(null);
    return saved;
  }

  function updateRoster(update:(current:FixturePlayer[])=>FixturePlayer[]){
    return save(previous=>({...previous,fixtureRoster:update(previous.fixtureRoster??[])}));
  }
  function addPlayers(additions:FixturePlayer[]){
    return updateRoster(current=>{
      const next=[...current];
      for(const player of additions){
        if(next.some(row=>(resolve(row.id)?.id??row.id)===player.id))continue;
        next.push(next.some(row=>player.number!==undefined&&row.number===player.number)?{...player,number:undefined}:player);
      }
      return next;
    });
  }
  const rosterPanel=<FixtureRoster team={game.team} members={roster} profiles={profiles??[]} players={players}
    disabled={storage.loading||!!storage.loadError||!profiles} onProfiles={setProfiles} onAdd={addPlayers}
    onNumber={(id,number)=>updateRoster(current=>current.map(player=>player.id===id?{...player,number}:player))}
    onRemove={id=>updateRoster(current=>current.filter(player=>(resolve(player.id)?.id??player.id)!==(resolve(id)?.id??id)))}/>;
  const profileFeedback=profileError&&<p role="alert">{profileError} <button className="btn" type="button" onClick={()=>retryProfiles(n=>n+1)}>Prøv igjen</button></p>;
  function quickEvent(number:number|undefined,player?:FixturePlayer,target:MatchSide=quickSide==="own"?ownSide:opponentSide){
    const penalty=action.startsWith("penalty-");
    const type=penalty?"penalty":action as "goal"|"suspension"|"warning"|"red";
    const identity=player?(resolve(player.id)??player):undefined;
    const marker=newMatchEvent(match.clock,type);
    const event={...marker,seconds:Math.min(marker.seconds,periodLimit),side:target,number,
      playerId:identity?.id,playerName:identity?.name,outcome:penalty?action.split("-")[1] as PenaltyOutcome:undefined};
    if(keep(event)){setAction("goal");setReceipt(event);}
  }

  function clockAction(action:"start"|"stop"|"end") {
    save(previous=>{
      const clock=previous.clock;
      const marker=newMatchEvent(clock,"clock");
      marker.seconds=Math.min(marker.seconds,periodLimit);
      let next:MatchClock;
      let label:string;
      if(action==="end"){
        next={...clock,status:clock.half===1?"halftime":"finished",since:null,seconds:marker.seconds};
        label="Slutt "+clock.half+". omgang";
      }else if(action==="stop"){
        next={...clock,status:"paused",since:null,seconds:marker.seconds};label="Klokka stoppet";
      }else if(clock.status==="paused"){
        next={...clock,status:"running",since:marker.recordedAt};label="Klokka startet";
      }else{
        const half=clock.status==="halftime"?2:1;
        next={half,status:"running",since:marker.recordedAt,seconds:0};marker.half=half;marker.seconds=0;label="Start "+half+". omgang";
      }
      return {...previous,periodMinutes,eventOrigin:"manual",clock:next,finalized:next.status==="finished",events:[...previous.events,{...marker,label}]};
    });
  }
  function registerNumber(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const number=shirtNumber(quickNumber);
    if(number===null){setQuickError("Bruk et draktnummer fra 0 til 99.");return;}
    const matches=quickSide==="own"?choices.filter(player=>player.number===number):[];
    quickEvent(number,matches.length===1?matches[0]:undefined);
    setQuickNumber("");setQuickError("");
  }
  const clockLabel=match.clock.status==="running"?"Stopp klokka":match.clock.status==="paused"?"Fortsett klokka":"Start "+(match.clock.status==="halftime"?2:1)+". omgang";
  const clockButton=!game.completed&&match.clock.status!=="finished"&&<button type="button" className="btn primary" disabled={storage.loading||!!storage.loadError||!!draft} onClick={()=>clockAction(match.clock.status==="running"?"stop":"start")}>{clockLabel}</button>;

  if(rosterOnly)return <div className="grid">{rosterPanel}{profileFeedback}
    {storage.loadError&&<p role="alert">{storage.loadError} <button type="button" className="btn" onClick={()=>void storage.reload()}>Prøv igjen</button></p>}
    {storage.saveError&&<p role="alert">{storage.saveError} {storage.pending&&<button type="button" className="btn" onClick={()=>void storage.retry()}>Prøv lagring igjen</button>}</p>}
    {onOpenEvents&&<button className="btn primary" type="button" onClick={onOpenEvents}>Åpne hendelseslogging</button>}
  </div>;
  return <section className="grid fixture-event-section">
    {!!match.events.length&&<ReportDownload label="Last ned kamp og hendelser (PDF)" create={async()=>{
      const [{readSavedReport,reportPDFItem},{downloadMatchPDF}]=await Promise.all([import("@/lib/match-report-data"),import("@/lib/report-export")]);
      const item=reportPDFItem(game,await readSavedReport(game),displayMatch);
      await downloadMatchPDF(item.label,[item],"Kamprapport "+game.day+" "+item.label);
    }}/>}
    <div className="competition-heading"><div><h3>Hendelser</h3>
      <small>{match.events.length} hendelser · {match.home.name} {match.events.length?liveScore(match.events):game.score||liveScore(match.events)} {match.away.name}{match.eventOrigin==="api"?(match.events.some(e=>e.id.startsWith("nhf-public:"))?" · NHFs offentlige kampside":" · Importert feed"):match.eventOrigin==="manual"?" · Manuell logg":""}</small></div>
      <div className="day-strip"><button className="btn primary" type="button" disabled={storage.loading||!!storage.loadError||!!draft} onClick={()=>{setAction("goal");setFullscreen(true);}}>Åpne fullskjermlogging</button>
      {(game.score||match.events.some(event=>event.type!=="clock"))&&<button className="btn" type="button" onClick={()=>{setDraft(null);setTab("stats");requestAnimationFrame(()=>statistics.current?.focus());}}>Analyser kamp</button>}
      <button className="btn" type="button" disabled={storage.loading||!!draft} onClick={()=>setDraft({
        ...newMatchEvent(match.clock,"goal"),side:ownSide,
      })}>Legg til hendelse</button></div>
    </div>
    <dialog ref={screen} className="fixture-fullscreen" aria-labelledby="fixture-fullscreen-title" onClose={()=>setFullscreen(false)}>
      {fullscreen&&<div className="fixture-fullscreen-content">
        <header className="fixture-fullscreen-header"><h3 id="fixture-fullscreen-title">Kamplogg</h3><button className="btn" type="button" onClick={()=>setFullscreen(false)}>Lukk fullskjerm</button></header>
        <div className="live-score"><b>{match.home.name}</b><strong>{liveScore(match.events)}</strong><b>{match.away.name}</b></div>
        <div className="fixture-fullscreen-clock"><strong>{match.clock.half}. omgang · {formatMatchTime(clockTime)}{periodMinutes?" / "+periodMinutes+":00":""}</strong>
          {match.clock.status==="halftime"&&<span>Pause</span>}{match.clock.status==="finished"&&<span>Fulltid</span>}{clockButton}</div>
        <div className="fixture-fullscreen-actions" role="group" aria-label="Neste hendelse">{quickActions.filter(([value])=>value!=="goal").map(([value,label])=>
          <button className={"btn"+(value===action?" primary":"")} type="button" key={value} aria-pressed={value===action}
           onClick={()=>setAction(current=>current===value?"goal":value)}>{label}</button>)}</div>
        <p className="fixture-fullscreen-mode" role="status">Neste trykk registrerer <strong>{quickActions.find(([value])=>value===action)?.[1]}</strong>.</p>
        <div className="fixture-fullscreen-players" aria-label="Draktnumre for eget lag">
          {choices.map(player=><button key={player.id} type="button" className="btn primary" onClick={()=>quickEvent(player.number,player,ownSide)}
            aria-label={"Draktnummer "+player.number+" · "+player.name}><strong>#{player.number}</strong><small>{player.name}</small></button>)}
        </div>
        {!choices.length&&<p>Legg inn draktnumre i kamptroppen eller registrer på nummer nedenfor.</p>}
        <button type="button" className="btn fixture-fullscreen-opponent" onClick={()=>quickEvent(undefined,undefined,opponentSide)}>{match[opponentSide].name}</button>
        <form className="day-strip" onSubmit={registerNumber}>
          <label>Lag<select value={quickSide} onChange={e=>setQuickSide(e.target.value==="own"?"own":"opponent")}><option value="own">{match[ownSide].name}</option><option value="opponent">{match[opponentSide].name}</option></select></label>
          <label>Draktnummer<input inputMode="numeric" maxLength={2} value={quickNumber} onChange={e=>{setQuickNumber(e.target.value);setQuickError("");}}/></label>
          <button type="submit" className="btn" disabled={!quickNumber.trim()}>Registrer</button>
        </form>
        {quickError&&<p role="alert">{quickError}</p>}
        {storage.saveError?<p role="alert">{storage.saveError} {storage.pending&&<button type="button" className="btn" onClick={()=>void storage.retry()}>Prøv igjen</button>}</p>:<p role="status">
          {receipt&&(receipt.number===undefined?match[receipt.side!].name:"#"+receipt.number)+" · "+eventNames[receipt.type as Exclude<MatchEvent["type"],"clock">]+(receipt.outcome?" · "+penaltyNames[receipt.outcome]:"")+" · "}
          {receipt?(storage.pending?"Lagret på enheten. Synkroniserer …":"Lagret."):""}
        </p>}
        <button className="btn" type="button" onClick={()=>{setTab("events");setFullscreen(false);if(receipt)setDraft(match.events.find(event=>event.id===receipt.id)??null);}}>{receipt?"Rett siste hendelse":"Åpne hendelsesloggen"}</button>
      </div>}
    </dialog>
    {!game.completed&&match.clock.status!=="finished"&&<div className="day-strip">
      <strong>{match.clock.half}. omgang · {formatMatchTime(clockTime)}{periodMinutes?" / "+periodMinutes+":00":""}</strong>
      {clockButton}
      {["running","paused"].includes(match.clock.status)&&<button type="button" className="btn" disabled={!!draft} onClick={()=>clockAction("end")}>Avslutt {match.clock.half}. omgang</button>}
    </div>}
    {!draft&&!storage.loading&&!storage.loadError&&<section className="live-panel grid">
      <h3>Hurtiglogg på draktnummer</h3>
      <div className="day-strip"><label>Hendelse<select value={action} onChange={e=>setAction(e.target.value as QuickAction)}>
        {quickActions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Lag<select value={quickSide} onChange={e=>setQuickSide(e.target.value==="own"?"own":"opponent")}>
          <option value="own">{match[ownSide].name}</option><option value="opponent">{match[opponentSide].name}</option>
        </select></label></div>
      {quickSide==="own"&&choices.length>0&&<div className="live-player-buttons">{choices.map(player=><button key={player.id} type="button" className="btn primary"
        aria-label={"Registrer "+quickActions.find(([value])=>value===action)?.[1]+" for draktnummer "+player.number}
        onClick={()=>quickEvent(player.number!,player)}><strong>#{player.number}</strong><small>{player.name}</small></button>)}</div>}
      <form className="day-strip" onSubmit={registerNumber}>
        <label>Draktnummer<input inputMode="numeric" maxLength={2} value={quickNumber} onChange={e=>{setQuickNumber(e.target.value);setQuickError("");}}/></label>
        <button type="submit" className="btn" disabled={!quickNumber.trim()}>Registrer på nummer</button>
        {quickError&&<p role="alert">{quickError}</p>}
      </form>
      <details className="library-tools"><summary>Administrer kamptroppen</summary>{rosterPanel}{profileFeedback}</details>
    </section>}
    {storage.loading&&<p role="status">Henter hendelser …</p>}
    {storage.loadError&&<p role="alert">{storage.loadError} <button type="button" className="btn" onClick={()=>void storage.reload()}>Prøv igjen</button></p>}
    {storage.saveError?<p role="alert">{storage.saveError} {storage.pending&&<button type="button" className="btn" onClick={()=>void storage.retry()}>Prøv lagring igjen</button>}</p>:
      storage.pending?<small role="status">Lagret på enheten. Synkroniserer …</small>:stored&&<small role="status">Hendelsene er lagret.</small>}
    {draft&&<FixtureEventForm key={draft.id} draft={draft} match={match} roster={forEditor} ownSide={ownSide}
      onSave={keep} onCancel={()=>setDraft(null)} onRemove={match.events.some(e=>e.id===draft.id)?()=>{
        if(save(previous=>({...previous,eventOrigin:"manual",events:previous.events.filter(e=>e.id!==draft.id)})))setDraft(null);
      }:undefined}/>}
    <div className="day-strip"><button type="button" className="btn" aria-pressed={tab==="events"} onClick={()=>setTab("events")}>Hendelseslogg</button>
      <button type="button" className="btn" aria-pressed={tab==="stats"} onClick={()=>setTab("stats")}>Statistikk</button></div>
    {tab==="events"?(timeline.length?<div className="fixture-event-scroll" role="region" aria-label="Alle kamphendelser" tabIndex={0}>
      <table className="table fixture-event-table"><thead><tr><th scope="col">Omg. tid</th><th scope="col">Hendelse</th><th scope="col">Stilling</th></tr></thead>
      <tbody>{timeline.map(({event,home,away},index)=>{
        const type=event.type==="clock"?event.label:eventNames[event.type]+(event.type==="penalty"&&event.outcome?" · "+penaltyNames[event.outcome]:"");
        const Icon=event.type==="goal"||event.type==="penalty"?Volleyball:event.type==="warning"?Square:Timer;
        const player=(event.side===ownSide&&event.playerId?resolve(event.playerId)?.name:undefined)??event.playerName;
        const identity=[event.number===undefined?null:"#"+event.number,player].filter(Boolean).join(" ");
        const team=event.side?match[event.side].name:"";
        const breakRow=index>0&&timeline[index-1].event.half!==event.half;
        return <EventRows key={event.id} pause={breakRow?timeline[index-1].home+"–"+timeline[index-1].away:undefined}>
          <td><time>{event.half}. {formatMatchTime(event.seconds)}{event.id.startsWith("json:")?"*":""}</time></td>
          <td><button type="button" className="fixture-event-open" data-side={event.side} onClick={()=>setDraft(event)}>
            <Icon size={15} aria-hidden="true"/><span><strong>{identity||team||type}</strong><small>{[type,identity?team:""].filter(Boolean).join(" · ")}</small></span><Pencil size={13} aria-hidden="true"/>
          </button></td><td><b>{home}–{away}</b></td>
        </EventRows>;
      })}</tbody></table></div>:!storage.loading&&<p>Ingen hendelser registrert på denne kampen.</p>):<div ref={statistics} tabIndex={-1}><FixtureEventStats match={displayMatch} ownSide={ownSide} officialScore={game.score}/></div>}
    {tab==="events"&&match.events.some(event=>event.id.startsWith("json:"))&&<small>* Importert tid er oppgitt med minuttpresisjon.</small>}
    <details className="library-tools"><summary>Importer hendelser fra JSON</summary>
      <div className="grid">
        <label>Hendelsesfil<input type="file" accept="application/json,.json" onChange={event=>{
          const file=event.target.files?.[0];setPreview(null);setError("");setRaw("");
          if(file){if(file.size>500_000)setError("Hendelsesfilen er for stor.");else void file.text().then(setRaw).catch(()=>setError("Kunne ikke lese filen."));}
        }}/></label>
        <label>Hvilket lag er «home» i filen?<select value={side} onChange={e=>{setSide(e.target.value==="home"?"home":"away");setPreview(null);}}>
          <option value="home">{match.home.name}</option><option value="away">{match.away.name}</option>
        </select></label>
        <label>Kilde<select value={origin} onChange={e=>{setOrigin(e.target.value==="api"?"api":"manual");setPreview(null);}}>
          <option value="manual">Manuelt innsamlet</option><option value="api">Bearbeidet feed-eksport</option>
        </select></label>
        <button type="button" className="btn" disabled={!raw||storage.loading} onClick={()=>void validateImport()}>Forhåndsvis import</button>
        {preview&&<div className="grid">
          <p>{preview.events.length} hendelser · {match.home.name} {liveScore(preview.events)} {match.away.name}</p>
          {preview.warning&&<p role="alert">{preview.warning}</p>}
          {manualProtected?<p>Den manuelle loggen beholdes. Import fra feed kan ikke erstatte den.</p>:
           match.importDigest===preview.digest&&(origin==="api"||match.eventOrigin==="manual")?<p>Filen er allerede importert. Ingen nye hendelser legges til.</p>:<>
            {match.events.length>0&&<p>Importen vil erstatte de {match.events.length} lagrede hendelsene.</p>}
            <button type="button" className="btn primary" onClick={()=>{
              if(save(previous=>applyFixtureImport(previous,preview,origin)))setPreview(null);
            }}>{match.events.length?"Bekreft og erstatt hendelser":"Bekreft import"}</button>
          </>}
        </div>}
      </div>
    </details>
    {error&&<p role="alert">{error}</p>}
  </section>;
}

function useFixtureClock(clock:MatchClock) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{
    if(clock.since===null)return;
    const timer=window.setInterval(()=>setNow(Date.now()),250);
    return ()=>window.clearInterval(timer);
  },[clock.since]);
  return now;
}

function EventRows({pause,children}:{pause?:string;children:React.ReactNode}) {
  return <>{pause&&<tr className="fixture-event-pause"><td colSpan={3}>Pause · {pause}</td></tr>}<tr>{children}</tr></>;
}

function FixtureEventForm({draft,match,roster,ownSide,onSave,onCancel,onRemove}:{
  draft:MatchEvent;match:LiveMatch;roster:FixturePlayer[];ownSide:MatchSide;
  onSave:(event:MatchEvent)=>void;onCancel:()=>void;onRemove?:()=>void;
}) {
  const [side,setSide]=useState<MatchSide>(draft.side??ownSide);
  const [id,setId]=useState(draft.playerId??"");
  const [type,setType]=useState(draft.type);
  const [outcome,setOutcome]=useState<PenaltyOutcome>(draft.outcome??"goal");
  const [error,setError]=useState("");
  const [removing,setRemoving]=useState(false);
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fields=new FormData(e.currentTarget),seconds=parseMatchTime(String(fields.get("time")));
    if(seconds===null)return setError("Skriv kamptid som mm:ss.");
    const numberText=String(fields.get("number")??"").trim(),number=numberText?shirtNumber(numberText):null;
    if(numberText&&number===null)return setError("Skriv et draktnummer fra 0 til 99.");
    const player=side===ownSide?roster.find(p=>p.id===id):undefined;
    if(type!=="clock"&&!Object.hasOwn(eventNames,type))return setError("Velg en hendelsestype.");
    onSave({...draft,side:type==="clock"?undefined:side,half:fields.get("half")==="2"?2:1,seconds,type:type as MatchEvent["type"],
      playerId:type==="timeout"||type==="clock"?undefined:player?.id,
      playerName:type==="timeout"||type==="clock"?undefined:player?.name||String(fields.get("player")??"").trim()||undefined,
      number:type==="timeout"||type==="clock"?undefined:number??player?.number,
      outcome:type==="penalty"?outcome:undefined,
    });
  }
  return <form className="grid live-panel live-form" onSubmit={submit}>
    <h3>Hendelsesdetaljer</h3>
    <div className="live-pair"><label>Omgang<select name="half" defaultValue={draft.half}><option value="1">1. omgang</option><option value="2">2. omgang</option></select></label>
      <label>Kamptid<input required name="time" defaultValue={formatMatchTime(draft.seconds)}/></label></div>
    <div className="live-pair"><label>Hendelse<select value={type} onChange={e=>setType(e.target.value as MatchEvent["type"])}>
      {draft.type==="clock"&&<option value="clock">{draft.label||"Klokke"}</option>}
      {Object.entries(eventNames).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>
      <label>Lag<select value={side} onChange={e=>{setSide(e.target.value==="home"?"home":"away");setId("");}}>
        <option value="home">{match.home.name}</option><option value="away">{match.away.name}</option>
      </select></label></div>
    {side===ownSide&&<label>Koble til utøverprofil<select value={id} onChange={e=>setId(e.target.value)}>
      <option value="">Ingen profil valgt</option>{roster.map(p=><option key={p.id} value={p.id}>{p.number!==undefined&&"#"+p.number+" · "}{p.name}</option>)}
    </select></label>}
    {type==="penalty"&&<label>Utfall på 7-meter<select value={outcome} onChange={e=>setOutcome(e.target.value as PenaltyOutcome)}>{Object.entries(penaltyNames).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
    <div className="live-pair"><label>Draktnummer<input name="number" inputMode="numeric" maxLength={2} defaultValue={draft.number}/></label>
      <label>Navn (valgfritt)<input name="player" maxLength={150} defaultValue={draft.playerName}/></label></div>
    {error&&<p role="alert">{error}</p>}
    <div className="day-strip"><button className="btn primary">Lagre hendelse</button><button className="btn" type="button" onClick={onCancel}>Avbryt</button>
      {onRemove&&<button className="btn" type="button" onClick={()=>removing?onRemove():setRemoving(true)}>{removing?"Bekreft fjerning":"Fjern hendelse"}</button>}</div>
  </form>;
}

