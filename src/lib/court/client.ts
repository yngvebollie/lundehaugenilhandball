import {db,demo,type Snapshot} from "../beta";
import {referenceDrills,withClubFilm} from "./films";
import {strength} from "../strength";
import {baseDrills,validatePlan,type Drill,type Plan} from "./model";
export const courtEnabled=demo||process.env.NEXT_PUBLIC_COURT_SESSIONS==="true";
export type Doc={id:string;plan:Plan;sharedPlan?:Plan;rev:number;published:boolean;archived:boolean;edited:string;audience?:string[]|null;notes?:Record<string,string>;seen?:string};
export type Packet={sessions:Doc[];favorites:string[];catalog:Drill[]};
type Stored=Doc&{shared?:Plan;last?:string};
const key=(t:string)=>"nhf-court-demo-v1:"+t;
const read=<T>(k:string,d:T):T=>JSON.parse(localStorage.getItem(k)||"null")??d;
const put=(k:string,v:unknown)=>localStorage.setItem(k,JSON.stringify(v));
function existing(id:string,name:string,dose:string):Drill{return {id,title:name,instructions:dose,theme:"Fysisk",technique:"",age:"Ikke angitt",equipment:[],space:"",minPlayers:null,maxPlayers:null,minKeepers:null,challenge:"",training:null,source:"Klubb",vimeo:"",original:"",tip:"",block:""};}
export async function court(data:Snapshot,action="read",sid:string|null=null,expected=0,v:Record<string,unknown>={},requestId:string=crypto.randomUUID()):Promise<Packet>{
 const t=data.me.squad,coach=data.me.role==="coach";let result:{sessions:Doc[];favorites:string[];catalog:Drill[];teamExercises:{id:string;name:string;dose:string}[]};
 if(action==="save")validatePlan(v.plan as Plan);
 if(!demo){
  if(!courtEnabled)throw Error("Økter er ikke aktivert.");
  result=(await db!.rpc("beta_court",{t,action,sid,expected,v,request_id:requestId}).throwOnError()).data;
 }else{
  const k=key(t),user=data.me.id,sessions=read<Stored[]>(k,[]),custom=read<Drill[]>(k+":bank",[]),fav=read<string[]>(k+":fav:"+user,[]),seen=read<Record<string,string>>(k+":seen:"+user,{});
  let doc=sessions.find(p=>p.id===sid);const visible=(x:Stored)=>!!x.shared&&!x.archived&&(x.audience==null||x.audience.includes(user));
  if(sid&&(!doc&&action!=="save"||doc&&!coach&&!visible(doc)))throw Error("Økten er ikke tilgjengelig.");
  if(["save","publish","unpublish","archive"].includes(action)){
   if(!coach||!sid)throw Error("Trenertilgang kreves.");
   if(doc?.last!==requestId){
    if((doc?.rev||0)!==expected)throw Error("Versjonskonflikt. Last inn gjeldende økt.");
    if(action==="save"){const plan=v.plan as Plan;validatePlan(plan);if(!doc){doc={id:sid,plan,rev:0,published:false,archived:false,edited:""};sessions.push(doc);}doc.plan=structuredClone(plan);doc.notes=(v.notes||{}) as Record<string,string>;}
    else if(!doc)throw Error("Lagre økten først.");
    else if(action==="publish"){validatePlan(doc.plan,true);if(doc.plan.origin==="template")throw Error("Kopier malen først.");const ids=v.players as string[];
     if(v.scope==="players"&&(!ids?.length||ids.some(id=>!data.roster.some(a=>a.id===id&&a.squad===t&&a.role==="athlete"))))throw Error("Velg mottakere på laget.");
     doc.shared=structuredClone(doc.plan);doc.published=true;doc.archived=false;doc.audience=v.scope==="team"?null:ids;
    }else{doc.shared=undefined;doc.published=false;doc.archived=action==="archive";}
    doc.rev++;doc.last=requestId;doc.edited=new Date().toISOString();put(k,sessions);
   }
  }else if(action==="favorite"){const id=String(v.exercise),next=fav.filter(x=>x!==id);if(v.on)next.push(id);fav.splice(0,fav.length,...next);put(k+":fav:"+user,fav);}
  else if(action==="seen"&&sid&&doc?.shared?.items.some(x=>x.id===v.item)){seen[sid]=String(v.item);put(k+":seen:"+user,seen);}
  else if(action==="exercise"&&coach){const x=v as unknown as Drill;custom.splice(0,custom.length,...custom.filter(e=>e.id!==x.id),{...x,source:"Klubb",original:""});put(k+":bank",custom);}
  else if(action==="overlay"&&coach){const x=custom.find(x=>x.id===v.id);if(x)x.tip=String(v.tip);put(k+":bank",custom);}
  else if(action!=="read")throw Error("Ingen tilgang.");
  result={sessions:sessions.filter(x=>(!sid||x.id===sid)&&(coach||visible(x))).map(x=>({id:x.id,plan:coach?x.plan:x.shared!,rev:x.rev,published:x.published,archived:x.archived,edited:x.edited,seen:seen[x.id],...(coach?{notes:x.notes,audience:x.audience,sharedPlan:x.shared}:{})})),favorites:fav,catalog:custom,teamExercises:data.library.map(e=>({id:e.id,name:e.name,dose:e.dose}))};
 }
 const catalog=[...baseDrills.map(withClubFilm),...referenceDrills,...result.catalog,...result.teamExercises.map(x=>existing(x.id,x.name,x.dose)),...strength.map(x=>existing(x.id,x.name,x.dose))];
 return {sessions:result.sessions||[],favorites:(result.favorites||[]).filter(k=>catalog.some(x=>x.id===k)),catalog};
}
export type Run={snap:Plan;index:number;steps:{status:string;elapsed:number}[];since:number|null;finished:boolean;owner:string;rev:number;now:number;reflection:string|null};
export async function runCourt(data:Snapshot,sid:string,cmd="read",rev=0,v:Record<string,unknown>={},id=crypto.randomUUID()):Promise<Run|null>{
 const team=data.me.squad;if(!demo)return (await db!.rpc("beta_court_run",{t:team,sid,cmd,expected:rev,request_id:id,v}).throwOnError()).data;
 if(data.me.role!=="coach")throw Error("Trenertilgang kreves.");const k=key(team)+":run:"+sid,now=Date.now();let r=read<Run|null>(k,null);
 if(cmd==="read")return r&&{...r,now};
 if((r?.rev||0)!==rev||r&&r.owner!==data.me.id)throw Error("Kontroller ansvarlig trener og versjon.");
 if(cmd==="start"){const s=read<Stored[]>(key(team),[]).find(p=>p.id===sid);if(!s?.shared||r||s.archived)throw Error("Økten kan ikke startes.");r={snap:structuredClone(s.shared),index:0,steps:s.shared.items.map((_,i)=>({status:i?"ready":"running",elapsed:0})),since:now,finished:false,owner:data.me.id,now,rev:1,reflection:null};}
 else if(r&&(!r.finished||cmd==="reflect")){const step=r.steps[r.index],running=r.since!=null;if(running){step.elapsed+=Math.max(0,now-r.since!);step.status="paused";}r.since=null;
 if(cmd==="pause"&&running){}else if(cmd==="play"&&!running&&!["done","skipped"].includes(step.status)){step.status="running";r.since=now;}
 else if(cmd==="reset"){step.elapsed=0;step.status="paused";}else if(["next","skip","back"].includes(cmd)){if(cmd!=="back"&&!["done","skipped"].includes(step.status))step.status=cmd==="skip"?"skipped":"done";r.index=Math.min(r.steps.length-1,Math.max(0,r.index+(cmd==="back"?-1:1)));}
 else if(cmd==="finish"){if(r.steps.some(s=>!["done","skipped"].includes(s.status))&&!v.confirmed)throw Error("Bekreft tidlig avslutning.");r.finished=true;r.steps.forEach(s=>{if(!["done","skipped"].includes(s.status))s.status="skipped";});}else if(cmd==="reflect"&&r.finished)r.reflection=String(v.text);else throw Error("Ugyldig timerhandling.");r.rev++;r.now=now;
 }else throw Error("Ingen aktiv økt.");put(k,r);return r;
}
