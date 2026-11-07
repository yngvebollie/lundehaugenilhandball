import {db,demo,today,type Snapshot} from "./beta";
export type Challenge={id:string;team:string;title:string;unit:string;starts:string;ends:string;anonymous:boolean;exercises?:string[];instructions?:string;badge_key?:string|null};
export type Score={place:number;total:number;label:string;mine:boolean};
export type Award={id:string;title:string;ends:string;unit:string;total:number;winner:boolean};
export type SetLog={entry:string;amount:number;exercise:string|null;logged_at:string};
type Entry={exercise?:string|null;logged_at?:string;athlete:string;alias:string;entry:string;amount:number};
const prefix="nhf-challenge-v1:";
const read=<T,>(key:string):T[]=>JSON.parse(localStorage.getItem(prefix+key)||"[]");
const write=(key:string,rows:unknown[])=>localStorage.setItem(prefix+key,JSON.stringify(rows));
export const phase=(c:Challenge)=>today()<c.starts?"Planlagt":today()>c.ends?"Avsluttet":"Aktiv";
async function rpc<T>(action:string,data:Snapshot,c:string|null=null,v:Record<string,unknown>={}):Promise<T>{
  return (await db!.rpc("beta_challenge",{action,t:data.me.squad,c,v}).throwOnError()).data as T;
}
export async function challenges(data:Snapshot):Promise<Challenge[]>{
  return demo?read<Challenge>("list:"+data.me.squad):rpc("list",data);
}
export async function createChallenge(data:Snapshot,v:Omit<Challenge,"team"|"id">):Promise<string>{
  if(data.me.role!=="coach"||!v.title.trim()||!v.unit.trim()||v.starts<today()||v.ends<v.starts||Date.parse(v.ends)-Date.parse(v.starts)>365*86400000)throw Error("Kontroller navn og datoperiode.");
  if(!demo)return rpc("create",data,null,v);
  const c={...v,id:crypto.randomUUID(),team:data.me.squad};write("list:"+c.team,[c,...await challenges(data)]);return c.id;
}
export async function logSet(data:Snapshot,c:Challenge,amount:number,entry:string,exercise?:string){
  if(data.me.role!=="athlete"||c.team!==data.me.squad||!Number.isInteger(amount)||amount<1||amount>100000)throw Error("Angi et positivt heltall (maks 100 000).");
  const choice=exercise||(c.exercises?.length===1?c.exercises[0]:undefined);
  if(c.exercises?.length?!choice||!c.exercises.includes(choice):!!choice)throw Error("Velg en øvelse fra utfordringen.");
  if(!demo){await rpc("log",data,c.id,{amount,entry,exercise:choice||null});return;}
  const rows=read<Entry>(c.id),old=rows.find(x=>x.entry===entry&&x.athlete===data.me.id);
  if(old){if(old.amount!==amount||(old.exercise||null)!==(choice||null))throw Error("Registreringen er allerede brukt.");return;}
  if(phase(c)!=="Aktiv")throw Error("Utfordringen er ikke åpen.");
  write(c.id,[...rows,{athlete:data.me.id,amount,entry,exercise:choice,logged_at:new Date().toISOString(),alias:rows.find(x=>x.athlete===data.me.id)?.alias||"Spiller "+crypto.randomUUID().slice(0,8).toUpperCase()}]);
}
export async function mySets(data:Snapshot,c:Challenge):Promise<SetLog[]>{
  if(data.me.role!=="athlete")return [];
  if(!demo)return rpc("mine",data,c.id);
  return read<Entry>(c.id).filter(e=>e.athlete===data.me.id).reverse().slice(0,50).map(e=>({entry:e.entry,exercise:e.exercise||null,amount:e.amount,logged_at:e.logged_at||""}));
}
export async function scoreboard(data:Snapshot,c:Challenge):Promise<Score[]>{
  if(!demo)return rpc("board",data,c.id);
  const entries=read<Entry>(c.id),scores=new Map<string,{total:number;alias:string}>();
  for(const e of entries)scores.set(e.athlete,{total:(scores.get(e.athlete)?.total||0)+e.amount,alias:e.alias});
  const sorted=[...scores].sort(([,a],[,b])=>b.total-a.total||a.alias.localeCompare(b.alias));
  return sorted.map(([id,s])=>({total:s.total,place:1+sorted.filter(([,p])=>p.total>s.total).length,mine:id===data.me.id,label:id===data.me.id?"Du":c.anonymous?s.alias:data.roster.find(m=>m.id===id)?.name||"Tidligere spiller"}));
}
export async function achievements(data:Snapshot):Promise<Award[]>{
  if(!demo)return rpc("awards",data);
  const a:Award[]=[];
  for(const c of await challenges(data))if(phase(c)==="Avsluttet"){const mine=(await scoreboard(data,c)).find(s=>s.mine);if(mine)a.push({id:c.id,title:c.title,ends:c.ends,unit:c.unit,total:mine.total,winner:mine.place===1});}
  return a;
}
