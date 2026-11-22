import {useState} from "react";
import {today, type Snapshot} from "@/lib/beta";
import type {Fixture} from "@/lib/match-journal";
import {liveScore, type LiveMatch, type MatchTeam} from "@/lib/live-match";
import {LiveMatchLineup} from "./live-match-lineup";
import {LiveMatchLog} from "./live-match-log";
import {useLiveMatchStorage} from "./live-match-storage";
import "./live-matches.css";

export function LiveMatches({data, teams, fixtures}: {data: Snapshot; teams: MatchTeam[]; fixtures: Fixture[]}) {
  const storage = useLiveMatchStorage(data.me.squad, data.me.id);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const active = storage.rows.find(row => row.id === selected);
  const previous = storage.rows.map(row => row.document);
  const choices = new Map<string, MatchTeam>();
  for (const team of teams) choices.set(team.key, team);
  for (const match of previous) {
    for (const team of [match.home, match.away]) {
      if (team.key.startsWith("new:") && !choices.has(team.key)) choices.set(team.key, team);
    }
  }

  function saveLineup(document: LiveMatch) {
    const id = active?.id ?? crypto.randomUUID();
    if (storage.save(id, () => document)) {
      setSelected(id);
      setEditing(false);
    }
  }

  return <section className="grid live-matches" aria-label="Logg kamp">
    {storage.loading && <p role="status">Henter kamplogger …</p>}
    {storage.loadError && <div className="day-strip"><span role="alert">{storage.loadError}</span>
      <button type="button" className="btn" onClick={() => void storage.reload()}>Hent på nytt</button></div>}
    {storage.saveError ? <div className="day-strip"><span role="alert">{storage.saveError}</span>
      {storage.pending && <button type="button" className="btn" onClick={() => void storage.retry()}>Synkroniser på nytt</button>}</div>
      : (active || storage.syncing) && <small className="live-save-status" role="status">
        {storage.pending ? "Lagret på enheten. Synkroniserer …" : "Alle endringer lagret."}
      </small>}
    {editing ? <LiveMatchLineup data={data} teams={[...choices.values()]} fixtures={fixtures} previous={previous}
      match={active?.document} onCancel={() => setEditing(false)} onSave={saveLineup}/> :
      active ? <LiveMatchLog key={active.id} match={active.document} editLineup={() => setEditing(true)} close={() => setSelected(null)}
        save={update => storage.save(active.id, previous => update(previous ?? active.document))}/> :
      <>
        <header className="competition-heading"><h2>Logg kamp</h2>
          <button className="btn primary" type="button" disabled={storage.loading} onClick={() => setEditing(true)}>+ Opprett kamp</button></header>
        {!storage.loading && !storage.rows.length && <p>Ingen kamper er ført her ennå.</p>}
        {fixtures.filter(game=>!game.completed&&game.day>=today()&&!storage.rows.some(row=>row.id===game.id))
          .sort((a,b)=>a.day.localeCompare(b.day)||(a.start_time||"").localeCompare(b.start_time||"")).slice(0,8).map(game=>
          <a className="btn live-match-row" key={game.id} href={"/match?game="+encodeURIComponent(game.id)+"&section=events"}>
            <span><strong>{game.home||"Hjemmelag"} – {game.away||game.opponent}</strong><small>{game.day}</small></span>Før hendelser
          </a>)}
        {storage.rows.map(({id, document: match}) => fixtures.some(game=>game.id===id)?
          <a className="btn live-match-row" key={id} href={"/match?game="+encodeURIComponent(id)+"&section=events"}>
            <span><strong>{match.home.name} – {match.away.name}</strong><small>{match.date} · Åpne hendelser</small></span><b>{liveScore(match.events)}</b>
          </a>:<button type="button" className="btn live-match-row" key={id}
          onClick={() => setSelected(id)}>
          <span><strong>{match.home.name} – {match.away.name}</strong><small>{match.date} · {match.finalized ? "Ferdigstilt" :
            match.clock.status === "finished" ? "Til kontroll" : match.clock.status === "ready" ? "Klar til start" : "Påbegynt"}</small></span>
          <b>{liveScore(match.events)}</b>
        </button>)}
      </>}
  </section>;
}
