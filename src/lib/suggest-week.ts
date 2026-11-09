import {onDate,regularLoad,type Rule} from "./regular";
import { strength } from "./strength";
import { trainingDay } from "./programs";
import { volume, weekPlans, type Region } from "./workload";
import type { Snapshot } from "./beta";

export const styles=["Varied","Hard","Medium","Soft"] as const;
export type Style=typeof styles[number];
const settings={Varied:{sessions:3,sets:2},Hard:{sessions:3,sets:3},Medium:{sessions:2,sets:2},Soft:{sessions:1,sets:1}};
const moves:Record<string,string[]>={"Lower body":["Goblet squat","Single-leg glute bridge","Standing calf raise"],"Upper body":["Band external rotation","Inverted row","Push-up"],Core:["Dead bug","Side plank","Pallof press"],"Full body":["Goblet squat","Push-up","Dead bug"]};
export function prescription(region:Region,sets:number){
  return (moves[region]||moves["Full body"]).map(name=>{
    const e=strength.find(item=>item.name===name)!;
    return "["+e.region+"] "+e.name+" · "+e.dose.replace(/^\d+/,String(sets));
  });
}
export function briefDraft(brief:string){
  const region:Region=/lower|legs|squat|underkropp/i.test(brief)?"Lower body":/upper|shoulder|overkropp/i.test(brief)?"Upper body":/core|trunk|kjerne/i.test(brief)?"Core":"Full body";
  const style:Style=/hard|heavy|tung/i.test(brief)?"Hard":/soft|easy|light|lett/i.test(brief)?"Soft":/varied|variert/i.test(brief)?"Varied":"Medium";
  const weekly=/week|uke/i.test(brief);
  const name=region+" · "+style.toLowerCase();
  return {name,sessions:Array.from({length:weekly?settings[style].sessions:1},(_,i)=>{
    const focus=style==="Varied"&&weekly?(["Lower body","Upper body","Core"] as Region[])[i]:region;
    return {title:weekly?focus+" strength "+(i+1):name,offset:i*2,exercises:prescription(focus,settings[style].sets)};
  })};
}
export function suggestWeek(data:Snapshot,week:string,id:string,style:Style,now:string,regularRules:Rule[]=[]){
  const current=weekPlans(data.plans,week,id);
  const last=weekPlans(data.plans,trainingDay(week,-7),id);
  const curr=volume(data,current),prior=volume(data,last);
  const existing=curr.body.reduce((s,b)=>s+b.sets,0);
  const logged=prior.body.reduce((s,b)=>s+b.doneSets,0);
  const feedbackIds=new Set([...current,...last].map(p=>p.id));
  const hard=data.feedback.some(f=>feedbackIds.has(f.assignment)&&f.effort==="Hard");
  const {sessions,sets}=settings[style];
  const fixed=regularLoad(regularRules,week,trainingDay(week,7),id);
  const busyCourt=curr.court+fixed.minutes>=120||current.some(p=>p.kind==="Game");
  // Draft set budgets are planning defaults. Use completed history only when present.
  const dose=hard?Math.max(1,sets-1):sets;
  const baseBudget=3*sets*sessions;
  const budget=Math.min(baseBudget,logged?logged+3:baseBudget)-(busyCourt?3:0)-(hard?2:0);
  let remaining=Math.max(0,budget-existing);
  const history=data.plans.filter(p=>p.athlete===id);
  const ranked=curr.body.filter(b=>["Upper body","Core","Lower body"].includes(b.region)).sort((a,b)=>a.sets-b.sets||a.planned-b.planned);
  const drafts:{day:string;title:string;exercises:string[];sets:number}[]=[];
  for(let i=0;i<7&&drafts.length<sessions;i++){
    const day=trainingDay(week,i);
    if(day<now||onDate(regularRules,day,id).some(r=>r.weight>=3)||current.some(p=>p.day===day))continue;
    const adjacent=[trainingDay(day,-1),trainingDay(day,1)];
    if(history.some(p=>adjacent.includes(p.day)&&p.kind!=="Practice")||drafts.some(p=>adjacent.includes(p.day)))continue;
    const perMove=Math.min(dose,Math.floor(remaining/3));
    if(perMove<1)break;
    const focus=ranked[drafts.length%ranked.length].region;
    const exercises=prescription(focus,style==="Varied"&&drafts.length===1?1:perMove);
    const added=exercises.reduce((s,l)=>s+Number(l.match(/· (\d+)/)?.[1]||0),0);
    drafts.push({day,title:focus+" strength",exercises,sets:added});remaining-=added;
  }
  return {existing,logged,court:curr.court,fixed:fixed.minutes,hard,busyCourt,drafts};
}
