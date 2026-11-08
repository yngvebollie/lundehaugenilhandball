import type {Plan} from "./model";
export function candidates(s:Plan){
 const refs=new Map<string,{source:string;badge:string}>();
 const add=(source:string,badge:string)=>refs.set(badge+":"+source,{source,badge});
 const superseded=new Set(s.observations.filter(o=>!o.draft).map(o=>o.replaces));
 const valid=s.observations.filter(o=>!o.draft&&!o.revoked&&!superseded.has(o.id));
 for(const g of s.goals)if(g.stage===3&&g.agreedAt&&["completed","archived"].includes(g.status))add(g.id,"goal_getter");
 for(const o of valid){const r=s.rubrics.find(r=>r.profile===o.profile&&r.skill===o.skill&&r.version===o.rubric);
  if(r?.mastery&&o.level>=r.mastery&&!o.subs.length)add(o.profile+":"+o.skill+":"+o.rubric,"skill_collector");}
 for(const m of s.merits){if(m.revoked)continue;
  if(m.key==="mission_complete"?s.practices.some(p=>p.id===m.ref&&p.verified&&!p.revoked):refs.has("goal_getter:"+m.ref)||valid.some(o=>o.id===m.ref))add(m.ref,m.key);
 }
 return [...refs.values()];
}
