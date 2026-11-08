import example from "./example.json";
import {empty,type Goal,type Plan,type Observation} from "./model";
// Browser-local fixtures only; neither the API nor the SQL migration imports this file.
export function examplePlan():Plan{
 const s=empty(),e=example.goal;
 const g:Goal={id:e.id,rubric:"demo-v1",title:e.title,intention:e.intention,criteria:e.criteria.map(c=>c.text).join(" "),profile:"field",skill:e.skill_key,base:2,target:3,practiceTarget:4,review:e.review_at,stage:1,status:"active",agreedAt:"2026-11-02T12:00:00Z",feedback:e.visible_feedback,evidence:"",assignments:[{exercise:"club:passing",cue:"Møt ballen og fortsett bevegelsen."},{exercise:"club:turn",cue:"Hold blikket oppe gjennom vendingen."}]};
 s.goals=[g,{...g,id:"demo-finte",title:"Finte og gjennombrudd",skill:"gjennombrudd",criteria:"Vis retningsskifte i avtalt øvelse og prøv det i småspill.",intention:"Jeg vil komme forbi en forsvarer.",assignments:[{exercise:"club:feint",cue:"Flytt vekten før retningsskiftet."}],feedback:""}];
 s.practices=example.practice_logs.map(p=>({id:p.id,exercise:"club:passing",goals:[g.id],at:p.occurred_at,by:"liv",revoked:false}));
 s.practices.push(...s.practices.slice(0,2).map(p=>({...p,id:"finte-"+p.id,goals:["demo-finte"],exercise:"club:feint"})));
 s.observations=example.category_assessments.flatMap((o,i)=>{const current:Observation={id:o.id,profile:"field",skill:o.skill_key,level:o.level,observed:o.observed_at,at:o.observed_at,by:"coach",context:"Avtalt treningsøvelse",rubric:o.rubric_version,criterion:"Kontroll og utførelse i avtalt øvelse.",feedback:o.feedback,subs:[["presisjon","mottak_i_fart","skuddteknikk","rytmeskifte","balanse","sideveisarbeid"][i]]};
 return [{...current,id:"prior-"+o.id,level:Math.max(1,o.level-1),observed:"2026-10-01T10:00:00Z",at:"2026-10-01T10:00:00Z"},current];});
 s.rubrics=[...new Set([...s.observations.map(o=>o.skill),"mottak_i_fart","gjennombrudd"])].map(skill=>({profile:"field",skill,version:"demo-v1",scope:"Illustrasjon, avtalt parøvelse for Demo J2013",criteria:["Prøver med veiledning.","Utfører i en kjent parøvelse.","Gjentar kontrollert i bevegelse.","Prøver mot motstand i småspill.","Velger og tilpasser løsningen i spill."],by:"coach",at:"2026-10-01T10:00:00Z"}));
 s.history=[{id:g.id,action:"publish",at:g.agreedAt!,by:"coach",subject:g.id,message:"Mål avtalt: Mottak i fart",public:true}];return s;
}
