import { trainingDay } from "./programs";
import type { Assignment, Snapshot } from "./beta";

export const regions = ["Upper body","Core","Lower body","Full body","Conditioning","Mobility","Unclassified"] as const;
export type Region = typeof regions[number];
export type Exercise = {id:string; squad:string; name:string; dose:string; region:Region};
export type EventKind = "Session" | "Game" | "Practice";
export function monday(day:string) {
  return trainingDay(day,-((new Date(day+"T12:00:00Z").getUTCDay()+6)%7));
}
export function weekPlans(plans:Assignment[],week:string,athlete:string){
  const end=trainingDay(week,7);
  return plans.filter(p=>p.day>=week && p.day<end && (!athlete || p.athlete===athlete));
}
export function exerciseLine(exercise:Exercise){
  return "["+exercise.region+"] "+exercise.name+" · "+exercise.dose;
}
export function regionOf(line:string):Region{
  const tag=regions.find(r=>line.startsWith("["+r+"] "));
  if(tag)return tag;
  if(/plank|dead bug|crunch|pallof/i.test(line))return "Core";
  if(/mobility|stretch|circles/i.test(line))return "Mobility";
  if(/squat|lunge|hip thrust|deadlift|calf/i.test(line))return "Lower body";
  if(/push.?up|press|row|pull.?up|curl/i.test(line))return "Upper body";
  if(/sprint|acceleration|walk|shuffle|jog/i.test(line))return "Conditioning";
  if(/warm.up|passing|jump shot/i.test(line))return "Full body";
  return "Unclassified";
}
export function volume(data:Snapshot,plans:Assignment[]){
  const checked=new Set(data.checks.map(c=>c.assignment+":"+c.step));
  const body=regions.map(region=>({region,planned:0,done:0,sets:0,doneSets:0}));
  let court=0,attended=0;
  for(const p of plans){
    if(p.kind && p.kind!=="Session"){
      court+=p.minutes||0;
      if(checked.has(p.id+":0"))attended+=p.minutes||0;
      continue;
    }
    p.exercises.forEach((line,i)=>{
      const group=body.find(b=>b.region===regionOf(line))!;
      const sets=Number(line.match(/\b(\d+)\s*[x×]\s*\d/i)?.[1]||0);
      group.planned++;group.sets+=sets;
      if(checked.has(p.id+":"+i)){group.done++;group.doneSets+=sets;}
    });
  }
  return {body,court,attended};
}
