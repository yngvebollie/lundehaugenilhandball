export type MatchSide = "home" | "away";
export type MatchTeam = {key: string; name: string};
export type MatchPlayer = {id: string; name: string; number: number; memberId?: string};
export type MatchClock = {
  half: 1 | 2;
  status: "ready" | "running" | "paused" | "timeout" | "halftime" | "finished";
  seconds: number;
  since: number | null;
};
export type MatchEventType = "goal" | "penalty" | "warning" | "suspension" | "timeout" | "clock";
export type PenaltyOutcome = "goal" | "miss" | "saved";
export type MatchEvent = {
  id: string;
  half: 1 | 2;
  seconds: number;
  recordedAt: number;
  type: MatchEventType;
  side?: MatchSide;
  playerId?: string;
  number?: number;
  outcome?: PenaltyOutcome;
  label?: string;
};
export type LiveMatch = {
  home: MatchTeam;
  away: MatchTeam;
  date: string;
  players: MatchPlayer[];
  clock: MatchClock;
  events: MatchEvent[];
  finalized: boolean;
};

export const eventNames: Record<Exclude<MatchEventType, "clock">, string> = {
  goal: "Mål", penalty: "7-meter", warning: "Gult kort", suspension: "2 min utvisning", timeout: "Timeout",
};
export const penaltyNames: Record<PenaltyOutcome, string> = {goal: "Mål", miss: "Bom", saved: "Redning"};
export const initialClock: MatchClock = {half: 1, status: "ready", seconds: 0, since: null};

export function clockSeconds(clock: MatchClock, at = Date.now()) {
  return clock.seconds + (clock.since === null ? 0 : Math.max(0, Math.floor((at - clock.since) / 1000)));
}

export function formatMatchTime(seconds: number) {
  return [Math.floor(seconds / 60), seconds % 60].map(value => String(value).padStart(2, "0")).join(":");
}

export function parseMatchTime(text: string) {
  const parts = /^(\d{1,3}):([0-5]\d)$/.exec(text.trim());
  return parts ? Number(parts[1]) * 60 + Number(parts[2]) : null;
}

export function shirtNumber(text: string) {
  return /^\d{1,2}$/.test(text.trim()) ? Number(text) : null;
}

export function newMatchEvent(clock: MatchClock, type: MatchEventType): MatchEvent {
  const recordedAt = Date.now();
  return {id: crypto.randomUUID(), half: clock.half, seconds: clockSeconds(clock, recordedAt), recordedAt, type};
}

export function appendMatchEvent(match: LiveMatch, event: MatchEvent): LiveMatch {
  return {...match, events: [...match.events, event], finalized: false};
}

export function isMatchGoal(event: MatchEvent) {
  return event.type === "goal" || (event.type === "penalty" && event.outcome === "goal");
}

export function matchTimeline(events: MatchEvent[]) {
  let home = 0;
  let away = 0;
  return [...events].sort((a, b) => a.half - b.half || a.seconds - b.seconds || a.recordedAt - b.recordedAt)
    .map(event => {
      if (isMatchGoal(event)) {
        if (event.side === "home") home++;
        else if (event.side === "away") away++;
      }
      return {event, home, away};
    });
}

export function liveScore(events: MatchEvent[]) {
  const goals = events.filter(isMatchGoal);
  return `${goals.filter(event => event.side === "home").length}–${goals.filter(event => event.side === "away").length}`;
}

export function matchProtocol(match: LiveMatch, side: MatchSide) {
  const events = match.events.filter(event => event.side === side);
  const players = side === "home" ? match.players : [...new Set(events.flatMap(event => event.number === undefined ? [] : [event.number]))]
    .map(number => ({id: String(number), number, name: ""}));
  return [...players].sort((a, b) => a.number - b.number).map(player => {
    const rows = events.filter(event => side === "home" ? event.playerId === player.id : event.number === player.number);
    const goals = rows.filter(event => event.type === "goal").length;
    const penalties = rows.filter(event => event.type === "penalty" && isMatchGoal(event)).length;
    const warnings = rows.filter(event => event.type === "warning").length;
    const suspensions = rows.filter(event => event.type === "suspension").length;
    return {...player, goals, penalties, total: goals + penalties, warnings, suspensions};
  });
}
