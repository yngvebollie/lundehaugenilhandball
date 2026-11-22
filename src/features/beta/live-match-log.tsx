import {useEffect, useState, type FormEvent} from "react";
import {
  appendMatchEvent, clockSeconds, eventNames, formatMatchTime, liveScore, matchProtocol, matchTimeline,
  newMatchEvent, parseMatchTime, penaltyNames, shirtNumber,
  type LiveMatch, type MatchClock, type MatchEvent, type MatchEventType, type MatchSide, type PenaltyOutcome,
} from "@/lib/live-match";

type Props = {
  match: LiveMatch;
  save: (update: (match: LiveMatch) => LiveMatch) => boolean;
  close: () => void;
  editLineup: () => void;
};
type Draft = {kind: "add" | "edit" | "clock" | "end"; event: MatchEvent; awayOnly?: boolean};
const tabs = {register: "Registrer", timeline: "Hendelseslogg", report: "Kamprapport"};
const actions = {running: "Klokka går", ready: "Klar til start", paused: "Klokka stoppet", timeout: "Timeout", halftime: "Pause", finished: "Fulltid"};

function eventDescription(match: LiveMatch, event: MatchEvent) {
  if (event.type === "clock") return event.label ?? "Kampklokke";
  const player = match.players.find(player => player.id === event.playerId);
  return [
    eventNames[event.type],
    event.outcome && penaltyNames[event.outcome],
    event.side && match[event.side].name,
    event.number !== undefined && "#" + event.number,
    player?.name,
  ].filter(Boolean).join(" · ");
}

export function LiveMatchLog({match, save, close, editLineup}: Props) {
  const [tab, setTab] = useState<keyof typeof tabs>(match.clock.status === "finished" ? "report" : "register");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [receipt, setReceipt] = useState<MatchEvent | null>(null);
  const clock = match.clock;
  const inPlay = clock.status === "running" || clock.status === "paused" || clock.status === "timeout";

  function open(type: MatchEventType, side: MatchSide = "home", awayOnly = false) {
    setDraft({kind: "add", awayOnly, event: {...newMatchEvent(clock, type), side}});
  }

  function start() {
    save(current => {
      const starting: MatchClock = {half: current.clock.status === "halftime" ? 2 : 1, status: "running", seconds: 0, since: Date.now()};
      const event = {...newMatchEvent(starting, "clock"), seconds: 0, label: "Start " + starting.half + ". omgang"};
      return appendMatchEvent({...current, clock: starting}, event);
    });
  }

  function toggleClock() {
    save(current => {
      const playing = current.clock.status === "running";
      const event = newMatchEvent(current.clock, "clock");
      const changed: MatchClock = {...current.clock, status: playing ? "paused" : "running", seconds: event.seconds, since: playing ? null : event.recordedAt};
      return appendMatchEvent({...current, clock: changed}, {...event, label: playing ? "Klokka stoppet" : "Klokka startet"});
    });
  }

  function quickGoal(id: string) {
    const player = match.players.find(player => player.id === id);
    if (!player) return;
    const event: MatchEvent = {...newMatchEvent(clock, "goal"), side: "home", playerId: player.id, number: player.number};
    if (save(current => appendMatchEvent(current, event))) setReceipt(event);
  }

  function submit(event: MatchEvent) {
    if (!draft) return;
    const {kind} = draft;
    if (save(current => {
      if (kind === "edit") return {...current, finalized: false, events: current.events.map(row => row.id === event.id ? event : row)};
      if (kind === "clock") {
        const next = {...current.clock, seconds: event.seconds, since: current.clock.status === "running" ? Date.now() : null};
        return appendMatchEvent({...current, clock: next}, {...event, label: "Kampklokka justert"});
      }
      if (kind === "end") {
        const next: MatchClock = {...current.clock, status: event.half === 1 ? "halftime" : "finished", seconds: event.seconds, since: null};
        return appendMatchEvent({...current, clock: next}, {...event, label: "Slutt " + event.half + ". omgang"});
      }
      const next = event.type === "timeout"
        ? {...current, clock: {...current.clock, status: "timeout" as const, seconds: event.seconds, since: null}}
        : current;
      return appendMatchEvent(next, event);
    })) {
      if (kind === "add") setReceipt(event);
      if (kind === "end" && event.half === 2) setTab("report");
      setDraft(null);
    }
  }

  return <div className="grid live-log">
    <div className="day-strip">
      <button type="button" className="btn" onClick={close}>‹ Logg kamp</button>
      <button type="button" className="btn" disabled={!!draft} onClick={editLineup}>Rediger kamptropp</button>
    </div>
    <section className="live-panel grid" aria-label="Stilling og kampklokke">
      <div className="live-score"><b>{match.home.name}</b><strong>{liveScore(match.events)}</strong><b>{match.away.name}</b></div>
      <div className="live-clock"><span>{clock.half}. omgang · {actions[clock.status]}</span>
        <button type="button" className="btn" disabled={!!draft || !inPlay} aria-label="Juster kampklokka"
          onClick={() => setDraft({kind: "clock", event: newMatchEvent(clock, "clock")})}><ClockValue clock={clock}/> · Juster</button></div>
      {(clock.status === "ready" || clock.status === "halftime") && <button type="button" className="btn primary" disabled={!!draft}
        onClick={start}>Start {clock.status === "ready" ? 1 : 2}. omgang</button>}
      {inPlay && <div className="live-pair">
        <button type="button" className="btn primary" disabled={!!draft} onClick={toggleClock}>{clock.status === "running" ? "Stopp klokka" : "Fortsett klokka"}</button>
        <button type="button" className="btn" disabled={!!draft} onClick={() => setDraft({kind: "end", event: newMatchEvent(clock, "clock")})}>Avslutt {clock.half}. omgang</button>
      </div>}
    </section>
    <nav className="workspace-tabs" aria-label="Kampføring">
      {(Object.keys(tabs) as (keyof typeof tabs)[]).map(key => <button type="button" className={tab === key ? "current" : ""}
        aria-pressed={tab === key} key={key} disabled={!!draft} onClick={() => setTab(key)}>{tabs[key]}</button>)}
    </nav>
    {draft ? <EventEditor match={match} draft={draft} onSave={submit} onCancel={() => setDraft(null)}/> :
      tab === "register" ? <div className="grid">
        <h3>Mål til {match.home.name}</h3>
        <div className="live-player-buttons">{match.players.map(player => <button key={player.id} className="btn primary" type="button" disabled={!inPlay}
          aria-label={"Mål til nummer " + player.number + ", " + player.name} onClick={() => quickGoal(player.id)}>
          <strong>#{player.number}</strong><small>{player.name}</small>
        </button>)}</div>
        <button type="button" className="btn" disabled={!inPlay} onClick={() => open("goal", "away", true)}>+ Mål til {match.away.name}</button>
        <div className="live-pair">{(["penalty", "suspension", "warning", "timeout"] as const).map(type =>
          <button type="button" className="btn" key={type} disabled={!inPlay || type === "timeout" && clock.status === "timeout"}
            onClick={() => open(type)}>{eventNames[type]}</button>)}</div>
        {receipt && <div className="day-strip"><span role="status">{formatMatchTime(receipt.seconds)} · {eventDescription(match, receipt)}</span>
          {receipt.type !== "timeout" && match.events.at(-1)?.id === receipt.id && <button type="button" className="btn" onClick={() => {
            if (save(current => ({...current, events: current.events.filter(event => event.id !== receipt.id), finalized: false}))) setReceipt(null);
          }}>Angre</button>}</div>}
      </div> : tab === "timeline" ? <div className="grid">
        <h3>Hendelseslogg</h3>
        <small>Omgang · kamptid · hendelse · stilling. Trykk på en rad for å rette den.</small>
        {!match.events.length && <p>Ingen hendelser registrert.</p>}
        <ol className="live-timeline">{matchTimeline(match.events).map(({event, home, away}) => <li key={event.id}>
          <button type="button" className="btn" onClick={() => setDraft({kind: "edit", event})}>
            <time>{event.half}. · {formatMatchTime(event.seconds)}</time><span>{eventDescription(match, event)}</span><b>{home}–{away}</b>
          </button>
        </li>)}</ol>
      </div> : <MatchReport match={match} finalize={() => save(current => ({...current, finalized: true}))}/>}
  </div>;
}

function ClockValue({clock}: {clock: MatchClock}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (clock.since === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(interval);
  }, [clock.since]);
  return <strong>{formatMatchTime(clockSeconds(clock, now))}</strong>;
}

function EventEditor({match, draft, onSave, onCancel}: {match: LiveMatch; draft: Draft; onSave: (event: MatchEvent) => void; onCancel: () => void}) {
  const {kind, event} = draft;
  const [side, setSide] = useState<MatchSide>(event.side ?? "home");
  const [playerId, setPlayerId] = useState(event.playerId ?? "");
  const [awayNumber, setAwayNumber] = useState(event.side === "away" && event.number !== undefined ? String(event.number) : "");
  const [half, setHalf] = useState(event.half);
  const [time, setTime] = useState(formatMatchTime(event.seconds));
  const [outcome, setOutcome] = useState<PenaltyOutcome>(event.outcome ?? "goal");
  const [error, setError] = useState("");
  const hasTeam = event.type !== "clock";
  const hasPlayer = hasTeam && event.type !== "timeout";
  const title = kind === "end" ? "Avslutt " + half + ". omgang?" : kind === "clock" ? "Juster kampklokka" :
    kind === "edit" ? "Rett hendelse" : event.type === "goal" && side === "away" ? "Mål til " + match.away.name : eventNames[event.type as keyof typeof eventNames];

  function submit(form: FormEvent<HTMLFormElement>) {
    form.preventDefault();
    const seconds = parseMatchTime(time);
    if (seconds === null) return setError("Skriv kamptiden som minutter og sekunder, f.eks. 08:45.");
    if (!hasTeam) return onSave({...event, seconds});
    const player = side === "home" && hasPlayer ? match.players.find(player => player.id === playerId) : undefined;
    const number = hasPlayer ? side === "home" ? player?.number : shirtNumber(awayNumber) : undefined;
    if (hasPlayer && number == null) return setError("Velg en spiller eller skriv et draktnummer fra 0 til 99.");
    onSave({...event, side, half, seconds, number: number ?? undefined, playerId: player?.id, outcome: event.type === "penalty" ? outcome : undefined});
  }

  return <form className="grid live-panel live-form" onSubmit={submit}>
    <h3>{title}</h3>
    {kind === "edit" && <p>{eventDescription(match, event)}</p>}
    {hasTeam && !draft.awayOnly && <fieldset className="grid"><legend>Lag</legend><div className="live-pair">
      {(["home", "away"] as const).map(team => <button type="button" className={"btn" + (side === team ? " selected" : "")}
        key={team} aria-pressed={side === team} onClick={() => setSide(team)}>{match[team].name}</button>)}
    </div></fieldset>}
    {hasPlayer && (side === "home" ? <fieldset className="grid"><legend>Draktnummer</legend><div className="live-player-buttons">
      {match.players.map(player => <button type="button" key={player.id} className={"btn" + (playerId === player.id ? " selected" : "")}
        aria-pressed={playerId === player.id} onClick={() => setPlayerId(player.id)}><strong>#{player.number}</strong><small>{player.name}</small></button>)}
    </div></fieldset> : <label>Motstanderens draktnummer<input inputMode="numeric" maxLength={2} required value={awayNumber}
      onChange={event => setAwayNumber(event.target.value)}/></label>)}
    {event.type === "penalty" && <fieldset className="grid"><legend>Utfall</legend><div className="day-strip">
      {(Object.keys(penaltyNames) as PenaltyOutcome[]).map(key => <button key={key} type="button" className={"btn" + (outcome === key ? " selected" : "")}
        aria-pressed={outcome === key} onClick={() => setOutcome(key)}>{penaltyNames[key]}</button>)}
    </div></fieldset>}
    <div className="live-pair">
      {kind === "edit" && hasTeam && <label>Omgang<select value={half} onChange={event => setHalf(event.target.value === "2" ? 2 : 1)}>
        <option value="1">1. omgang</option>{match.clock.half === 2 && <option value="2">2. omgang</option>}
      </select></label>}
      <label>Kamptid i {half}. omgang<input required value={time} onChange={event => setTime(event.target.value)}/></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="live-pair"><button type="button" className="btn" onClick={onCancel}>Avbryt</button>
      <button className="btn primary">{kind === "end" ? "Avslutt omgang" : "Lagre"}</button></div>
  </form>;
}

function MatchReport({match, finalize}: {match: LiveMatch; finalize: () => void}) {
  const halfEnded = match.events.some(event => event.type === "clock" && event.label === "Slutt 1. omgang");
  return <section className="grid">
    <div><h3>Målprotokoll</h3><p>{match.finalized ? "Ferdigstilt" : match.clock.status === "finished" ? "Til kontroll" : "Oppdateres fortløpende"}
      {halfEnded && " · Pause " + liveScore(match.events.filter(event => event.half === 1))}
      {match.clock.status === "finished" && " · Slutt " + liveScore(match.events)}</p></div>
    {(["home", "away"] as const).map(side => {
      const rows = matchProtocol(match, side);
      const columns = ["goals", "penalties", "total", "warnings", "suspensions"] as const;
      return <div className="live-panel grid" key={side}><h3>{match[side].name}</h3>
        <table className="live-protocol" aria-label={"Målprotokoll for " + match[side].name}>
          <thead><tr><th scope="col">Spiller</th>{["Mål", "7 m", "Totalt", "Gult", "2 min"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{rows.map(player => <tr key={player.id}><th scope="row">#{player.number}{player.name && " · " + player.name}</th>
            {columns.map(key => <td key={key}>{player[key]}</td>)}</tr>)}</tbody>
          <tfoot><tr><th scope="row">Lag totalt</th>{columns.map(key => <td key={key}>{rows.reduce((sum, player) => sum + player[key], 0)}</td>)}</tr></tfoot>
        </table>
      </div>;
    })}
    {match.clock.status === "finished" && !match.finalized && <button type="button" className="btn primary" onClick={finalize}>Ferdigstill kamprapport</button>}
  </section>;
}
