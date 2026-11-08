import {profiles,label,busyGoal,visibleGoal,countPractice,type Goal,type Observation,type Plan,type Profile,type CatalogItem} from "./model";
export type Command={action:string;key:string;v:Record<string,unknown>};
export type Actor={id:string;coach:boolean;now:string;limit:number;keeper:boolean;keeperAxes?:string[];catalog:CatalogItem[];sessions:string[]};
function fail(s:string):never{throw Error(s);}
function str(v:unknown,max=400,required=true){if(typeof v!=="string")return required?fail("Tekst mangler."):"";const t=v.trim();if(t.length>max||required&&!t)fail("Kontroller tekstlengden.");return t;}
function num(v:unknown,max=5){if(v===undefined||v===null||v==="")return null;if(typeof v!=="number"||!Number.isInteger(v)||v<1||v>max)fail("Ugyldig tall.");return v;}
function when(v:unknown){const t=str(v,40);if(!/^\d{4}-\d{2}-\d{2}T/.test(t)||!Number.isFinite(Date.parse(t)))fail("Ugyldig tidspunkt.");return new Date(t).toISOString();}
function profile(v:unknown,a:Actor):Profile{if(v!=="field"&&v!=="keeper"||v==="keeper"&&!a.keeper)fail("Profilen er ikke godkjent for dette laget.");return v;}
function skills(p:Profile,a:Actor){return (Object.entries(profiles[p]) as [string,string[]][]).filter(([k])=>p!=="keeper"||!a.keeperAxes||a.keeperAxes.includes(k));}
function date(v:unknown){const t=str(v,10,false);if(t&&(!/^\d{4}-\d{2}-\d{2}$/.test(t)||!Number.isFinite(Date.parse(t))||new Date(t).toISOString().slice(0,10)!==t))fail("Ugyldig vurderingsdato.");return t;}
const words:Record<string,string>={endorse:"Utviklingsmilepæl bekreftet",retract:"Milepæl korrigert",rubric:"Rubrikk godkjent",draft:"Kladd opprettet",propose:"Mål foreslått",publish:"Mål avtalt",edit:"Mål endret",practice:"Øving registrert",editPractice:"Øving korrigert",revokePractice:"Øving trukket tilbake",transfer:"Observert i spill",complete:"Mål bekreftet",reopen:"Mål åpnet på nytt",review:"Bedt om vurdering",pause:"Mål satt på pause",resume:"Mål gjenopptatt",archive:"Mål arkivert",cancel:"Mål avsluttet",assign:"Øvelse tildelt",feedback:"Trenertilbakemelding",assess:"Ferdighet vurdert",revokeAssessment:"Vurdering trukket tilbake",note:"Privat trenernotat"};
export function change(input:Plan,cmd:Command,a:Actor){
 const s=structuredClone(input),{v,action,key}=cmd;if(!/^[a-zA-Z0-9_-]{1,100}$/.test(key)||!(Object.hasOwn(words,action)))fail("Ugyldig handling.");
 const signature=JSON.stringify([a.id,action,action==="note"?{}:v]);if(s.receipts[key]!==undefined){if(s.receipts[key]!==signature)fail("Nøkkelen er allerede brukt.");return s;}
 if(!a.coach&&!["propose","practice","editPractice","review","revokePractice"].includes(action))fail("Trenertilgang kreves.");
 const g=s.goals.find(g=>g.id===v.goal),cap=()=>{if(s.goals.filter(busyGoal).length>=a.limit)fail("Grensen for aktive mål er nådd.");};
 let subject=key,message=words[action],pub=true;
 function fields():Pick<Goal,"title"|"intention"|"criteria"|"profile"|"skill"|"base"|"target"|"practiceTarget"|"review"|"rubric">{
  const p=profile(v.profile,a),skill=str(v.skill,60,false),base=num(v.base),target=num(v.target);
  if(skill&&!skills(p,a).some(([k,ss])=>k===skill||ss.includes(skill))||!skill&&(target||base)||base&&target&&base>target)fail("Ferdigheten og nivåene passer ikke sammen.");
  const rubric=str(v.rubric,60,false);
  if(rubric&&!s.rubrics.some(r=>r.profile===p&&r.skill===skill&&r.version===rubric))fail("Uforenlig rubrikk for målet.");
  if(action!=="propose"&&action!=="draft"&&(target||base)&&!rubric)fail("Velg en godkjent rubrikk for nivåmålet.");
  return {rubric,title:str(v.title,90),intention:str(v.intention,300),criteria:str(v.criteria,600),profile:p,skill,base,target,practiceTarget:num(v.practiceTarget,999),review:date(v.review)};
 }
 if(["draft","propose","publish"].includes(action)&&!g){
  if(v.goal)fail("Målet finnes ikke.");if(action==="publish")cap();
  s.goals.push({id:key,...fields(),agreedAt:action==="publish"?a.now:undefined,status:action==="publish"?"active":action==="propose"?"proposed":"draft",stage:0,feedback:"",evidence:"",assignments:[]});pub=action==="publish";
 }else if(action==="rubric"){
  const p=profile(v.profile,a),skill=str(v.skill,60),version=str(v.version,60),scope=str(v.scope,250);
  if(!skills(p,a).some(([k,ss])=>k===skill||ss.includes(skill))||s.rubrics.some(r=>r.profile===p&&r.skill===skill&&r.version===version))fail("Velg en ferdighet og en ny rubrikkversjon.");
  if(!Array.isArray(v.criteria)||v.criteria.length!==5)fail("Oppgi kriteriene for alle fem nivåene.");s.rubrics.push({profile:p,skill,version,scope,mastery:num(v.mastery),criteria:v.criteria.map(x=>str(x,400)),by:a.id,at:a.now});pub=false;
 }else if(action==="assess"||action==="revokeAssessment"){
  const old=s.observations.find(o=>o.id===v.replaces);if(v.replaces&&(!old||old.revoked||s.observations.some(o=>o.replaces===old.id)))fail("Vurderingen er allerede endret.");
  if(action==="revokeAssessment"){if(!old)fail("Velg vurdering.");message+=": "+str(v.reason);s.observations.push({...old,id:key,at:a.now,by:a.id,replaces:old.id,revoked:true});pub=!old.draft;}
  else{const p=profile(v.profile,a),skill=str(v.skill,60),ax=skills(p,a),axis=ax.find(([k])=>k===skill),level=num(v.level);
   if(!level||!axis&&!ax.some(([,ss])=>ss.includes(skill))||old&&(p!==old.profile||skill!==old.skill))fail("Ugyldig vurdering.");
   const subs=Array.isArray(v.subs)?[...new Set(v.subs.map(x=>str(x,60)))]:[];if(axis&&(!subs.length||subs.some(k=>!axis[1].includes(k)))||!axis&&subs.length)fail("Velg observerte delferdigheter fra riktig område.");
   const observed=when(v.observed);if(observed>a.now)fail("Observasjonen kan ikke være i fremtiden.");
   const rubric=s.rubrics.find(r=>r.profile===p&&r.skill===skill&&r.version===v.rubric);if(!rubric)fail("Rubrikken er ikke godkjent for denne ferdigheten.");
   const o:Observation={id:key,profile:p,skill,level,rubric:str(v.rubric,60),criterion:rubric.criteria[level-1],observed,at:a.now,by:a.id,context:str(v.context),feedback:str(v.feedback),subs,draft:v.draft===true,replaces:old?.id};
   if(old){if(o.draft&&!old.draft)fail("Bruk en publisert rettelse.");message+=": "+str(v.reason);}
   s.observations.push(o);message+=" · "+label(skill);pub=!o.draft;
  }
 }else if(action==="practice"){
  const ids=Array.isArray(v.goals)?[...new Set(v.goals.map(x=>str(x,100)))]:[],exercise=str(v.exercise,100);
  if(!ids.length||ids.length>10||!a.catalog.some(e=>e.id===exercise))fail("Velg en tilgjengelig øvelse.");
  for(const id of ids){const goal=s.goals.find(x=>x.id===id);if(!goal||!busyGoal(goal)||!goal.assignments.some(e=>e.exercise===exercise))fail("Øvelsen er ikke tildelt dette målet.");if(goal.stage===0)goal.stage=1;}
  s.practices.push({id:key,exercise,goals:ids,at:a.now,by:a.id,verified:a.coach,context:str(v.context,300,false),revoked:false});subject=ids[0];
 }else if(action==="editPractice"){
  const log=s.practices.find(x=>x.id===v.practice);if(!log||log.revoked||!a.coach&&(log.by!==a.id||log.verified))fail("Ingen tilgang til øvingen.");
  const at=when(v.at);if(at>a.now)fail("Øvingen kan ikke ligge i fremtiden.");log.at=at;log.context=str(v.context,300,false);subject=log.goals[0];
 }else if(action==="revokePractice"){
  const log=s.practices.find(x=>x.id===v.practice);if(!log||log.revoked||!a.coach&&log.by!==a.id)fail("Ingen tilgang til øvingen.");
  log.revoked=true;subject=log.goals[0];for(const goal of s.goals)if(goal.stage===1&&!countPractice(s,goal.id))goal.stage=0;
 }else if(action==="endorse"||action==="retract"){
  const k=v.badge,ref=str(v.ref,100),why=str(v.why,400);
  if(k!=="mission_complete"&&k!=="rising_star")fail("Ukjent milepæl.");
  const known=s.merits.find(m=>m.key===k&&m.ref===ref);
  if(action==="endorse"){
   if(k==="mission_complete"&&!s.practices.some(p=>p.id===ref&&p.verified&&!p.revoked)||k==="rising_star"&&!s.goals.some(g=>g.id===ref&&g.status==="completed")&&!s.observations.some(o=>o.id===ref&&!o.revoked&&!o.draft&&!s.observations.some(r=>r.replaces===o.id&&!r.draft)))fail("Velg verifisert grunnlag.");
   if(known&&!known.revoked)fail("Milepælen er allerede registrert.");if(known)Object.assign(known,{revoked:false,by:a.id,why,at:a.now});else s.merits.push({key:k,ref,why,by:a.id,at:a.now,revoked:false});
  }else{if(!known||known.revoked)fail("Milepælen finnes ikke.");known.revoked=true;known.why=why;}
  subject=ref;message+=": "+why;
 }else if(action==="note"){
  str(v.text,1000);pub=false;
 }else{
  if(!g||!a.coach&&!visibleGoal(g))fail("Målet er ikke tilgjengelig.");subject=g.id;
  switch(action){
   case "publish":if(!["draft","proposed"].includes(g.status))fail("Målet er allerede publisert.");if((g.base||g.target)&&!s.rubrics.some(r=>r.profile===g.profile&&r.skill===g.skill&&r.version===g.rubric))fail("Knytt en godkjent rubrikk til målet før publisering.");cap();g.agreedAt=a.now;g.status="active";break;
   case "edit":if(["completed","archived","cancelled"].includes(g.status))fail("Åpne målet først.");{const patch=fields();if(g.stage===2&&(patch.profile!==g.profile||patch.skill!==g.skill||patch.criteria!==g.criteria||patch.rubric!==g.rubric)){g.stage=countPractice(s,g.id)?1:0;g.evidence="";}Object.assign(g,patch);}break;
   case "assign":{if(!["draft","proposed","active","awaiting_review","paused"].includes(g.status))fail("Målet er lukket.");const exercise=str(v.exercise,100),session=str(v.session,100,false);if(v.suitable!==true)fail("Bekreft at øvelsen passer for spilleren.");if(!a.catalog.some(e=>e.id===exercise)||session&&!a.sessions.includes(session))fail("Øvelsen eller økten er ikke tilgjengelig.");g.assignments=g.assignments.filter(x=>x.exercise!==exercise);g.assignments.push({exercise,session,suitableBy:a.id,conditions:str(v.conditions,300,false),cue:str(v.cue,400,false)});break;}
   case "review":if(!busyGoal(g))fail("Målet er ikke aktivt.");g.status="awaiting_review";break;
   case "transfer":if(!busyGoal(g))fail("Målet er ikke aktivt.");g.evidence=str(v.evidence);g.stage=2;message+=": "+g.evidence;break;
   case "feedback":g.feedback=str(v.feedback);message+=": "+g.feedback;break;
   case "complete":if(!busyGoal(g)||g.skill&&g.stage!==2||v.criteriaMet!==true)fail("Bekreft kriteriene og observer ferdigheten i spill først.");g.evidence=str(v.evidence);g.feedback=str(v.feedback);g.stage=3;g.status="completed";message+=": "+g.evidence;break;
   case "reopen":if(g.status!=="completed")fail("Målet er ikke bekreftet.");cap();message+=": "+str(v.reason);g.stage=countPractice(s,g.id)?1:0;g.status="active";break;
   case "pause":if(!busyGoal(g))fail("Målet er ikke aktivt.");g.status="paused";break;
   case "resume":if(g.status!=="paused")fail("Målet er ikke på pause.");cap();g.status="active";break;
   case "archive":case "cancel":if(g.status==="completed"&&action==="cancel")fail("Åpne målet før korrigering.");g.status=action==="archive"?"archived":"cancelled";break;
   default:fail("Ugyldig handling.");
  }
  pub=visibleGoal(g);if(action==="edit")message+=" · "+g.title+" · "+g.criteria;
 }
 s.history.push({id:key,subject,action,at:a.now,by:a.id,message,public:pub});
 // Private free text is only retained in the separate note store.
 s.receipts[key]=signature;
 if(action==="complete"&&v.assessment){const o=v.assessment as Record<string,unknown>;if(!g?.skill||o.profile!==g.profile||o.skill!==g.skill||o.rubric!==g.rubric||o.draft||o.replaces)fail("Vurderingen må gjelde målets ferdighet og rubrikk.");return change(s,{action:"assess",key:key+"-assessment",v:o},a);}
 return s;
}
