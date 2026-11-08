export const field={kast:["presisjon","pasning_i_fart","pasningsvariasjon"],mottak:["ballkontroll","mottak_i_fart","mottak_under_press"],skudd:["skuddteknikk","plassering","skuddvalg"],finter:["troverdighet","rytmeskifte","gjennombrudd"],fotarbeid:["balanse","retningsskifte","stopp_start"],forsvar:["posisjonering","sideveisarbeid","samarbeid"],samspill:["timing","bevegelse_uten_ball","gjore_andre_gode"],spilleforstaelse:["orientering","situasjonsoppfatning","valg"]};
export const keeper={posisjonering:["grunnstilling","vinkel"],forflytning:["sideveis","returposisjon"],redningsteknikk:["hoy_redning","lav_redning"],skuddlesing:["lese_skytter"],igangsetting:["utkast"],samspill:["forsvarsdialog"],fotarbeid:["keeperbalanse"],spilleforstaelse:["keeperorientering"]};
export type Profile="field"|"keeper";
export const profiles={field,keeper},levels=["Utforsker","Grunnlag","Trygg","Anvender","Tilpasser"],journey=["Avtalt","Øver","Prøver i spill","Bekreftet"];
const labels:Record<string,string>={spilleforstaelse:"Spilleforståelse",mottak_i_fart:"Mottak i fart",gjore_andre_gode:"Gjøre andre gode",hoy_redning:"Høy redning"};
export const label=(s:string)=>labels[s]||s.charAt(0).toUpperCase()+s.slice(1).replaceAll("_"," ");
export const localDay=(t:string)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Oslo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(t));
export const empty=():Plan=>({merits:[],rubrics:[],goals:[],practices:[],observations:[],history:[],receipts:{}});
export type Status="draft"|"proposed"|"active"|"awaiting_review"|"completed"|"paused"|"archived"|"cancelled";
export type Assignment={exercise:string;cue:string;session?:string;suitableBy?:string;conditions?:string};
export type Goal={agreedAt?:string;rubric?:string;id:string;title:string;intention:string;criteria:string;profile:Profile;skill:string;base:number|null;target:number|null;practiceTarget:number|null;review:string;status:Status;stage:number;feedback:string;evidence:string;assignments:Assignment[]};
export type Practice={verified?:boolean;context?:string;id:string;exercise:string;goals:string[];at:string;by:string;revoked:boolean};
export type Observation={id:string;profile:Profile;skill:string;rubric:string;criterion:string;level:number;observed:string;at:string;by:string;context:string;feedback:string;subs:string[];replaces?:string;revoked?:boolean;draft?:boolean};
export type History={id:string;at:string;by:string;action:string;subject:string;message:string;public:boolean};
export type Rubric={mastery?:number|null;profile:Profile;skill:string;version:string;scope:string;criteria:string[];by:string;at:string};
export type Plan={merits:{key:"mission_complete"|"rising_star";ref:string;why:string;by:string;at:string;revoked:boolean}[];rubrics:Rubric[];goals:Goal[];practices:Practice[];observations:Observation[];history:History[];receipts:Record<string,string>};
export type CatalogItem={id:string;title:string;instructions:string;tags:string[];format:string;equipment:string;space:string;min:number;max:number};
export const originals:CatalogItem[]=[
 {id:"club:passing",title:"Pasning i bevegelse",instructions:"Beveg dere parallelt. Møt pasningen, spill videre og fortsett i samme retning. Tilpass avstand og tempo sammen.",tags:["mottak_i_fart","pasning_i_fart","timing"],format:"Par",equipment:"Ball",space:"Korridor",min:1,max:5},
 {id:"club:turn",title:"Mottak med retningsskifte",instructions:"Møt ballen og ta kontroll før du skifter retning gjennom en kjegleport. Bytt roller.",tags:["mottak_i_fart","retningsskifte","ballkontroll"],format:"Par",equipment:"Ball og kjegler",space:"Korridor",min:2,max:5},
 {id:"club:feint",title:"Finte gjennom port",instructions:"Angrip en kjegleport med en tydelig finte. Bytt side og prøv mot en medspiller i avtalt tempo.",tags:["troverdighet","rytmeskifte","gjennombrudd"],format:"Par",equipment:"Ball og kjegler",space:"Korridor",min:1,max:5}
];
export const busyGoal=(g:Goal)=>g.status==="active"||g.status==="awaiting_review";
export const visibleGoal=(g:Goal)=>!!g.agreedAt&&!["draft","proposed"].includes(g.status);
export const countPractice=(s:Plan,id:string)=>s.practices.filter(p=>!p.revoked&&p.goals.includes(id)).length;
export function axisObservation(s:Plan,profile:Profile,skill:string,day:string){
 const replaced=new Set(s.observations.filter(o=>!o.draft).map(o=>o.replaces));
 return s.observations.filter(o=>o.profile===profile&&o.skill===skill&&!o.draft&&!o.revoked&&!replaced.has(o.id)&&localDay(o.observed)<=day).sort((a,b)=>b.observed.localeCompare(a.observed)||b.at.localeCompare(a.at))[0];
}
export const comparable=(a?:Observation,b?:Observation)=>!!a&&!!b&&a.profile===b.profile&&a.skill===b.skill&&a.rubric===b.rubric;
export function published(s:Plan,coach:boolean):Plan{
 const goals=s.goals.filter(g=>coach||visibleGoal(g)),ids=new Set(goals.map(g=>g.id));
 return {merits:coach?s.merits:[],rubrics:(s.rubrics||[]).filter(r=>coach||s.observations.some(o=>!o.draft&&o.profile===r.profile&&o.skill===r.skill&&o.rubric===r.version)||goals.some(g=>g.profile===r.profile&&g.skill===r.skill&&g.rubric===r.version)),goals,observations:s.observations.filter(o=>coach||!o.draft),practices:s.practices.map(p=>({...p,goals:p.goals.filter(k=>ids.has(k))})).filter(p=>p.goals.length),history:s.history.filter(e=>coach||e.public),receipts:{}};
}
