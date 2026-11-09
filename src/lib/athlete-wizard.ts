import {db,demo,saveProfile,today,type Snapshot} from "./beta";
import {plusDay,type Rule} from "./regular";
export const skills={passing:"Kast og mottak",teamwork:"Lag og samspill",shooting:"Skudd",attack:"Angrep",defence:"Forsvar",keeper:"Keeper",counter:"Kontringer",duel:"Duellspill",feint:"Finter",decisions:"Gode valg / spilleforståelse"};
export const physical={strength:"Bli sterkere",speed:"Løpe raskere",footwork:"Raskere bein",jump:"Bedre spenst",shotpower:"Hardere skudd"};
export const positions={lb:"Venstre back",cb:"Midtback",rb:"Høyre back",pivot:"Linjespiller",lw:"Venstre kant",gk:"Keeper",rw:"Høyre kant"};
export type Wishes={completed:boolean;name:string;given:string;family:string;shirt:string;email:string;days:number[];minutes:number;skills:string[];physical:string[];positions:string[]};
export type BoardPlayer={id:string;name:string;shirt:string|null;positions:string[]};
const key=(t:string,id:string)=>"player-wizard:"+t+":"+id;
export async function playerWizard(data:Snapshot,v?:Wishes):Promise<Wishes>{
 const m=data.me;if(!demo)return (await db!.rpc("beta_athlete_wizard",{t:m.squad,cmd:v?"save":"read",v:v||null}).throwOnError()).data;
 if(m.role!=="athlete")throw Error("Bare egen utøverprofil");
 const k=key(m.squad,m.id),plansKey="regular-plan-v1:"+m.squad;
 let rules:Rule[]=JSON.parse(localStorage.getItem(plansKey)||"[]");
 const d=today(),old=rules.filter(r=>r.profile_gym&&r.athlete===m.id&&(!r.ends||r.ends>=d)).sort((a,b)=>b.starts.localeCompare(a.starts))[0];
 if(!v)return {...{completed:false,name:m.name,given:m.given_name||"",family:m.family_name||"",shirt:m.shirt_number||"",email:m.email||"",skills:[],physical:[],positions:[]},...JSON.parse(localStorage.getItem(k)||"{}"),days:old?.days||[],minutes:old?.minutes||45};
 if(!(old&&!old.ends&&old.minutes===v.minutes&&String(old.days)===String(v.days))){
  const starts=rules.some(r=>r.profile_gym&&r.athlete===m.id&&r.checks?.[d])?plusDay(d,1):d;
  if(old){if(old.starts>=starts)rules=rules.filter(r=>r!==old);else old.ends=plusDay(starts,-1);}
  if(v.days.length){
   if(rules.some(r=>r.kind==="gym"&&r.athlete===m.id&&(!r.ends||r.ends>=starts)&&r.days.some(x=>v.days.includes(x))))throw Error("Du har allerede skolegym på en valgt dag i Plan.");
   rules.push({id:crypto.randomUUID(),team:m.squad,athlete:m.id,kind:"gym",profile_gym:true,title:"Skolegym",days:v.days,clock:"00:00",starts,ends:null,minutes:v.minutes,weight:3});
  }
 }
 const saved={...v,completed:true,name:v.given+" "+v.family};
 await saveProfile(m,{name:saved.name,given_name:v.given,family_name:v.family,shirt_number:v.shirt||null,bio:m.bio,photo:m.photo,position:m.position});
 localStorage.setItem(k,JSON.stringify(saved));localStorage.setItem(plansKey,JSON.stringify(rules));return saved;
}
export async function positionBoard(data:Snapshot):Promise<BoardPlayer[]>{
 if(data.me.role!=="coach")throw Error("Trenertilgang kreves");
 if(!demo)return (await db!.rpc("beta_athlete_wizard",{t:data.me.squad,cmd:"board"}).throwOnError()).data;
 return data.roster.filter(m=>m.role==="athlete"&&m.squad===data.me.squad).map(m=>({id:m.id,name:m.name,shirt:m.shirt_number||null,positions:JSON.parse(localStorage.getItem(key(m.squad,m.id))||"{}").positions||[]}));
}
