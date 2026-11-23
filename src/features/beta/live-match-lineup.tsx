import {useEffect, useState, type FormEvent} from "react";
import {teamRoster, today, type Member, type Snapshot} from "@/lib/beta";
import {squadStatLines, type Fixture} from "@/lib/match-journal";
import {initialClock, shirtNumber, type LiveMatch, type MatchPlayer, type MatchTeam} from "@/lib/live-match";

type Candidate = {id: string; name: string; number: string; memberId?: string};
type Props = {
  data: Snapshot;
  teams: MatchTeam[];
  fixtures: Fixture[];
  previous: LiveMatch[];
  match?: LiveMatch;
  onSave: (match: LiveMatch) => void;
  onCancel: () => void;
};

const custom = "custom";
const nameKey = (name: string) => name.trim().toLocaleLowerCase("nb-NO").replace(/\s+/g, " ");
const fromPlayer = (player: MatchPlayer): Candidate => ({...player, number: String(player.number)});

export function LiveMatchLineup({data, teams, fixtures, previous, match, onSave, onCancel}: Props) {
  const [home, setHome] = useState(match?.home.key ?? teams[0]?.key ?? custom);
  const [away, setAway] = useState(match?.away.key ?? custom);
  const [homeName, setHomeName] = useState(match?.home.name ?? "");
  const [awayName, setAwayName] = useState(match?.away.name ?? "");
  const [date, setDate] = useState(match?.date ?? today());
  const [title, setTitle] = useState(match?.title ?? "");
  const [players, setPlayers] = useState<Candidate[]>(() => match?.players.map(fromPlayer) ?? []);
  const [awayPlayers, setAwayPlayers] = useState<Candidate[]>(() => match?.awayPlayers?.map(fromPlayer) ?? []);
  const [imported, setImported] = useState<Candidate[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [otherRoster, setOtherRoster] = useState<{team: string; members: Member[]; error?: boolean}>();
  const [error, setError] = useState("");
  const rosterTeam = home.startsWith("group:") ? home.slice(6) : data.me.squad;
  const roster = rosterTeam === data.me.squad ? data.roster : otherRoster?.team === rosterTeam ? otherRoster.members : [];
  const members: Candidate[] = roster.filter(member => member.role === "athlete").map(member => ({
    id: member.id, memberId: member.id, name: [member.given_name, member.family_name].every(Boolean)
      ? member.given_name + " " + member.family_name : member.name,
    number: member.shirt_number ?? "",
  }));
  useEffect(() => {
    if (rosterTeam === data.me.squad) return;
    let active = true;
    void teamRoster(rosterTeam).then(members => {
      if (active) setOtherRoster({team: rosterTeam, members});
    }).catch(() => {
      if (active) setOtherRoster({team: rosterTeam, members: [], error: true});
    });
    return () => {active = false;};
  }, [data.me.squad, rosterTeam]);
  const currentIds = new Set(members.map(member => member.id));
  const historical = new Map<string, Candidate>();
  const historyIds = new Set<string>();
  for (const game of previous) {
    if (game.home.key !== home && game.home.key !== "new:" + nameKey(homeName)) continue;
    for (const player of game.players) {
      if (player.memberId && currentIds.has(player.memberId)) continue;
      const key = nameKey(player.name) + ":" + player.number;
      if (!historical.has(key) && !historyIds.has(player.id)) {
        historical.set(key, fromPlayer(player));
        historyIds.add(player.id);
      }
    }
  }
  for (const player of imported) {
    const key = nameKey(player.name) + ":" + player.number;
    if (!historical.has(key) && !historyIds.has(player.id) && !members.some(member => nameKey(member.name) === nameKey(player.name) && shirtNumber(member.number) === shirtNumber(player.number))) {
      historical.set(key, player);
    }
  }
  const registration = home.startsWith("nif:") ? home.slice(4) : null;
  useEffect(() => {
    let active = true;
    setImported([]);
    setHistoryError(false);
    if (registration && !match) void squadStatLines(registration, fixtures).then(lines => {
      if (!active) return;
      const candidates = new Map<string, Candidate>();
      for (const line of lines.filter(line => line.played).sort((a, b) => b.day.localeCompare(a.day))) {
        if (!candidates.has(line.player) && line.name.trim()) {
          candidates.set(line.player, {id: "report:" + line.player, name: line.name, number: line.shirt ?? ""});
        }
      }
      setImported([...candidates.values()]);
    }).catch(() => {if (active) setHistoryError(true);});
    return () => {active = false;};
  }, [fixtures, match, registration]);

  function toggle(player: Candidate) {
    if (match?.events.some(event => event.playerId === player.id)) return;
    setPlayers(list => list.some(item => item.id === player.id) ? list.filter(item => item.id !== player.id) : [...list, player]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const homeTeam = match?.home ?? teams.find(team => team.key === home) ?? {key: "new:" + nameKey(homeName), name: homeName.trim()};
    const awayTeam = match?.away ?? teams.find(team => team.key === away) ?? {key: "new:" + nameKey(awayName), name: awayName.trim()};
    if (!homeTeam.name || !awayTeam.name || homeTeam.key === awayTeam.key || nameKey(homeTeam.name) === nameKey(awayTeam.name)) {
      return setError("Velg eller skriv inn to forskjellige lagnavn.");
    }
    function saveRoster(candidates: Candidate[], teamName: string) {
      const lineup: MatchPlayer[] = [];
      const numbers = new Set<number>();
      for (const player of candidates) {
        const number = shirtNumber(player.number);
        if (number === null) throw new Error(teamName + ": Bruk draktnummer fra 0 til 99.");
        if (numbers.has(number)) throw new Error(teamName + ": Draktnummer " + number + " er brukt flere ganger.");
        numbers.add(number);
        lineup.push({...player, name: player.name.trim() || "Ukjent spiller", number});
      }
      return lineup.sort((a, b) => a.number - b.number);
    }
    try {
      const lineup = saveRoster(players, homeTeam.name);
      const awayLineup = saveRoster(awayPlayers, awayTeam.name);
      const fields = {title:title.trim() || undefined, players:lineup, awayPlayers:awayLineup};
      onSave(match ? {...match, ...fields, events:match.events.map(event => {
        if (!event.side || event.number === undefined && !event.playerId) return event;
        const before = event.side === "home" ? match.players : match.awayPlayers ?? [];
        const after = event.side === "home" ? lineup : awayLineup;
        const identity = event.playerId ?? before.find(player => player.number === event.number)?.id;
        const player = identity ? after.find(player => player.id === identity) : after.find(player => player.number === event.number);
        return player ? {...event, playerId:player.id, playerName:player.name, number:player.number} : event;
      })} : {home:homeTeam, away:awayTeam, date, ...fields, clock:initialClock, events:[], finalized:false});
    } catch (error) {
      setError(error instanceof Error ? error.message : "Kunne ikke lagre kamptroppen.");
    }
  }

  function choices(title: string, options: Candidate[]) {
    return <details className="library-tools" open={title === "Mitt lag" || undefined}>
      <summary>{title} ({options.length})</summary>
      <div className="live-pick-list">{options.map(player => <label key={player.id}>
        <input type="checkbox" disabled={match?.events.some(event => event.playerId === player.id)} checked={players.some(item => item.id === player.id)} onChange={() => toggle(player)}/>
        <span>{player.number ? "#" + player.number + " · " : ""}{player.name}</span>
      </label>)}</div>
      {!options.length && <p>Ingen spillere å velge her.</p>}
    </details>;
  }

  function teamField(side: "home" | "away") {
    const isHome = side === "home";
    const value = isHome ? home : away;
    const field = isHome ? "Hjemmelag" : "Bortelag";
    return <div className="grid">
      <label>{field}<select value={value} onChange={event => {
        if (isHome) {
          setHome(event.target.value);
          setPlayers([]);
        } else {
          setAway(event.target.value);
          setAwayPlayers([]);
        }
      }}>
        {teams.map(team => <option key={team.key} value={team.key}>{team.name}</option>)}
        <option value={custom}>Legg til lag</option>
      </select></label>
      {value === custom && <label>Navn på {field.toLowerCase()}<input required maxLength={100}
        value={isHome ? homeName : awayName} onChange={event => (isHome ? setHomeName : setAwayName)(event.target.value)}/></label>}
    </div>;
  }

  return <form className="grid live-form" onSubmit={submit}>
    <h2>{match ? "Rediger kamp og kamptropper" : "Opprett kamp"}</h2>
    {!match && <div className="live-pair">{teamField("home")}{teamField("away")}
      <label>Kampdato<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label>
    </div>}
    <label>Kampnavn (valgfritt)<input maxLength={100} value={title} placeholder="F.eks. Treningskamp eller Cup"
      onChange={event => setTitle(event.target.value)}/></label>
    <section className="grid live-panel">
      <h3>Spillere på hjemmelaget</h3>
      <p>Kontroller navn og draktnummer i kamptroppen før du lagrer.</p>
      {choices("Mitt lag", members)}
      {rosterTeam !== data.me.squad && (otherRoster?.team !== rosterTeam ? <small role="status">Henter spillerne på laget …</small> :
        otherRoster.error ? <small role="alert">Kunne ikke hente spillerne på laget.</small> : null)}
      {choices("Tidligere brukte spillere", [...historical.values()])}
      {historyError && <small>Kunne ikke hente spillere fra tidligere kamprapporter.</small>}
      {players.length > 0 && <h3>Kamptropp ({players.length})</h3>}
      {players.map((player, index) => {
        const used = match?.events.some(event => event.playerId === player.id);
        return <div key={player.id} className="live-lineup-row">
          <label>Nr.<input inputMode="numeric" maxLength={2} value={player.number} required
            onChange={event => setPlayers(items => items.map((item, i) => i === index ? {...item, number: event.target.value} : item))}/></label>
          <label>Navn<input maxLength={100} value={player.name} placeholder="Ukjent spiller"
            onChange={event => setPlayers(items => items.map((item, i) => i === index ? {...item, name: event.target.value} : item))}/></label>
          <button type="button" className="btn" disabled={used} onClick={() => toggle(player)}>Fjern</button>
        </div>;
      })}
      <button className="btn" type="button" onClick={() => toggle({id: crypto.randomUUID(), name: "", number: ""})}>+ Legg til spiller på hjemmelaget</button>
    </section>
    <section className="grid live-panel">
      <h3>Spillere på bortelaget</h3>
      {awayPlayers.map(player => <div key={player.id} className="live-lineup-row">
        <label>Nr.<input inputMode="numeric" maxLength={2} value={player.number} required
          onChange={event => setAwayPlayers(items => items.map(item => item.id === player.id ? {...item, number:event.target.value} : item))}/></label>
        <label>Navn<input maxLength={100} value={player.name} placeholder="Ukjent spiller"
          onChange={event => setAwayPlayers(items => items.map(item => item.id === player.id ? {...item, name:event.target.value} : item))}/></label>
        <button type="button" className="btn" disabled={match?.events.some(event => event.side === "away" &&
          (event.playerId === player.id || event.number === match.awayPlayers?.find(saved => saved.id === player.id)?.number && event.number !== undefined))}
          onClick={() => setAwayPlayers(items => items.filter(item => item.id !== player.id))}>Fjern</button>
      </div>)}
      <button className="btn" type="button" onClick={() => setAwayPlayers(items => [...items, {id:crypto.randomUUID(), name:"", number:""}])}>+ Legg til spiller på bortelaget</button>
    </section>
    {error && <p role="alert">{error}</p>}
    <div className="day-strip"><button className="btn" type="button" onClick={onCancel}>Avbryt</button>
      <button className="btn primary">{match ? "Lagre kamptropp" : "Opprett og åpne kamplogg"}</button></div>
  </form>;
}
