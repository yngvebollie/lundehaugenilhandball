import {candidates} from "./merits";
import {empty,published,keeper,type Plan} from "./model";
import {change,type Command} from "./commands";
import {catalog,type SessionRef} from "./catalog";
import type {Packet} from "./types";
const uuid=/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{"Cache-Control":"private, no-store"}});
type RecordRow={rev:number;plan:Plan|null;limit:number;keeper:boolean;keeperAxes:string[]|null;coach:boolean;notes:Packet["notes"];sessions:SessionRef[];library:{id:string;title:string;instructions:string}[]};
export async function serveDevelopment(req:Request,config:{url:string;anonKey:string;serviceKey:string},fetcher:typeof fetch=fetch){
 if(req.method!=="POST")return reply({error:"Bruk POST."},405);
 const token=req.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];
 if(!token)return reply({error:"Logg inn for å se utviklingsplanen."},401);
 if(!config.url||!config.anonKey||!config.serviceKey)return reply({error:"Tjenesten er ikke konfigurert."},503);
 let actor:string;
 try{
  const auth=await fetcher(config.url+"/auth/v1/user",{headers:{apikey:config.anonKey,Authorization:"Bearer "+token},redirect:"error",cache:"no-store"});
  if(!auth.ok)return reply({error:"Logg inn på nytt."},auth.status>=500?503:401);
  const u=await auth.json();if(typeof u.id!=="string"||!uuid.test(u.id))return reply({error:"Logg inn på nytt."},401);actor=u.id;
 }catch{return reply({error:"Kunne ikke kontrollere innloggingen."},503);}
 let b;try{const text=await req.text();if(text.length>14000)throw Error();b=JSON.parse(text);}catch{return reply({error:"Ugyldig forespørsel."},400);}
 if(!b||typeof b.team!=="string"||typeof b.person!=="string"||!uuid.test(b.team)||!uuid.test(b.person))return reply({error:"Ugyldig lag eller spiller."},400);
 const rpc=async(args:Record<string,unknown>)=>{
  const res=await fetcher(config.url+"/rest/v1/rpc/beta_development_gateway",{method:"POST",redirect:"error",cache:"no-store",
   headers:{apikey:config.serviceKey,Authorization:"Bearer "+config.serviceKey,"Content-Type":"application/json"},body:JSON.stringify({t:b.team,p:b.person,actor,...args})});
  const result=await res.json();if(!res.ok)throw Error(result.message||"Planen kunne ikke hentes.");return result as RecordRow;
 };
 try{
  let row=await rpc({mode:"read"}),plan=row.plan||empty();
  if(b.cmd){
   const cmd=b.cmd as Command;if(!cmd.v||typeof cmd.v!=="object"||Array.isArray(cmd.v)||typeof cmd.key!=="string"||!uuid.test(cmd.key))return reply({error:"Ugyldig registrering."},400);
   if(!plan.receipts[cmd.key]&&row.rev!==b.rev)return reply({error:"Planen er endret av en annen. Hent siste versjon. Utkastet ditt er beholdt."},409);
   const next=change(plan,cmd,{id:actor,coach:row.coach,now:new Date().toISOString(),limit:row.limit,keeper:row.keeper,keeperAxes:row.keeperAxes||Object.keys(keeper),catalog:catalog(row.library),sessions:row.sessions.map(s=>s.id)});
   if(!plan.receipts[cmd.key]){
    const entry=next.history.find(e=>e.id===cmd.key)!;const oldGoal=plan.goals.find(g=>g.id===entry.subject);
    row=await rpc({mode:"write",expected:row.rev,next_doc:next,entry:{...entry,previous:oldGoal||null,outbox:candidates(next)},note:cmd.action==="note"?cmd.v.text:null,
     exercise_id:typeof cmd.v.exercise==="string"&&uuid.test(cmd.v.exercise)?cmd.v.exercise:null,session_id:cmd.v.session||null});plan=row.plan||empty();
   }
  }
  const view=published(plan,row.coach),used=new Set(view.goals.flatMap(g=>g.assignments.map(a=>a.exercise)));
  const packet:Packet={rev:row.rev,plan:view,coach:row.coach,limit:row.limit,keeper:row.keeper,keeperAxes:row.keeperAxes||Object.keys(keeper),catalog:catalog(row.library).filter(e=>row.coach||used.has(e.id)),sessions:row.coach?row.sessions:[],notes:row.coach?row.notes:[]};
  return reply(packet);
 }catch(e){const msg=e&&typeof e==="object"&&"message" in e?String(e.message):"Kunne ikke lagre.";return reply({error:msg},msg.includes("ersjonskonflikt")?409:["Ingen tilgang","Utøver ikke tilgjengelig","Trenertilgang kreves"].includes(msg.replace(/\.$/,""))?403:400);}
}
