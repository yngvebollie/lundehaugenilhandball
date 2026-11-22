import {useEffect, useRef, useState, type FormEvent} from "react";
import {Volleyball, Square, Timer, Pencil} from "lucide-react";
import {db, demo, type Snapshot} from "@/lib/beta";
import {applyFixtureImport, fixtureEventDocument, parseFixtureEvents} from "@/lib/fixture-events";
import {clockSeconds,eventNames, formatMatchTime, liveScore, matchTimeline, newMatchEvent, parseMatchTime, shirtNumber, type LiveMatch, type MatchClock, type MatchEvent, type MatchSide} from "@/lib/live-match";
import type {Fixture} from "@/lib/match-journal";
import type {Report} from "@/lib/report-text";
import {useLiveMatchStorage} from "./live-match-storage";
import {FixtureEventStats} from "./fixture-event-stats";

type Props={game:Fixture;data:Snapshot;onChange:()=>Promise<void>};

export function FixtureEvents({game,data,onChange}:Props) {
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
  const refreshAfterSave=useRef(false);
  const now=useFixtureClock(match.clock);
  const roster=data.roster.filter(p=>p.role==="athlete"&&p.squad===game.team);
  const ownSide=game.opponent.trim().toLocaleLowerCase("nb-NO")===game.away?.trim().toLocaleLowerCase("nb-NO")?"home":"away";
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
    if(save(previous=>({...previous,eventOrigin:"manual",events:previous.events.some(e=>e.id===event.id)?
      previous.events.map(e=>e.id===event.id?event:e):[...previous.events,event]}))) setDraft(null);
  }

  function clockAction(action:"start"|"stop"|"end") {
    save(previous=>{
      const clock=previous.clock;
      const marker=newMatchEvent(clock,"clock");
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
      return {...previous,eventOrigin:"manual",clock:next,finalized:next.status==="finished",events:[...previous.events,{...marker,label}]};
    });
  }

  return <section className="grid fixture-event-section">
    <div className="competition-heading"><div><h3>Hendelser</h3>
      <small>{match.events.length} hendelser · {match.home.name} {liveScore(match.events)} {match.away.name}{match.eventOrigin==="api"?" · Importert feed":match.eventOrigin==="manual"?" · Manuell logg":""}</small></div>
      <button className="btn primary" type="button" disabled={storage.loading||!!draft} onClick={()=>setDraft({
        ...newMatchEvent(match.clock,"goal"),side:ownSide,
      })}>Legg til hendelse</button>
    </div>
    {!game.completed&&match.clock.status!=="finished"&&<div className="day-strip">
      <strong>{match.clock.half}. omgang · {formatMatchTime(clockSeconds(match.clock,now))}</strong>
      <button type="button" className="btn" disabled={storage.loading||!!draft} onClick={()=>clockAction(match.clock.status==="running"?"stop":"start")}>
        {match.clock.status==="running"?"Stopp klokka":match.clock.status==="paused"?"Fortsett klokka":"Start "+(match.clock.status==="halftime"?2:1)+". omgang"}
      </button>
      {["running","paused"].includes(match.clock.status)&&<button type="button" className="btn" disabled={!!draft} onClick={()=>clockAction("end")}>Avslutt {match.clock.half}. omgang</button>}
    </div>}
    {!game.completed&&match.clock.status==="running"&&roster.length>0&&<details className="library-tools">
      <summary>Mål til {match[ownSide].name}</summary><div className="day-strip">
        {roster.filter(p=>p.shirt_number&&shirtNumber(p.shirt_number)!==null).map(p=><button key={p.id} type="button" className="btn"
          disabled={!!draft} onClick={()=>keep({...newMatchEvent(match.clock,"goal"),side:ownSide,playerId:p.id,playerName:p.name,number:shirtNumber(p.shirt_number!)!})}>
          #{p.shirt_number} {p.name}
        </button>)}
        <button type="button" className="btn" disabled={!!draft} onClick={()=>keep({...newMatchEvent(match.clock,"goal"),side:ownSide==="home"?"away":"home"})}>Mål til {match[ownSide==="home"?"away":"home"].name}</button>
      </div></details>}
    {storage.loading&&<p role="status">Henter hendelser …</p>}
    {storage.loadError&&<p role="alert">{storage.loadError} <button type="button" className="btn" onClick={()=>void storage.reload()}>Prøv igjen</button></p>}
    {storage.saveError?<p role="alert">{storage.saveError} {storage.pending&&<button type="button" className="btn" onClick={()=>void storage.retry()}>Prøv lagring igjen</button>}</p>:
      storage.pending?<small role="status">Lagret på enheten. Synkroniserer …</small>:stored&&<small role="status">Hendelsene er lagret.</small>}
    {draft&&<FixtureEventForm key={draft.id} draft={draft} match={match} roster={roster} ownSide={ownSide}
      onSave={keep} onCancel={()=>setDraft(null)} onRemove={match.events.some(e=>e.id===draft.id)?()=>{
        if(save(previous=>({...previous,eventOrigin:"manual",events:previous.events.filter(e=>e.id!==draft.id)})))setDraft(null);
      }:undefined}/>}
    <div className="day-strip"><button type="button" className="btn" aria-pressed={tab==="events"} onClick={()=>setTab("events")}>Hendelseslogg</button>
      <button type="button" className="btn" aria-pressed={tab==="stats"} onClick={()=>setTab("stats")}>Statistikk</button></div>
    {tab==="events"?(timeline.length?<div className="fixture-event-scroll" role="region" aria-label="Alle kamphendelser" tabIndex={0}>
      <table className="table fixture-event-table"><thead><tr><th scope="col">Omg. tid</th><th scope="col">Hendelse</th><th scope="col">Stilling</th></tr></thead>
      <tbody>{timeline.map(({event,home,away},index)=>{
        const type=event.type==="clock"?event.label:eventNames[event.type];
        const Icon=event.type==="goal"||event.type==="penalty"?Volleyball:event.type==="warning"?Square:Timer;
        const player=event.playerName??roster.find(p=>p.id===event.playerId)?.name;
        const identity=[event.number===undefined?null:"#"+event.number,player].filter(Boolean).join(" ");
        const team=event.side?match[event.side].name:"";
        const breakRow=index>0&&timeline[index-1].event.half!==event.half;
        return <EventRows key={event.id} pause={breakRow?timeline[index-1].home+"–"+timeline[index-1].away:undefined}>
          <td><time>{event.half}. {formatMatchTime(event.seconds)}{event.id.startsWith("json:")?"*":""}</time></td>
          <td><button type="button" className="fixture-event-open" data-side={event.side} onClick={()=>setDraft(event)}>
            <Icon size={15} aria-hidden="true"/><span><strong>{identity||team||type}</strong><small>{[type,identity?team:""].filter(Boolean).join(" · ")}</small></span><Pencil size={13} aria-hidden="true"/>
          </button></td><td><b>{home}–{away}</b></td>
        </EventRows>;
      })}</tbody></table></div>:!storage.loading&&<p>Ingen hendelser registrert på denne kampen.</p>):<FixtureEventStats match={match} ownSide={ownSide}/>}
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
  draft:MatchEvent;match:LiveMatch;roster:Snapshot["roster"];ownSide:MatchSide;
  onSave:(event:MatchEvent)=>void;onCancel:()=>void;onRemove?:()=>void;
}) {
  const [side,setSide]=useState<MatchSide>(draft.side??ownSide);
  const [id,setId]=useState(draft.playerId??"");
  const [error,setError]=useState("");
  const [removing,setRemoving]=useState(false);
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fields=new FormData(e.currentTarget),seconds=parseMatchTime(String(fields.get("time")));
    if(seconds===null)return setError("Skriv kamptid som mm:ss.");
    const numberText=String(fields.get("number")??"").trim(),number=numberText?shirtNumber(numberText):null;
    if(numberText&&number===null)return setError("Skriv et draktnummer fra 0 til 99.");
    const player=side===ownSide?roster.find(p=>p.id===id):undefined;
    const type=String(fields.get("type"));
    if(type!=="clock"&&!Object.hasOwn(eventNames,type))return setError("Velg en hendelsestype.");
    onSave({...draft,side:type==="clock"?undefined:side,half:fields.get("half")==="2"?2:1,seconds,type:type as MatchEvent["type"],
      playerId:type==="timeout"||type==="clock"?undefined:player?.id,
      playerName:type==="timeout"||type==="clock"?undefined:player?.name||String(fields.get("player")??"").trim()||undefined,
      number:type==="timeout"||type==="clock"?undefined:number??(player?.shirt_number?shirtNumber(player.shirt_number)??undefined:undefined),
      outcome:type==="penalty"?draft.outcome??"goal":undefined,
    });
  }
  return <form className="grid live-panel live-form" onSubmit={submit}>
    <h3>Hendelsesdetaljer</h3>
    <div className="live-pair"><label>Omgang<select name="half" defaultValue={draft.half}><option value="1">1. omgang</option><option value="2">2. omgang</option></select></label>
      <label>Kamptid<input required name="time" defaultValue={formatMatchTime(draft.seconds)}/></label></div>
    <div className="live-pair"><label>Hendelse<select name="type" defaultValue={draft.type}>
      {draft.type==="clock"&&<option value="clock">{draft.label||"Klokke"}</option>}
      {Object.entries(eventNames).map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>
      <label>Lag<select value={side} onChange={e=>{setSide(e.target.value==="home"?"home":"away");setId("");}}>
        <option value="home">{match.home.name}</option><option value="away">{match.away.name}</option>
      </select></label></div>
    {side===ownSide&&<label>Koble til utøverprofil<select value={id} onChange={e=>setId(e.target.value)}>
      <option value="">Ingen profil valgt</option>{roster.map(p=><option key={p.id} value={p.id}>{p.shirt_number&&"#"+p.shirt_number+" · "}{p.name}</option>)}
    </select></label>}
    <div className="live-pair"><label>Draktnummer<input name="number" inputMode="numeric" maxLength={2} defaultValue={draft.number}/></label>
      <label>Navn (valgfritt)<input name="player" maxLength={150} defaultValue={draft.playerName}/></label></div>
    {error&&<p role="alert">{error}</p>}
    <div className="day-strip"><button className="btn primary">Lagre hendelse</button><button className="btn" type="button" onClick={onCancel}>Avbryt</button>
      {onRemove&&<button className="btn" type="button" onClick={()=>removing?onRemove():setRemoving(true)}>{removing?"Bekreft fjerning":"Fjern hendelse"}</button>}</div>
  </form>;
}

