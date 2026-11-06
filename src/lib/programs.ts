export type SessionDraft = { title: string; offset: number; exercises: string[] };
export type Program = { id: string; squad: string; name: string; sessions: SessionDraft[]; kind?:"program"|"session" };
export type Effort = "Easy" | "Just right" | "Hard";
export type Feedback = { assignment: string; effort: Effort };

const library: [RegExp, string[]][] = [
  [/squat|lower body|strength|leg day/i, ["Bodyweight squat · 2 x 8", "Squat · 3 x 8", "Hip thrust · 3 x 10", "Plank · 3 x 30 sec"]],
  [/shoot|throw|pass|match/i, ["Dynamic warm-up · 5 min", "Partner passing · 3 x 12", "Jump shot practice · 3 x 6", "Walking cooldown · 3 min"]],
  [/speed|power|sprint|conditioning/i, ["Dynamic warm-up · 5 min", "Acceleration · 4 x 10 m", "Lateral shuffle · 3 x 15 sec", "Easy walk · 3 min"]],
  [/recover|mobility|stretch/i, ["Easy walk · 5 min", "Hip mobility · 2 x 30 sec", "Shoulder circles · 2 x 10"]],
  [/upper body|shoulder|push/i, ["Arm circles · 2 x 10", "Band row · 3 x 10", "Push-up · 3 x 8"]]
];
export function suggestions(title: string) {
  return library.find(([matches])=>matches.test(title))?.[1] ?? [];
}
export function trainingDay(start: string, offset: number) {
  const date = new Date(start+"T12:00:00Z");
  date.setUTCDate(date.getUTCDate()+offset);
  return date.toISOString().slice(0,10);
}
export function adjustedDraft(lines: string[], effort: Effort) {
  // Change one working exercise. Preserve warm-up, cooldown and free-form cues.
  const next = [...lines];
  const index = next.findIndex(line=>!/warm.up|cooldown|bodyweight squat/i.test(line) && /\b([2-5])\s*[x×]\s*\d/i.test(line));
  if(index>=0 && effort!=="Just right") {
    next[index]=next[index].replace(/\b([2-5])(\s*[x×]\s*\d)/i,(_,n,tail)=>String(Number(n)+(effort==="Easy"?1:-1))+tail);
  }
  return next;
}
