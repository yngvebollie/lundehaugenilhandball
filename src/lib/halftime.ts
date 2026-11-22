import {cupOutcome, fixtureOutcome, type Wld} from "./match-result";
import type {Fixture, ReportStatus} from "./match-journal";

type Score = [number, number];

export function periodScores(game: Pick<Fixture, "score">, report?: ReportStatus) {
  const score = game.score?.trim().match(/^(\d+)\s*[-–:]\s*(\d+)$/);
  const full: Score | null = score ? [Number(score[1]), Number(score[2])] : null;
  const home = report?.halfHome, away = report?.halfAway;
  const half: Score | null = typeof home === "number" && typeof away === "number" &&
    Number.isSafeInteger(home) && Number.isSafeInteger(away) && home >= 0 && away >= 0 &&
    (!full || (home <= full[0] && away <= full[1])) ? [home, away] : null;
  const second: Score | null = full && half ? [full[0]-half[0], full[1]-half[1]] : null;
  return {full, half, second};
}

export function halftimeSummary(games: Fixture[], reports: Record<string, ReportStatus>) {
  const rows: Record<Wld, Record<Wld, number>> = {W:{W:0,D:0,L:0},D:{W:0,D:0,L:0},L:{W:0,D:0,L:0}};
  const byMatch = new Map<string, {half: Wld; full: Wld} | null>();
  const conflicts = new Set<string>();
  for (const game of games) {
    if (!game.completed) continue;
    const key = game.nif_id ? "nif:"+game.nif_id : game.id;
    if (!byMatch.has(key)) byMatch.set(key, null);
    const {half} = periodScores(game, reports[game.id]);
    const full = fixtureOutcome(game);
    if (!half || !full) continue;
    const home = game.opponent.trim().toLocaleLowerCase("nb") === game.away?.trim().toLocaleLowerCase("nb");
    const atBreak = cupOutcome(half[home?0:1], half[home?1:0])!;
    const old = byMatch.get(key);
    if (old && (old.half !== atBreak || old.full !== full)) conflicts.add(key);
    byMatch.set(key, {half:atBreak, full});
  }
  let included = 0;
  for (const [key, result] of byMatch) {
    if (!result || conflicts.has(key)) continue;
    rows[result.half][result.full]++;
    included++;
  }
  return {rows, included, total:byMatch.size};
}

export function resultTrend(games: Fixture[]) {
  const matches = new Map<string, {game:Fixture; outcome:Wld|null}>();
  const conflicts = new Set<string>();
  for (const game of games) {
    if (!game.completed) continue;
    const key = game.nif_id ? "nif:"+game.nif_id : game.id;
    const outcome = fixtureOutcome(game);
    const previous = matches.get(key);
    if (previous?.outcome && outcome && previous.outcome !== outcome) conflicts.add(key);
    if (!previous || (!previous.outcome && outcome)) matches.set(key, {game,outcome});
  }
  const totals = {W:0,D:0,L:0};
  const series = [...matches].filter(([key,{outcome}])=>outcome && !conflicts.has(key))
    .sort(([,a],[,b])=>a.game.day.localeCompare(b.game.day)||(a.game.start_time||"").localeCompare(b.game.start_time||"")||a.game.id.localeCompare(b.game.id))
    .map(([key,{game,outcome}])=>{
      totals[outcome!]++;
      return {key,game,outcome:outcome!,totals:{...totals}};
    });
  return {series,totals,total:matches.size};
}
