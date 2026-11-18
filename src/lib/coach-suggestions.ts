import type {Snapshot} from "./beta";
import type {RatingRow} from "./coach-feedback";
import type {Plan} from "./development/model";
import type {RecordedActivity} from "./recorded-activity";

export type Suggestion={id:string;athlete:string;kind:"goals"|"ratings"|"activity";priority:number;day:string;title:string;evidence:string;action:string;href:string;signals:string[]};
export function followedUp(s:Suggestion,logs:{athlete:string;followup:{key:string;signals:string[]}}[]){return logs.some(r=>r.athlete===s.athlete&&r.followup.key===s.id&&s.signals.every(k=>r.followup.signals.includes(k)));}
const localDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.valueOf())?"":new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo"}).format(d);};
export function coachSuggestions(data:Snapshot,records:RecordedActivity[],ratings:RatingRow[],plans:Record<string,Plan>,day:string,from:string,recent:string,person?:string):Suggestion[]{
 if(data.me.role!=="coach")return [];
 const players=data.roster.filter(p=>p.role==="athlete"&&p.squad===data.me.squad&&(!person||p.id===person)),result:Suggestion[]=[];
 for(const p of players){
  const profile="/spillere?athlete="+encodeURIComponent(p.id),plan=plans[p.id];
  const active=plan?.goals.filter(g=>g.agreedAt&&localDate(g.agreedAt)<=day&&(g.status==="active"||g.status==="awaiting_review"))||[];
  const add=(s:Omit<Suggestion,"athlete">)=>result.push({...s,id:p.id+":"+s.id,athlete:p.id});
  for(const g of active){
   const practices=new Set(plan.practices.filter(r=>!r.revoked&&r.goals.includes(g.id)&&localDate(r.at)&&localDate(r.at)<=day).map(r=>r.id)).size;
   const href="/utvikling?athlete="+encodeURIComponent(p.id)+"&goal="+encodeURIComponent(g.id),base={id:"goal:"+g.id,kind:"goals" as const,href,day:g.review||localDate(g.agreedAt!),action:"Åpne målet",signals:[JSON.stringify([g.id,g.status,g.agreedAt,g.review,g.practiceTarget,practices,plan.history?.filter(h=>h.subject===g.id&&h.action==="review").map(h=>h.id).sort()])]};
   if(g.status==="awaiting_review")add({...base,priority:0,title:"Gi tilbakemelding på "+g.title,evidence:"Spilleren har bedt om vurdering. "+practices+" registrerte øvinger på målet."});
   else if(g.review&&g.review<=day)add({...base,priority:1,title:"Følg opp vurderingsdato: "+g.title,evidence:"Avtalt vurderingsdato: "+g.review+". "+practices+" registrerte øvinger; mestring må vurderes av trener."});
   else if(g.practiceTarget&&practices>=g.practiceTarget)add({...base,priority:4,title:"Se på fremgangen i "+g.title,evidence:practices+" av "+g.practiceTarget+" avtalte øvinger registrert. Antall øvinger bekrefter ikke mestring."});
  }
  // Keep the latest version of each assessment, including corrections to older ratings.
  const latest=new Map<string,RatingRow>();
  const own=ratings.filter(r=>r.athlete===p.id&&localDate(r.updated)>=from&&localDate(r.updated)<=day&&r.stars>=1&&r.stars<=5);
  for(const r of own){const key=JSON.stringify([r.origin,r.activity,r.item,r.exercise]);if(!latest.has(key)||latest.get(key)!.updated<r.updated)latest.set(key,r);}
  const low=[...latest.values()].filter(r=>r.stars<=2).sort((a,b)=>b.updated.localeCompare(a.updated));
  if(low.length){const r=low[0],goal=active.find(g=>g.assignments.some(a=>a.exercise===r.exercise));
   add({id:"rating",signals:low.map(r=>JSON.stringify([r.origin,r.activity,r.item,r.exercise,r.updated,r.stars])),kind:"ratings",priority:2,day:localDate(r.updated),title:"Snakk om øvelsesopplevelsen",evidence:(r.label||"Øvelse")+": "+r.stars+"/5 den "+localDate(r.updated)+". "+low.length+" vurdering(er) på 1–2 stjerner siste 30 dager."+(goal?" Øvelsen inngår i målet «"+goal.title+"».":""),href:profile+"#vurderinger",action:"Se vurderingene"});
  }
  const ownRecords=[...new Map(records.filter(r=>r.athlete===p.id&&r.day>=recent&&r.day<=day).map(r=>[r.id,r])).values()];
  const skipped=ownRecords.filter(r=>!r.done).sort((a,b)=>b.day.localeCompare(a.day));
  if(skipped.length)add({id:"skipped",signals:skipped.map(r=>JSON.stringify([r.id,r.day,r.done,r.minutes,r.weight])),kind:"activity",priority:3,day:skipped[0].day,title:"Avklar registrert fravær",evidence:skipped.length+" aktivitet(er) registrert som ikke deltatt siste sju dager. Siste: "+skipped[0].title+" · "+skipped[0].day+". Spør hva som skjedde før planen eventuelt endres.",href:profile+"&uke="+skipped[0].day+"#plan",action:"Se plan og gjennomføring"});
  const hard=ownRecords.filter(r=>r.done&&r.weight>=4).sort((a,b)=>b.day.localeCompare(a.day));
  if(hard.length)add({id:"effort",signals:hard.map(r=>JSON.stringify([r.id,r.day,r.done,r.minutes,r.weight])),kind:"activity",priority:3,day:hard[0].day,title:"Spør hvordan treningen kjentes",evidence:hard.length+" aktivitet(er) registrert med hard eller svært hard intensitet siste sju dager. Siste: "+hard[0].title+" · "+hard[0].minutes+" min · "+hard[0].day+". Dette er egenrapportering, ikke en vurdering av helse.",href:"/?athlete="+encodeURIComponent(p.id)+"&dag="+hard[0].day+"#monitor",action:"Se belastningsgrunnlaget"});
 }
 return result.sort((a,b)=>a.priority-b.priority||a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
}
