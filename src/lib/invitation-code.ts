import {admissions,db,demo,registerDemoAthlete,demoAccounts,type Member,type LinkInfo} from "./beta";
type Code={code:string;expires:string};
const prefix="nhf-beta-v1:";
export async function invitationCode(team:string,kind:Member["role"],action:"get"|"issue"|"revoke"):Promise<Code|null>{
  if(!demo)return (await db!.rpc("beta_invitation_code",{action,t:team,kind}).throwOnError()).data;
  const key=prefix+(kind==="coach"?"coach-code:":"code:")+team;
  if(action==="revoke")localStorage.removeItem(key);
  if(action==="issue"){
    if(kind==="athlete")await admissions("rotate",{target:team});
    else localStorage.setItem(key,JSON.stringify({team,code:crypto.randomUUID().slice(0,6).toUpperCase(),expires:Date.now()+86400000}));
  }
  const row=JSON.parse(localStorage.getItem(key)||"null");return row&&row.expires>Date.now()?{code:row.code,expires:new Date(row.expires).toISOString()}:null;
}
export async function redeemCoachCode(input:string,name:string,phone:string,email:string):Promise<LinkInfo>{
  if(!demo){const {data}=await db!.rpc("beta_invitation_code",{action:"redeem",t:null,kind:"coach",input,label:name,phone}).throwOnError();if(data.error)throw Error(data.error);return data;}
  const key=Object.keys(localStorage).find(k=>k.startsWith(prefix+"coach-code:")&&JSON.parse(localStorage.getItem(k)!).code===input);
  const row=key&&JSON.parse(localStorage.getItem(key)!);if(!key||!row||row.expires<=Date.now())throw Error("Koden er ugyldig, brukt eller utløpt.");
  let me=demoAccounts().find(p=>p.email===email);if(!me){registerDemoAthlete(email,name);me=demoAccounts().find(p=>p.email===email)!;}
  if(me.squad&&me.role!=="coach")throw Error("Kontoen er registrert som utøver.");
  localStorage.setItem(prefix+"member:"+me.id,JSON.stringify({...me,name,email,role:"coach",squad:me.squad||row.team}));
  localStorage.setItem(prefix+"membership:"+me.id+row.team,JSON.stringify({id:me.id,team:row.team}));
  localStorage.setItem(prefix+"application:"+row.team+":"+me.id,JSON.stringify({team:row.team,person:me.id,role:"coach",status:"Approved",name,phone,email}));
  localStorage.removeItem(key);sessionStorage.setItem("nhf-persona",me.id);return {id:row.team,name:JSON.parse(localStorage.getItem(prefix+"team:"+row.team)||"null")?.name||"Demolaget",direct:true,role:"coach"};
}
